import { UndefinedInitialDataOptions, useQuery } from "@tanstack/react-query";
import { fetchJson } from "util/fetch";
import { ENTITIES } from "./entites";


/**
 * Coverage plot data represented as [yValue, startBP, endBP].
 * TODO add descriptions for remaining values.
 */
export type CoveragePlotDataPoint = [number, number, number, number, number];

interface FetchCoverageResponse {
  cellType: string;
  coveragePlot: CoveragePlotDataPoint[];
}

async function fetchCoverage(chromosome: string, cellType: string): Promise<FetchCoverageResponse> {
  const params = new URLSearchParams();
  params.set("chr", chromosome);
  params.set("cell_type", cellType);

  return fetchJson<FetchCoverageResponse>(
    `/atac/coverage?${params.toString()}`
  );
}

interface UseCoverageQueryOptions {
  chromosome: string;
  cellType: string;
  options?: Partial<UndefinedInitialDataOptions<FetchCoverageResponse>>
}

export const USE_COVERAGE = {
  entities: [ENTITIES.COVERAGE],
  id: "coverage",
}

export function useCoverageQuery(
  { chromosome, cellType, options }: UseCoverageQueryOptions
) {
  return useQuery<FetchCoverageResponse>({
    queryKey: [USE_COVERAGE, chromosome, cellType],
    queryFn: () => fetchCoverage(chromosome, cellType),
    ...options,
  })
}