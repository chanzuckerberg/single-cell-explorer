import {
  UndefinedInitialDataOptions,
  useQuery,
  UseQueryResult,
} from "@tanstack/react-query";
import { fetchJson } from "util/fetch";
import { ENTITIES } from "./entities";

export interface CytobandSegment {
  start: number;
  end: number;
  name: string;
  stain: string;
}

export type FetchCytobandResponse = CytobandSegment[];

async function fetchCytoband(
  chromosome: string,
  genomeVersion: string
): Promise<FetchCytobandResponse> {
  const params = new URLSearchParams();
  params.set("chr", chromosome);
  params.set("genome_version", genomeVersion);

  return fetchJson<FetchCytobandResponse>(`atac/cytoband?${params.toString()}`);
}

interface UseCytobandQueryOptions {
  chromosome: string;
  genomeVersion: string;
  options?: Partial<UndefinedInitialDataOptions<FetchCytobandResponse>>;
}

export const USE_CYTOBAND = {
  entities: [ENTITIES.CYTOBAND],
  id: "cytoband",
};

export function useCytobandQuery({
  chromosome,
  genomeVersion,
  options,
}: UseCytobandQueryOptions): UseQueryResult<FetchCytobandResponse> {
  return useQuery({
    queryKey: [USE_CYTOBAND, chromosome, genomeVersion],
    queryFn: () => fetchCytoband(chromosome, genomeVersion),
    ...options,
  });
}
