import { GeneInfo } from "common/queries/coverage";
import { GeneMapSVGProps } from "./types";

// Calculate the estimated width of a text string in SVG
export const estimateTextWidth = (text: string, fontSize = 10) =>
  // A rough estimate - average character width in pixels based on font size 10
  text.length * (fontSize * 0.6);

// Create a function to check for gene overlaps that can be reused
const checkOverlap = (
  gene: GeneInfo,
  otherGene: GeneInfo,
  scaleX: (x: number) => number
): boolean => {
  const geneStartX = scaleX(gene.geneStart);
  const geneEndX = scaleX(gene.geneEnd);
  const otherStartX = scaleX(otherGene.geneStart);
  const otherEndX = scaleX(otherGene.geneEnd);

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
  geneData: GeneMapSVGProps["data"],
  scaleX: (x: number) => number
) => {
  if (!geneData) return [];

  // Sort genes by start position
  // This is important to ensure that we can find overlaps correctly
  const allGenes = [...geneData].sort((a, b) => a.geneStart - b.geneStart);

  // Array to hold all rows of genes
  const rows: Array<Array<GeneInfo & { originalStrand?: string }>> = [];

  // Process each gene
  for (const gene of allGenes) {
    // Try to find a suitable row for the gene
    let foundRow = false;

    // Check all existing rows for a spot without overlaps
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      let canAddToRow = true;

      // Check for overlaps with genes already in this row
      for (const existingGene of row) {
        if (checkOverlap(gene, existingGene, scaleX)) {
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
