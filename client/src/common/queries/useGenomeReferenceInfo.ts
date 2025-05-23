import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { fetchJson } from "util/fetch";
// import { ENTITIES } from "./entites";

export interface FetchGeneInfoResponse {
  selectedGene: string;
  chromosomeId: string;
  allGenesOnChromosome: GeneInfo[];
}

export interface GeneInfo {
  geneChromosome: string;
  geneEnd: number;
  geneName: string;
  geneStart: number;
  geneStrand: "+" | "-";
}

async function fetchGeneInfo(
  geneName: string,
  genomeVersion: string
): Promise<FetchGeneInfoResponse> {
  const params = new URLSearchParams();
  params.set("gene_name", geneName);
  params.set("genome_version", genomeVersion);

  return fetchJson<FetchGeneInfoResponse>(`atac/geneinfo?${params.toString()}`);
}

interface UseGeneInfoQueryOptions {
  geneName: string;
  genomeVersion: string;
  options?: Partial<UseQueryOptions>;
}

// export const USE_GENOME_REFERENCE_INFO = {
//   entities: [ENTITIES.GENOME_REFERENCE_INFO],
//   id: "geneInfo",
// };

interface UseGeneInfoQueryOptions
  extends Omit<UseQueryOptions<FetchGeneInfoResponse>, "queryKey" | "queryFn"> {
  geneName: string;
  genomeVersion: string;
}

export function useGeneInfoQuery({
  geneName,
  genomeVersion,
  ...options
}: UseGeneInfoQueryOptions) {
  return useQuery<FetchGeneInfoResponse>({
    queryKey: ["geneInfo", geneName, genomeVersion],
    queryFn: () => fetchGeneInfo(geneName, genomeVersion),
    ...options,
  });
}
