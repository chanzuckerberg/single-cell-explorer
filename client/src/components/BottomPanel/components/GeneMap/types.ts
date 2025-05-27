import { GeneInfo } from "common/queries/coverage";

export interface BinnedGenes {
  plus: GeneInfo[][];
  minus: GeneInfo[][];
}
