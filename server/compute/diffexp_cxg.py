import concurrent.futures
import time
import numpy as np
from numba import jit, njit, prange
from scipy import sparse

from server.common.compute.diffexp_generic import diffexp_ttest_from_mean_var
from server.common.constants import XApproximateDistribution
from server.common.errors import ComputeError
from server.dataset.cxg_util import pack_selector_from_indices


diffexp_thread_executor = None
max_workers = None
target_workunit = None


def set_config(config_max_workers, config_target_workunit):
    global max_workers
    global target_workunit
    max_workers = config_max_workers
    target_workunit = config_target_workunit


def get_thread_executor():
    global diffexp_thread_executor
    if diffexp_thread_executor is None:
        diffexp_thread_executor = concurrent.futures.ThreadPoolExecutor(max_workers=max_workers)
    return diffexp_thread_executor


def diffexp_new_v2(adaptor, maskA, maskB, top_n=8, diffexp_lfc_cutoff=0.01, arr="X"):
    matrix = adaptor.open_array(arr)
    # mean_var_fn = mean_var_cnt_sparse if matrix.schema.sparse else mean_var_cnt_dense
    row_selector_A, row_selector_B = maskA.nonzero()[0], maskB.nonzero()[0]

    nA = len(row_selector_A)
    nB = len(row_selector_B)

    dtype = matrix.dtype
    num_cols = matrix.shape[1]
    tile_extent = [dim.tile for dim in matrix.schema.domain]

    cells_per_coltile = (nA + nB) * tile_extent[1]
    cols_per_partition = max(1, int(target_workunit / cells_per_coltile)) * tile_extent[1] * 16
    col_partitions = [(c, min(c + cols_per_partition, num_cols)) for c in range(0, num_cols, cols_per_partition)]
    print(f"Using {len(col_partitions)} partitions")

    meanA = np.zeros((num_cols,), dtype=np.float64)
    varA = np.zeros((num_cols,), dtype=np.float64)
    meanB = np.zeros((num_cols,), dtype=np.float64)
    varB = np.zeros((num_cols,), dtype=np.float64)

    executor = get_thread_executor()
    futures = []

    if matrix.schema.sparse:
        row_selector_A.sort()
        row_selector_B.sort()
        # rowsA = list(row_selector_A)
        # rowsB = list(row_selector_B)
        rowsA = pack_selector_from_indices(row_selector_A)
        rowsB = pack_selector_from_indices(row_selector_B)
        for cols in col_partitions:
            futures.append((0, cols, executor.submit(mean_var_cnt_sparse2, matrix, rowsA, nA, cols)))
            futures.append((1, cols, executor.submit(mean_var_cnt_sparse2, matrix, rowsB, nB, cols)))
    else:
        raise ValueError("Bad")

    for i, cols, future in futures:
        # returns tuple: (meanA, varA, meanB, varB, cols)
        try:
            mean, var = future.result()
            if i == 0:
                meanA[cols[0]: cols[1]] += mean
                varA[cols[0]: cols[1]] += var
            else:
                meanB[cols[0]: cols[1]] += mean
                varB[cols[0]: cols[1]] += var
        except Exception as e:
            for _, _, future in futures:
                future.cancel()
            raise ComputeError(str(e))

    return diffexp_ttest_from_mean_var(
        meanA=meanA.astype(dtype),
        varA=varA.astype(dtype),
        nA=nA,
        meanB=meanB.astype(dtype),
        varB=varB.astype(dtype),
        nB=nB,
        top_n=top_n,
        diffexp_lfc_cutoff=diffexp_lfc_cutoff,
    )


