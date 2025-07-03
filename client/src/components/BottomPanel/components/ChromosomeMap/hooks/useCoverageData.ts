import { useMemo } from "react";
import { UseQueryResult } from "@tanstack/react-query";
import { FetchCoverageResponse } from "common/queries/coverage";

export const useCoverageData = (
  coverageQuery: UseQueryResult<FetchCoverageResponse>
) => {
  const totalBasePairs = useMemo(() => {
    const coverageByCellType = coverageQuery.data?.coverageByCellType;
    if (!coverageByCellType) return 0;
    return Math.max(
      ...Object.values(coverageByCellType).map((coverage) => coverage.length),
      0
    );
  }, [coverageQuery.data?.coverageByCellType]);

  const startBasePair = useMemo(() => {
    const coverageByCellType = coverageQuery.data?.coverageByCellType;
    if (!coverageByCellType) return 0;
    for (const coverage of Object.values(coverageByCellType)) {
      if (coverage.length > 0) return coverage[0][1];
    }
    return 0;
  }, [coverageQuery.data?.coverageByCellType]);

  const endBasePair = useMemo(() => {
    const coverageByCellType = coverageQuery.data?.coverageByCellType;
    if (!coverageByCellType) return 0;
    for (const coverage of Object.values(coverageByCellType)) {
      if (coverage.length > 0) return coverage[coverage.length - 1][2];
    }
    return 0;
  }, [coverageQuery.data?.coverageByCellType]);

  const binSize = useMemo(() => {
    const coverageByCellType = coverageQuery.data?.coverageByCellType;
    if (!coverageByCellType) return 0;
    for (const coverage of Object.values(coverageByCellType)) {
      if (coverage.length > 0) {
        const [, start, end] = coverage[0];
        return end - start;
      }
    }
    return 0;
  }, [coverageQuery.data?.coverageByCellType]);

  const yMax = useMemo(() => {
    const coverageByCellType = coverageQuery.data?.coverageByCellType;
    if (!coverageByCellType) return 0;
    let maxY = 0;
    for (const coverage of Object.values(coverageByCellType)) {
      for (const [value] of coverage) {
        if (value > maxY) maxY = value;
      }
    }
    return Math.ceil(maxY);
  }, [coverageQuery.data?.coverageByCellType]);

  const totalBPAtScale = (totalBasePairs * binSize) / 1_000;

  return {
    totalBasePairs,
    startBasePair,
    endBasePair,
    binSize,
    yMax,
    totalBPAtScale,
  };
};
