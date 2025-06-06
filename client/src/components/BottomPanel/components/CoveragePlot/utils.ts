import memoize from "memoize-one";
import { AccessionsData, TooltipData } from "./types";

export const generateCoverageVizData = (
  coverageData: AccessionsData["coverage"],
  coverageBinSize: number
) =>
  coverageData.map((valueArr) => ({
    x0: valueArr[0] * coverageBinSize - 1, // This is the start of the bin, minus 1 for correct alignment.
    length: valueArr[1], // Actually the height. This is a d3-histogram naming convention.
  }));

// Gets called on every mouse move, so need to memoize.
export const getHistogramTooltipData = memoize(
  (accessionData: AccessionsData, coverageIndex: number): TooltipData[] => {
    const coverageObj = accessionData.coverage[coverageIndex];

    return [
      {
        name: "Chromatin Accessibility", // not shown in tooltip
        data: [
          ["Cell Type", `${coverageObj[3]}`],
          ["ChromosomeID", coverageObj[2]],
          ["Bin Size", `${coverageObj[4]}`],
          ["Tn5 Insertions", `${coverageObj[1]}`],
        ],
      },
    ];
  }
);
