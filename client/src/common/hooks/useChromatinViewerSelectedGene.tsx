import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

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
  const DEFAULT_GENE = "MYC";
  const DEFAULT_GENOME_VERSION = "hg38";
  const [selectedGene, setSelectedGene] = useState<string>(
    initialSelectedGene || DEFAULT_GENE
  );
  const [genomeVersion, setGenomeVersionState] = useState<string>(
    DEFAULT_GENOME_VERSION
  );

  // Update selected gene when initialSelectedGene changes (from Redux)
  useEffect(() => {
    if (initialSelectedGene) {
      setSelectedGene(initialSelectedGene);
    }
  }, [initialSelectedGene]);

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
