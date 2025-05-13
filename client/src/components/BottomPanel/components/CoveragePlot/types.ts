export interface AccessionsData {
  coverage: [number, number, string, string, number][]; // [index, barIndex, chromosomeId, cellType, binSize]
  coverage_bin_size: number;
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
