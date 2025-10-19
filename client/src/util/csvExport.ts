import AnnoMatrix from "../annoMatrix/annoMatrix";
import { Genesets } from "../reducers/genesets";
import {
  STANDARD_CATEGORY_NAMES,
  EXCLUDED_CATEGORY_NAMES,
} from "../common/types/entities";
import { Schema, Field } from "../common/types/schema";
import { isCategoricalAnnotation } from "./stateManager/annotationsHelpers";

/**
 * Downloads a file by creating a blob and triggering a download
 */
export function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.append(a);
  a.click();
  // Revoke the blob URL and remove the element
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}

/**
 * Escapes CSV values to handle commas, quotes, and newlines
 */
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = String(value);
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Converts an array of values to a CSV row
 */
function arrayToCsvRow(values: any[]): string {
  return values.map(escapeCsvValue).join(",");
}

/**
 * Exports categories and label annotations as CSV
 */
export async function exportCategoriesCSV(
  annoMatrix: AnnoMatrix,
  schema: Schema
): Promise<void> {
  try {
    // Get all categorical columns from schema (exclude continuous metadata)
    const allColumns = Object.keys(schema.annotations.obsByName);
    const categoricalColumns = allColumns.filter(
      (col) =>
        !EXCLUDED_CATEGORY_NAMES.includes(col) &&
        isCategoricalAnnotation(schema, col) === true
    );

    // Include name_0 (cell index) as the first column
    const cellIndexColumn = schema.annotations.obs.index;

    // Categorize columns, excluding the cell index column to prevent duplication
    const standardColumns = categoricalColumns.filter(
      (col) => STANDARD_CATEGORY_NAMES.includes(col) && col !== cellIndexColumn
    );
    const authorColumns = categoricalColumns.filter(
      (col) =>
        !STANDARD_CATEGORY_NAMES.includes(col) &&
        !schema.annotations.obsByName[col]?.writable &&
        col !== cellIndexColumn
    );
    const userColumns = categoricalColumns.filter(
      (col) =>
        schema.annotations.obsByName[col]?.writable && col !== cellIndexColumn
    );

    const allColumnsInOrder = [
      ...standardColumns,
      ...authorColumns,
      ...userColumns,
    ];

    // Fetch all the data (excluding the cell index column as it's already available)
    if (allColumnsInOrder.length > 0) {
      await annoMatrix.fetch(Field.obs, allColumnsInOrder);
    }
    const obsData = annoMatrix._cache.obs;

    // Create CSV content
    const csvRows: string[] = [];

    // Row 1: Block headers
    const blockHeaders = [
      "Cell Index",
      ...standardColumns.map(() => "Standard Categories"),
      ...authorColumns.map(() => "Author Categories"),
      ...userColumns.map(() => "User Categories"),
    ];
    csvRows.push(arrayToCsvRow(blockHeaders));

    // Row 2: Column names
    const allColumnNames = [cellIndexColumn, ...allColumnsInOrder];
    csvRows.push(arrayToCsvRow(allColumnNames));

    // Data rows
    for (let i = 0; i < annoMatrix.nObs; i += 1) {
      const rowData = [cellIndexColumn, ...allColumnsInOrder].map((col) => {
        if (col === cellIndexColumn) {
          // For cell index, use the row label from rowIndex
          return obsData.rowIndex.getLabel(i) || i.toString();
        }
        const column = obsData.col(col);
        // Use getLabelArray to get the proper string labels instead of raw codes
        return column.getLabelArray()[i];
      });
      csvRows.push(arrayToCsvRow(rowData));
    }

    const csvContent = csvRows.join("\n");
    const filename = `categories_annotations_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    downloadFile(csvContent, filename);
  } catch (error) {
    console.error("Failed to export categories CSV:", error);
    throw error;
  }
}

/**
 * Exports gene set annotations as CSV
 */
export function exportGeneSetsCSV(genesets: Genesets): void {
  const csvRows: string[] = [];

  // Header row
  csvRows.push(
    arrayToCsvRow([
      "Gene Set Name",
      "Gene Set Description",
      "Gene Symbol",
      "Gene Description",
    ])
  );

  // Data rows - each gene in each set gets its own row
  // Gene set name and description only shown for the first gene in each set
  genesets.forEach((geneset, genesetName) => {
    let isFirstGeneInSet = true;
    geneset.genes.forEach((gene, geneSymbol) => {
      if (isFirstGeneInSet) {
        // Show gene set info for the first gene
        csvRows.push(
          arrayToCsvRow([
            genesetName,
            geneset.genesetDescription,
            geneSymbol,
            gene.geneDescription,
          ])
        );
        isFirstGeneInSet = false;
      } else {
        // Blank cells for subsequent genes in the same set
        csvRows.push(
          arrayToCsvRow([
            "", // Blank gene set name
            "", // Blank gene set description
            geneSymbol,
            gene.geneDescription,
          ])
        );
      }
    });
  });

  const csvContent = csvRows.join("\n");
  const filename = `gene_sets_annotations_${
    new Date().toISOString().split("T")[0]
  }.csv`;
  downloadFile(csvContent, filename);
}
