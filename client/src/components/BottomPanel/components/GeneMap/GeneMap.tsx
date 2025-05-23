import React from "react";
import { useChromatinViewerSelectedGene } from "common/queries/useChromatinViewerSelectedGene";
import { GeneInfo } from "common/queries/coverage";
import { GeneMapSVG } from "./components/GeneMapSVG/GeneMapSVG";

export const GeneMap = ({
  chromosomeId,
  svgWidth,
  geneInfo,
  startBasePair,
  endBasePair,
}: {
  chromosomeId: string;
  svgWidth: number;
  geneInfo?: GeneInfo[];
  startBasePair: number;
  endBasePair: number;
}) => {
  const { selectedGene } = useChromatinViewerSelectedGene();
  console.log("GeneMap sees:", {
    chromosomeId,
    svgWidth,
    geneInfo,
    startBasePair,
    endBasePair,
    selectedGene,
  });
  // get selectedGene from gene info
  if (!geneInfo) return null;
  const selectedGeneInfo = geneInfo.find(
    (gene) => gene.geneName === selectedGene
  );
  if (!selectedGeneInfo) {
    return <>`${selectedGene} not found in gene info`</>;
  }
  const genesInRange = getGenesInRange(geneInfo, startBasePair, endBasePair);
  return (
    <div>
      <GeneMapSVG
        data={genesInRange}
        selectedGene={selectedGene}
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
