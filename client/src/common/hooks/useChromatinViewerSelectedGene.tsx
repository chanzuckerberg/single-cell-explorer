import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../reducers";

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

  // Get organism ontology term ID from config to determine genome version
  const config = useSelector((state: RootState) => state.config);
  const organismOntologyTermId =
    config?.corpora_props?.organism_ontology_term_id;

  // Map organism ontology term ID to genome version
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

  // Map organism ontology term ID to default gene
  const getDefaultGeneFromOrganism = (ontologyTermId?: string): string => {
    switch (ontologyTermId) {
      case "NCBITaxon:9606":
        return "MYC";
      case "NCBITaxon:10090":
        return "Vip";
      default:
        return DEFAULT_GENE;
    }
  };

  const detectedGenomeVersion = getGenomeVersionFromOrganism(
    organismOntologyTermId
  );
  const detectedDefaultGene = getDefaultGeneFromOrganism(
    organismOntologyTermId
  );

  const [selectedGene, setSelectedGene] = useState<string>(
    initialSelectedGene || detectedDefaultGene
  );
  const [genomeVersion, setGenomeVersionState] = useState<string>(
    detectedGenomeVersion
  );

  // Update selected gene when initialSelectedGene changes (from Redux)
  useEffect(() => {
    if (initialSelectedGene) {
      setSelectedGene(initialSelectedGene);
    }
  }, [initialSelectedGene]);

  // Update genome version when organism ontology term ID changes
  useEffect(() => {
    const newGenomeVersion = getGenomeVersionFromOrganism(
      organismOntologyTermId
    );
    setGenomeVersionState(newGenomeVersion);
  }, [organismOntologyTermId]);

  // Update default gene when organism ontology term ID changes (only if no initial gene provided)
  useEffect(() => {
    if (!initialSelectedGene) {
      const newDefaultGene = getDefaultGeneFromOrganism(organismOntologyTermId);
      setSelectedGene(newDefaultGene);
    }
  }, [organismOntologyTermId, initialSelectedGene]);

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
