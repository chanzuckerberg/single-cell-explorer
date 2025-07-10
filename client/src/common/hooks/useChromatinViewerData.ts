import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useCoverageQuery } from "common/queries/coverage";
import { Schema } from "common/types/schema";
import { formatSelectedGene } from "components/BottomPanel/utils";
import { useChromatinViewerSelectedGene } from "./useChromatinViewerSelectedGene";

export function useChromatinViewerData(
  schema: Schema | undefined,
  selectedCellTypes: string[]
) {
  const dispatch = useDispatch();
  const { selectedGene, genomeVersion, setGenomeVersion } =
    useChromatinViewerSelectedGene();

  // Set genome version when schema changes
  useEffect(() => {
    const newGenomeVersion = getReferenceGenomeVersion(schema);
    if (newGenomeVersion && newGenomeVersion !== genomeVersion) {
      setGenomeVersion(newGenomeVersion);
    }
  }, [schema, genomeVersion, setGenomeVersion]);

  const coverageQuery = useCoverageQuery({
    cellTypes: selectedCellTypes,
    geneName: formatSelectedGene(selectedGene),
    genomeVersion,
    options: {
      enabled: Boolean(
        genomeVersion && selectedCellTypes.length > 0 && selectedGene
      ),
      retry: 3,
    },
  });

  useEffect(() => {
    if (coverageQuery.data && !coverageQuery.isError) {
      dispatch({
        type: "set chromatin data availability",
        hasChromatinData: true,
      });
    }
  }, [coverageQuery.data, coverageQuery.isError, dispatch]);

  return {
    isLoading: coverageQuery.isLoading,
    isError: coverageQuery.isError,
    error: coverageQuery.error,
    data: coverageQuery.data,

    // Context state
    genomeVersion,
    selectedGene,
  };
}

const getReferenceGenomeVersion = (
  schema: Schema | undefined
): string | null => {
  if (!schema?.annotations?.obs?.columns) {
    return null;
  }

  // Find the organism column
  const organismColumn = schema.annotations.obs.columns.find(
    (col) => col.name === "organism"
  );

  if (!organismColumn?.categories || organismColumn.categories.length === 0) {
    return null;
  }

  // Check the organism categories
  const organism = organismColumn.categories[0]; // Get first (and likely only) organism

  if (organism === "Homo sapiens") {
    return "hg38";
  }
  if (organism === "Mus musculus") {
    return "mm39";
  }

  // Return null for unsupported organisms
  return null;
};
