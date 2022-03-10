import numpy as np
from scipy import stats


# TODO: move this into diffexp_cxg and rename to just diffex
def diffexp_ttest_from_mean_var(meanA, varA, nA, meanB, varB, nB, top_n, diffexp_lfc_cutoff):
    # IMPORTANT NOTE: this code assumes the data is normally distributed and/or already logged.

    n_var = meanA.shape[0]
    top_n = min(top_n, n_var)

    # variance / N
    vnA = varA / min(nA, nB)  # overestimate variance, would normally be nA
    vnB = varB / min(nA, nB)  # overestimate variance, would normally be nB
    sum_vn = vnA + vnB

    # degrees of freedom for Welch's t-test
    with np.errstate(divide="ignore", invalid="ignore"):
        dof = sum_vn ** 2 / (vnA ** 2 / (nA - 1) + vnB ** 2 / (nB - 1))
    dof[np.isnan(dof)] = 1

    # Welch's t-test score calculation
    with np.errstate(divide="ignore", invalid="ignore"):
        tscores = (meanA - meanB) / np.sqrt(sum_vn)
    tscores[np.isnan(tscores)] = 0

    # p-value
    pvals = stats.t.sf(np.abs(tscores), dof) * 2
    pvals_adj = pvals * n_var
    pvals_adj[pvals_adj > 1] = 1  # cap adjusted p-value at 1

    # log fold change. The data is normally distributed/logged, so just subtract the means.
    logfoldchanges = meanA - meanB

    stats_to_sort = tscores
    # find all with lfc > cutoff
    lfc_above_cutoff_idx = np.nonzero(np.abs(logfoldchanges) > diffexp_lfc_cutoff)[0]

    # derive sort order
    if lfc_above_cutoff_idx.shape[0] > top_n * 2:
        # partition top N
        rel_t_partition = np.argpartition(stats_to_sort[lfc_above_cutoff_idx], (top_n, -top_n))
        rel_t_partition_top_n = np.concatenate((rel_t_partition[-top_n:], rel_t_partition[:top_n]))
        t_partition = lfc_above_cutoff_idx[rel_t_partition_top_n]
        # sort the top N partition
        rel_sort_order = np.argsort(stats_to_sort[t_partition])[::-1]
        sort_order = t_partition[rel_sort_order]
    else:
        # partition and sort top N, ignoring lfc cutoff
        partition = np.argpartition(stats_to_sort, (top_n, -top_n))
        partition_top_n = np.concatenate((partition[-top_n:], partition[:top_n]))

        rel_sort_order = np.argsort(stats_to_sort[partition_top_n])[::-1]
        indices = np.indices(stats_to_sort.shape)[0]
        sort_order = indices[partition_top_n][rel_sort_order]

    # top n slice based upon sort order
    logfoldchanges_top_n = logfoldchanges[sort_order]
    pvals_top_n = pvals[sort_order]
    pvals_adj_top_n = pvals_adj[sort_order]

    # varIndex, logfoldchange, pval, pval_adj
    result = {
        "positive": [
            [sort_order[i], logfoldchanges_top_n[i], pvals_top_n[i], pvals_adj_top_n[i]] for i in range(top_n)
        ],
        "negative": [
            [sort_order[i], logfoldchanges_top_n[i], pvals_top_n[i], pvals_adj_top_n[i]]
            for i in range(-1, -1 - top_n, -1)
        ],
    }

    return result
