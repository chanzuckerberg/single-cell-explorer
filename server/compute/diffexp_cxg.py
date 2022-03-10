import concurrent.futures

import numpy as np
from numba import jit

from server.common.compute.diffexp_generic import diffexp_ttest_from_mean_var
from server.common.constants import XApproximateDistribution
from server.common.errors import ComputeError


def set_config(*args, **kwargs):
    pass


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
    :param arr: the tdb array to read
    absolute value returning [ varindex, logfoldchange, pval, pval_adj ] for top N genes
    :return:  for top N genes, {"positive": for top N genes, [ varindex, foldchange, pval, pval_adj ],
              "negative": for top N genes, [ varindex, foldchange, pval, pval_adj ]}
    """
    matrix = adaptor.open_array(arr)
    row_selector_A = np.where(maskA)[0]
    row_selector_B = np.where(maskB)[0]

    dtype = matrix.dtype
    cols = matrix.shape[1]
    is_sparse = matrix.schema.sparse

    mean_var_cnt_fn = mean_var_cnt_sparse if is_sparse else mean_var_cnt_dense
    with concurrent.futures.ThreadPoolExecutor() as tp:
        A = tp.submit(mean_var_cnt_fn, matrix, cols, row_selector_A)
        B = tp.submit(mean_var_cnt_fn, matrix, cols, row_selector_B)
        try:
            meanA, varA, nA = A.result()
            meanB, varB, nB = B.result()
        except Exception as e:
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
        if X_approximate_distribution == XApproximateDistribution.COUNT:  # TODO: fix to use schema
            X = np.log1p(X)
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
    rows.sort()
    xslc = matrix.query(dims=["var"], attrs=[""], order="U").multi_index[rows, :]
    mean, var = _mean_var_sparse_numba(xslc[""], xslc["var"], len(rows), n_var)
    return mean, var, len(rows)


def mean_var_cnt_dense(matrix, _, rows):
    # TODO: why is the list cast still necessary? Tdb is throwing an error
    xslc = matrix.multi_index[list(rows), :]
    return mean_var_n(xslc[""])
