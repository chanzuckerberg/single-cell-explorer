import React, { createContext, useContext, useState, ReactNode } from "react";

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
  defaultGene?: string;
  defaultGenomeVersion?: string;
}

export function ChromatinViewerProvider({
  children,
  defaultGene = "MYC",
  defaultGenomeVersion = "hg38",
}: ChromatinViewerProviderProps) {
  const [selectedGene, setSelectedGeneState] = useState<string>(defaultGene);
  const [genomeVersion, setGenomeVersionState] =
    useState<string>(defaultGenomeVersion);

  const setSelectedGene = (gene: string) => {
    setSelectedGeneState(gene);
  };

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
