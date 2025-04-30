export interface AccessionsData
  extends Pick<
    AccessionsSummary,
    "id" | "name" | "coverage_depth" | "coverage_breadth"
  > {
  coverage: [number, number, number, number, number][];
  max_aligned_length: number;
  coverage_bin_size: number;
  avg_prop_mismatch: number;
  total_length: number;
}

export interface AccessionsSummary {
  id: string;
  num_contigs: number;
  num_reads: number;
  name: string;
  score: number;
  coverage_depth: number;
  coverage_breadth: number;
  taxon_name: string;
  taxon_common_name: string;
}

export interface TooltipData {
  data: [string, string | number][];
  name: string;
  disabled?: boolean;
}
