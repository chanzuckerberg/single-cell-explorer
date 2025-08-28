import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useSelector } from "react-redux";
import {
  selectOrganismOntologyTermId,
  selectIsDatasetMetadataLoaded,
} from "../../selectors/datasetMetadata";

interface ChromatinViewerContextType {
  selectedGene: string;
  setSelectedGene: (gene: string) => void;
  genomeVersion: string;
  setGenomeVersion: (version: string) => void;
}

const ChromatinViewerContext = createContext<
  ChromatinViewerContextType | undefined
>(undefined);

interface ChromatinViewerProviderProps {
  children: ReactNode;
  initialSelectedGene?: string;
}

export function ChromatinViewerProvider({
  children,
  initialSelectedGene,
}: ChromatinViewerProviderProps) {
  const DEFAULT_GENOME_VERSION = "hg38";
  const DEFAULT_GENE = "MYC";

  const organismOntologyTermId = useSelector(selectOrganismOntologyTermId);
  const isDatasetMetadataLoaded = useSelector(selectIsDatasetMetadataLoaded);

  const getGenomeVersionFromOrganism = (ontologyTermId?: string): string => {
    switch (ontologyTermId) {
      case "NCBITaxon:9606": // Human
        return "hg38";
      case "NCBITaxon:10090": // Mouse
        return "mm39";
      default:
        return DEFAULT_GENOME_VERSION;
    }
  };

  const getDefaultGeneFromOrganism = (ontologyTermId?: string): string => {
    switch (ontologyTermId) {
      case "NCBITaxon:9606":
        return "MYC";
      case "NCBITaxon:10090":
        return "Myc";
      default:
        return DEFAULT_GENE;
    }
  };

  const detectedGenomeVersion = isDatasetMetadataLoaded
    ? getGenomeVersionFromOrganism(organismOntologyTermId)
    : DEFAULT_GENOME_VERSION;
  const detectedDefaultGene = isDatasetMetadataLoaded
    ? getDefaultGeneFromOrganism(organismOntologyTermId)
    : DEFAULT_GENE;

  const [selectedGene, setSelectedGene] = useState<string>(
    initialSelectedGene || detectedDefaultGene
  );
  const [genomeVersion, setGenomeVersionState] = useState<string>(
    detectedGenomeVersion
  );

  useEffect(() => {
    if (initialSelectedGene) {
      setSelectedGene(initialSelectedGene);
    }
  }, [initialSelectedGene]);

  useEffect(() => {
    if (isDatasetMetadataLoaded) {
      const newGenomeVersion = getGenomeVersionFromOrganism(
        organismOntologyTermId
      );
      setGenomeVersionState(newGenomeVersion);
    }
  }, [isDatasetMetadataLoaded, organismOntologyTermId]);

  // Update default gene when data is loaded and organism ontology term ID changes (only if no initial gene provided)
  useEffect(() => {
    if (isDatasetMetadataLoaded && !initialSelectedGene) {
      const newDefaultGene = getDefaultGeneFromOrganism(organismOntologyTermId);
      setSelectedGene(newDefaultGene);
    }
  }, [isDatasetMetadataLoaded, organismOntologyTermId, initialSelectedGene]);

  const setGenomeVersion = (version: string) => {
    setGenomeVersionState(version);
  };

  const value: ChromatinViewerContextType = {
    selectedGene,
    setSelectedGene,
    genomeVersion,
    setGenomeVersion,
  };

  return (
    <ChromatinViewerContext.Provider value={value}>
      {children}
    </ChromatinViewerContext.Provider>
  );
}

export function useChromatinViewerSelectedGene(): ChromatinViewerContextType {
  const context = useContext(ChromatinViewerContext);

  if (context === undefined) {
    throw new Error(
      "useChromatinViewerSelectedGene must be used within a ChromatinViewerProvider"
    );
  }

  return context;
}
