import { GeneInfo } from "common/queries/coverage";

export interface GeneMapSVGProps {
  data: GeneInfo[];
  selectedGene: string;
  svgWidth: number;
}