def diffexp_new(adaptor, maskA, maskB, top_n=8, diffexp_lfc_cutoff=0.01, arr="X"):
    matrix = adaptor.open_array(arr)
    mean_var_fn = mean_var_cnt_sparse if matrix.schema.sparse else mean_var_cnt_dense
    _, n_var = matrix.shape
    pop_A, pop_B = maskA.nonzero()[0], maskB.nonzero()[0]
    # pop_A.sort()
    # pop_B.sort()
    # rowsA = list(row_selector_A)
    # rowsB = list(row_selector_B)
    pop_A = list(pop_A)  # pack_selector_from_indices(pop_A)
    pop_B = list(pop_B)  # pack_selector_from_indices(pop_B)

    with concurrent.futures.ThreadPoolExecutor() as tp:
        A = tp.submit(mean_var_fn, matrix, n_var, pop_A)
        B = tp.submit(mean_var_fn, matrix, n_var, pop_B)
        mean_A, var_A, cnt_A = A.result()
        mean_B, var_B, cnt_B = B.result()
    # mean_A, var_A, cnt_A = mean_var_fn(matrix, n_var, pop_A)
    # mean_B, var_B, cnt_B = mean_var_fn(matrix, n_var, pop_B)

    return diffexp_ttest_from_mean_var(
        mean_A, var_A, cnt_A, mean_B, var_B, cnt_B, top_n, diffexp_lfc_cutoff
    )


def diffexp_ttest(adaptor, maskA, maskB, top_n=8, diffexp_lfc_cutoff=0.01, arr="X"):
    """
    Return differential expression statistics for top N variables.

    Algorithm:
    - compute fold change
    - compute Welch's t-test statistic and pvalue (w/ Bonferroni correction)
    - return top N abs(logfoldchange) where lfc > diffexp_lfc_cutoff

    If there are not N which meet criteria, augment by removing the logfoldchange
    threshold requirement.

    Notes on alogrithm:
    - Welch's ttest provides basic statistics test.
      https://en.wikipedia.org/wiki/Welch%27s_t-test
    - p-values adjusted with Bonferroni correction.
      https://en.wikipedia.org/wiki/Bonferroni_correction

    :param adaptor: DataAdaptor instance
    :param maskA: observation selection mask for set 1
    :param maskB: observation selection mask for set 2
    :param top_n: number of variables to return stats for
    :param diffexp_lfc_cutoff: minimum
    absolute value returning [ varindex, logfoldchange, pval, pval_adj ] for top N genes
    :return:  for top N genes, {"positive": for top N genes, [ varindex, foldchange, pval, pval_adj ],
              "negative": for top N genes, [ varindex, foldchange, pval, pval_adj ]}
    """
    matrix = adaptor.open_array(arr)
    row_selector_A = np.where(maskA)[0]
    row_selector_B = np.where(maskB)[0]
    nA = len(row_selector_A)
    nB = len(row_selector_B)

    dtype = matrix.dtype
    cols = matrix.shape[1]
    tile_extent = [dim.tile for dim in matrix.schema.domain]

    is_sparse = matrix.schema.sparse

    if is_sparse:
        row_selector_A = pack_selector_from_indices(row_selector_A)
        row_selector_B = pack_selector_from_indices(row_selector_B)
    else:
        # The rows from both row_selector_A and row_selector_B are gathered at the
        # same time, then the mean and variance are computed by subsetting on that
        # combined submatrix.  Combining the gather reduces number of requests/bandwidth
        # to the data source.
        row_selector_AB = np.union1d(row_selector_A, row_selector_B)
        row_selector_A_in_AB = np.in1d(row_selector_AB, row_selector_A, assume_unique=True)
        row_selector_B_in_AB = np.in1d(row_selector_AB, row_selector_B, assume_unique=True)
        row_selector_AB = pack_selector_from_indices(row_selector_AB)

    # because all IO is done per-tile, and we are always col-major,
    # use the tile column size as the unit of partition.  Possibly access
    # more than one column tile at a time based on the target_workunit.
    # Revisit partitioning if we change the X layout, or start using a non-local execution environment
    # which may have other constraints.

    # TODO: If the number of row selections is large enough, then the cells_per_coltile will exceed
    # the target_workunit.  A potential improvement would be to partition by both columns and rows.
    # However partitioning the rows is slightly more complex due to the arbitrary distribution
    # of row selections that are passed into this algorithm.

    cells_per_coltile = (nA + nB) * tile_extent[1]
    cols_per_partition = max(1, int(target_workunit / cells_per_coltile)) * tile_extent[1]
    col_partitions = [(c, min(c + cols_per_partition, cols)) for c in range(0, cols, cols_per_partition)]
    print(f"Using {len(col_partitions)} partitions")

    meanA = np.zeros((cols,), dtype=np.float64)
    varA = np.zeros((cols,), dtype=np.float64)
    meanB = np.zeros((cols,), dtype=np.float64)
    varB = np.zeros((cols,), dtype=np.float64)

    executor = get_thread_executor()
    futures = []

    if is_sparse:
        for cols in col_partitions:
            futures.append(executor.submit(_mean_var_sparse_ab, matrix, row_selector_A, nA, row_selector_B, nB, cols))
    else:
        for cols in col_partitions:
            futures.append(
                executor.submit(_mean_var_ab, matrix, row_selector_AB, row_selector_A_in_AB, row_selector_B_in_AB, cols)
            )

    for future in futures:
        # returns tuple: (meanA, varA, meanB, varB, cols)
        try:
            result = future.result()
            part_meanA, part_varA, part_meanB, part_varB, cols = result
            meanA[cols[0] : cols[1]] += part_meanA
            varA[cols[0] : cols[1]] += part_varA
            meanB[cols[0] : cols[1]] += part_meanB
            varB[cols[0] : cols[1]] += part_varB
        except Exception as e:
            for future in futures:
                future.cancel()
            raise ComputeError(str(e))

    r = diffexp_ttest_from_mean_var(
        meanA=meanA.astype(dtype),
        varA=varA.astype(dtype),
        nA=nA,
        meanB=meanB.astype(dtype),
        varB=varB.astype(dtype),
        nB=nB,
        top_n=top_n,
        diffexp_lfc_cutoff=diffexp_lfc_cutoff,
    )

    return r


