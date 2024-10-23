export const DIFFEXP_SLOW_MSG =
  "(CAUTION: large dataset - may take longer or fail)";
export const genTipMessage = (slowMsg: string) =>
  `See top differentially expressed genes${slowMsg}`;
export const genTipMessageWarn = (cellCountMax: number) =>
  `The total number of cells for differential expression computation may not exceed ${cellCountMax}. Try reselecting new cell sets.`;
