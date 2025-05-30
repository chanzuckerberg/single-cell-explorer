import {
  UndefinedInitialDataOptions,
  useQueries,
  UseQueryResult,
} from "@tanstack/react-query";
import { fetchJson } from "util/fetch";
import { ENTITIES } from "./entities";

export type CoveragePlotData = [number, number, number][]; // [y, startBasePair, endBasePair]

export interface GeneInfo {
  geneName: string;
  geneChromosome: string;
  geneStart: number;
  geneEnd: number;
  geneStrand: "+" | "-";
}

export interface FetchCoverageResponse {
  cellType: string;
  coveragePlot: CoveragePlotData;
  chromosome: string;
  coverage: [number, number, number][];
  geneInfo: GeneInfo[];
}

async function fetchCoverage(
  geneName: string,
  genomeVersion: string,
  cellType: string
): Promise<FetchCoverageResponse> {
  const params = new URLSearchParams();
  params.set("gene_name", geneName);
  params.set("genome_version", genomeVersion);
  params.set("cell_type", cellType);

  return fetchJson<FetchCoverageResponse>(`atac/coverage?${params.toString()}`);
}

interface UseCoverageQueryOptions {
  geneName: string;
  genomeVersion: string;
  cellTypes: string[];
  options?: Partial<UndefinedInitialDataOptions<FetchCoverageResponse>>;
}

export const USE_COVERAGE = {
  entities: [ENTITIES.COVERAGE],
  id: "coverage",
};

export function useCoverageQuery({
  geneName,
  genomeVersion,
  cellTypes,
  options,
}: UseCoverageQueryOptions): UseQueryResult<FetchCoverageResponse>[] {
  return useQueries({
    queries: cellTypes.map((cellType) => ({
      queryKey: [USE_COVERAGE, geneName, genomeVersion, cellType],
      queryFn: () => fetchCoverage(geneName, genomeVersion, cellType),
      ...options,
    })),
  });
}