def _mean_var_ab(matrix, row_selector_AB, row_selector_A_in_AB, row_selector_B_in_AB, col_range):
    X = matrix.multi_index[row_selector_AB, col_range[0] : col_range[1] - 1][""]
    meanA, varA, n = mean_var_n(X[row_selector_A_in_AB])
    meanB, varB, n = mean_var_n(X[row_selector_B_in_AB])
    return (meanA, varA, meanB, varB, col_range)


def _mean_var_sparse_ab(matrix, row_selector_A, nrows_A, row_selector_B, nrows_B, col_range):
    meanA, varA = _mean_var_sparse(matrix, row_selector_A, nrows_A, col_range)
    meanB, varB = _mean_var_sparse(matrix, row_selector_B, nrows_B, col_range)
    return (meanA, varA, meanB, varB, col_range)


def _mean_var_sparse_new_ab(matrix, rowsA: list, nrows_A, rowsB: list, nrows_B, col_range):
    meanA, varA = mean_var_cnt_sparse2(matrix, rowsA, nrows_A, col_range)
    meanB, varB = mean_var_cnt_sparse2(matrix, rowsB, nrows_B, col_range)
    return (meanA, varA, meanB, varB, col_range)


def mean_var_cnt_sparse2(matrix, selector, nrows, col_range):
    data = matrix.query(dims=["var"], attrs=[""], order="U").multi_index[selector, col_range[0]:col_range[1] - 1]
    x = data[""]
    var = data["var"]
    # shift the column indices to start at 0, this
    # will become the index into the mean and var arrays.
    var -= col_range[0]

    fp_err_occurred = False

    def fp_err_set(err, flag):
        nonlocal fp_err_occurred
        fp_err_occurred = True

    ncols = col_range[1] - col_range[0]
    with np.errstate(divide="call", invalid="call", call=fp_err_set):
        mean, v = _mean_var_sparse_numba(x, var, nrows, ncols)
        # mean, v = mean_var_coo(nrows, ncols, x, var)

    if fp_err_occurred:
        mean[np.isfinite(mean) == False] = 0  # noqa: E712
        v[np.isfinite(v) == False] = 0  # noqa: E712
    else:
        mean[np.isnan(mean)] = 0
        v[np.isnan(v)] = 0

    return mean, v


@jit(nopython=True)
def _mean_var_sparse_numba(x, var, nrows, ncols):
    """Kernel to compute the mean and variance.  It was not clear if this function
    could be written using numpy, thus avoiding the loops.  Therefore numba is
    used here to speed things up.  With numba, this function takes a negligible amount
    of time compared to reading in the sparse matrix"""
    mean = np.zeros((ncols,), dtype=np.float64)
    for col, val in zip(var, x):
        mean[col] += val
    mean /= nrows

    # optimize the sumsq computation.
    # since most entries in a sparse matrix are 0, then start by assuming
    # all values are 0, so fill the sumsq array with nrows * (0 - mean)**2.
    # as non-zero values are encountered, subtract off the (mean*mean) value
    # and replace with (val-mean)**2.  Simplifying the expression
    # gives the following code.
    sumsq = nrows * np.multiply(mean, mean)
    for col, val in zip(var, x):
        sumsq[col] += val * (val - 2 * mean[col])
    v = sumsq / (nrows - 1)
    return mean, v


