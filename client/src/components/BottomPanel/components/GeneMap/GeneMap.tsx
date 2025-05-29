import React from "react";
import { GeneInfo } from "common/queries/coverage";
import { GeneMapSVG } from "./components/GeneMapSVG/GeneMapSVG";

export const GeneMap = ({
  svgWidth,
  geneInfo,
  startBasePair,
  endBasePair,
  formatSelectedGenes,
}: {
  svgWidth: number;
  geneInfo?: GeneInfo[];
  startBasePair: number;
  endBasePair: number;
  formatSelectedGenes: string;
}) => {
  // get selectedGene from gene info
  if (!geneInfo) return null;
  const selectedGeneInfo = geneInfo.find(
    (gene) => gene.geneName === formatSelectedGenes
  );
  if (!selectedGeneInfo) {
    return <>`${formatSelectedGenes} not found in gene info`</>;
  }
  const genesInRange = getGenesInRange(geneInfo, startBasePair, endBasePair);
  return (
    <div>
      <GeneMapSVG
        data={genesInRange}
        startBasePair={startBasePair}
        endBasePair={endBasePair}
        selectedGene={formatSelectedGenes}
        svgWidth={svgWidth}
      />
    </div>
  );
};

const getGenesInRange = (
  genes: GeneInfo[],
  startBasePair: number,
  endBasePair: number
): GeneInfo[] =>
  genes.filter(
    (gene) =>
      (gene.geneStart >= startBasePair && gene.geneStart <= endBasePair) ||
      (gene.geneEnd >= startBasePair && gene.geneEnd <= endBasePair)
  );
