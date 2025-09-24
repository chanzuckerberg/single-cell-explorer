import { useMemo } from "react";
import { UseQueryResult } from "@tanstack/react-query";
import { FetchCoverageResponse } from "common/queries/coverage";

type CoverageEntry = FetchCoverageResponse["coverageByCellType"][string];

export const useCoverageData = (
  coverageQuery: UseQueryResult<FetchCoverageResponse>
) => {
  const coverageValues = useMemo(() => {
    const coverageByCellType = coverageQuery.data?.coverageByCellType;
    if (!coverageByCellType) return [] as CoverageEntry[];
    return Object.values(coverageByCellType) as CoverageEntry[];
  }, [coverageQuery.data?.coverageByCellType]);

  const totalBasePairs = useMemo(() => {
    if (coverageValues.length === 0) return 0;
    return Math.max(...coverageValues.map((coverage) => coverage.length), 0);
  }, [coverageValues]);

  const startBasePair = useMemo(() => {
    for (const coverage of coverageValues) {
      if (coverage.length > 0) return coverage[0][1];
    }
    return 0;
  }, [coverageValues]);

  const endBasePair = useMemo(() => {
    for (const coverage of coverageValues) {
      if (coverage.length > 0) return coverage[coverage.length - 1][2];
    }
    return 0;
  }, [coverageValues]);

  const binSize = useMemo(() => {
    for (const coverage of coverageValues) {
      if (coverage.length > 0) {
        const [, start, end] = coverage[0];
        return end - start;
      }
    }
    return 0;
  }, [coverageValues]);

  const yMax = useMemo(() => {
    let maxY = 0;
    for (const coverage of coverageValues) {
      for (const [value] of coverage) {
        if (value > maxY) maxY = value;
      }
    }
    return Math.ceil(maxY);
  }, [coverageValues]);

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