def _mean_var_sparse(matrix, selector, nrows, col_range):
    data = matrix.multi_index[selector, col_range[0] : col_range[1] - 1]
    x = data[""]
    var = data["var"]

    # shift the column indices to start at 0, this
    # will become the index into the mean and var arrays.
    var -= col_range[0]

    fp_err_occurred = False

    def fp_err_set(err, flag):
        nonlocal fp_err_occurred
        fp_err_occurred = True

    ncols = col_range[1] - col_range[0]
    with np.errstate(divide="call", invalid="call", call=fp_err_set):
        mean, v = _mean_var_sparse_numba(x, var, nrows, ncols)

    if fp_err_occurred:
        mean[np.isfinite(mean) == False] = 0  # noqa: E712
        v[np.isfinite(v) == False] = 0  # noqa: E712
    else:
        mean[np.isnan(mean)] = 0
        v[np.isnan(v)] = 0

    return mean, v


def mean_var_n(X, X_approximate_distribution=XApproximateDistribution.NORMAL):
    """
    Two-pass variance calculation.  Numerically (more) stable
    than naive methods (and same method used by numpy.var())
    https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Two-pass
    """
    # fp_err_occurred is a flag indicating that a floating point error
    # occurred somewhere in our compute.  Used to trigger non-finite
    # number handling.
    fp_err_occurred = False

    def fp_err_set(err, flag):
        nonlocal fp_err_occurred
        fp_err_occurred = True

    with np.errstate(divide="call", invalid="call", call=fp_err_set):
        n = X.shape[0]
        # if X_approximate_distribution == XApproximateDistribution.COUNT:  # TODO: fix to use schema
        #     X = np.log1p(X)
        mean = X.mean(axis=0)
        dfm = X - mean
        sumsq = np.sum(np.multiply(dfm, dfm), axis=0)
        v = sumsq / (n - 1)

    if fp_err_occurred:
        mean[np.isfinite(mean) == False] = 0  # noqa: E712
        v[np.isfinite(v) == False] = 0  # noqa: E712
    else:
        mean[np.isnan(mean)] = 0
        v[np.isnan(v)] = 0

    return mean, v, n


def mean_var_cnt_sparse(matrix, n_var, rows):
    t = time.time()
    xslc = matrix.query(dims=["var"], attrs=[""], order="U").multi_index[rows, :]
    print(f"got data in {time.time() - t}")
    # mean, var = mean_var_coo(len(rows), n_var, xslc[""], xslc["var"])
    mean, var = _mean_var_sparse_numba(xslc[""], xslc["var"], len(rows), n_var)
    return mean, var, len(rows)


def mean_var_cnt_dense(matrix, n_var, rows):
    t = time.time()
    xslc = matrix.multi_index[list(rows), :]
    print(f"got data in {time.time() - t}")
    return mean_var_n(xslc[""])


@njit(error_model="numpy", nogil=True)
def mean_var_coo(n_rows, n_cols, data, col):
    mean = np.zeros((n_cols,), dtype=np.float64)
    var = np.zeros((n_cols,), dtype=np.float64)
    nonfinite_count = np.zeros((n_cols,), dtype=np.int32)
    nonzero_count = np.zeros((n_cols,), dtype=np.int32)

    # sum by axis=0
    for k in prange(0, len(data)):
        val = data[k]
        cidx = col[k]
        if np.isfinite(val):
            mean[cidx] += val
        else:
            nonfinite_count[cidx] += 1

    mean /= n_rows - nonfinite_count

    for k in prange(0, len(data)):
        val = data[k]
        cidx = col[k]
        if np.isfinite(val):  # ignore NaN and +/-Inf
            dfm = val - mean[cidx]
            var[cidx] += dfm * dfm
            nonzero_count[cidx] += 1

    var += (n_rows - nonzero_count) * mean * mean
    var /= n_rows - nonfinite_count - 1

    return mean, var
