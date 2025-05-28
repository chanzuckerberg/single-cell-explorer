import { GeneInfo } from "common/queries/coverage";

// Calculate the estimated width of a text string in SVG
export const estimateTextWidth = (text: string, fontSize = 10) =>
  // A rough estimate - average character width in pixels based on font size 10
  text.length * (fontSize * 0.6);

// Create a function to check for gene overlaps that can be reused
const checkOverlap = (
  gene: GeneInfo,
  otherGene: GeneInfo,
  startBasePair: number,
  endBasePair: number,
  scaleX: (x: number) => number
): boolean => {
  const geneStartX = scaleX(Math.max(gene.geneStart, startBasePair));
  const geneEndX = scaleX(Math.min(gene.geneEnd, endBasePair));
  const otherStartX = scaleX(Math.max(otherGene.geneStart, startBasePair));
  const otherEndX = scaleX(Math.min(otherGene.geneEnd, endBasePair));

  // Calculate gene label dimensions
  const labelWidth = estimateTextWidth(gene.geneName);
  const labelStartX = geneStartX - 3;
  const labelEndX = labelStartX + labelWidth;

  // Calculate other gene's label dimensions
  const otherLabelWidth = estimateTextWidth(otherGene.geneName);
  const otherLabelStartX = otherStartX - 3;
  const otherLabelEndX = otherLabelStartX + otherLabelWidth;

  const overlapThreshold = 5; // Threshold for overlap detection

  // Check for overlaps in gene bodies
  const geneBodyOverlap = !(
    geneEndX < otherStartX - overlapThreshold ||
    geneStartX > otherEndX + overlapThreshold
  );

  // Check for overlaps in labels
  const labelOverlap = !(
    labelEndX < otherLabelStartX - overlapThreshold ||
    labelStartX > otherLabelEndX + overlapThreshold
  );

  return geneBodyOverlap || labelOverlap;
};

// Organize genes into rows across strands
export const organizeGenesIntoRows = (
  genes: GeneInfo[],
  startBasePair: number,
  endBasePair: number,
  scaleX: (position: number) => number
) => {
  // Filter genes that overlap with the viewport
  const visibleGenes = genes.filter(
    (gene) =>
      // Gene overlaps with viewport if gene start < viewport end AND gene end > viewport start
      gene.geneStart < endBasePair && gene.geneEnd > startBasePair
  );

  // Sort genes by start position
  const sortedGenes = [...visibleGenes].sort(
    (a, b) => a.geneStart - b.geneStart
  );
  const rows: GeneInfo[][] = [];

  // Process each gene
  for (const gene of sortedGenes) {
    // Try to find a suitable row for the gene
    let foundRow = false;

    // Check all existing rows for a spot without overlaps
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      let canAddToRow = true;

      // Check for overlaps with genes already in this row
      for (const existingGene of row) {
        if (
          checkOverlap(gene, existingGene, startBasePair, endBasePair, scaleX)
        ) {
          canAddToRow = false;
          break;
        }
      }

      if (canAddToRow) {
        row.push(gene);
        foundRow = true;
        break;
      }
    }

    // If no suitable row found, create a new row
    if (!foundRow) {
      rows.push([gene]);
    }
  }

  return rows;
};
