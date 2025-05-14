import {
  UndefinedInitialDataOptions,
  useQueries,
  UseQueryResult,
} from "@tanstack/react-query";
import { fetchJson } from "util/fetch";
import { ENTITIES } from "./entites";

export type CoveragePlotData = [number, number, number][]; // [y, startBasePair, endBasePair]

export interface FetchCoverageResponse {
  cellType: string;
  coveragePlot: CoveragePlotData;
}

async function fetchCoverage(
  chromosome: string,
  cellType: string
): Promise<FetchCoverageResponse> {
  const params = new URLSearchParams();
  params.set("chr", chromosome);
  params.set("cell_type", cellType);

  return fetchJson<FetchCoverageResponse>(
    `/atac/coverage?${params.toString()}`
  );
}

interface UseCoverageQueryOptions {
  chromosome: string;
  cellTypes: string[];
  options?: Partial<UndefinedInitialDataOptions<FetchCoverageResponse>>;
}

export const USE_COVERAGE = {
  entities: [ENTITIES.COVERAGE],
  id: "coverage",
};

export function useCoverageQuery({
  chromosome,
  cellTypes,
  options,
}: UseCoverageQueryOptions): UseQueryResult<FetchCoverageResponse>[] {
  return useQueries({
    queries: cellTypes.map((cellType) => ({
      queryKey: [USE_COVERAGE, chromosome, cellType],
      queryFn: () => fetchCoverage(chromosome, cellType),
      ...options,
    })),
  });
}
