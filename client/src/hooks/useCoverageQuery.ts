import { UndefinedInitialDataOptions, useQuery } from "@tanstack/react-query";

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
  options?: Partial<UndefinedInitialDataOptions<FetchCoverageResponse, Error>>
}

export function useCoverageQuery(
  { chromosome, cellType, options }: UseCoverageQueryOptions
) {
  return useQuery<FetchCoverageResponse, Error>({
    queryKey: ['fetch-coverage', chromosome, cellType],
    queryFn: () => fetchCoverage(chromosome, cellType),
    ...options,
  })
}