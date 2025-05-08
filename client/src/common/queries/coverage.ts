import { UndefinedInitialDataOptions, useQuery } from "@tanstack/react-query";
import { ENTITIES } from "./entites";

type CoveragePlotData = [number, number, number, number, number][];

interface FetchCoverageResponse {
  cellType: string;
  coveragePlot: CoveragePlotData;
}

async function fetchCoverage(chromosome: string, cellType: string): Promise<FetchCoverageResponse> {
  const params = new URLSearchParams();
  params.set("chr", chromosome);
  params.set("cell_type", cellType);

  const response = await fetch(
    `/atac/coverage?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Error fetching coverage data: ${response.statusText}`);
  }

  return response.json();
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