import React, { createContext, useContext, useState, ReactNode } from "react";

// Define types for ATAC/coverage data
interface ATACCoverageData {
  // Adjust these types based on your actual data structure
  coverage: number[];
  positions: number[];
  chromosome: string;
  start: number;
  end: number;
  // Add other properties as needed
}

// Define the context type
interface ChromatinViewerContextType {
  selectedGene: string;
  setSelectedGene: (gene: string) => void;
  genomeVersion: string;
  setGenomeVersion: (version: string) => void;
  atacCoverageData: ATACCoverageData | null;
  setAtacCoverageData: (data: ATACCoverageData | null) => void;
  isLoadingCoverage: boolean;
  setIsLoadingCoverage: (loading: boolean) => void;
}

// Create the context
const ChromatinViewerContext = createContext<
  ChromatinViewerContextType | undefined
>(undefined);

// Provider component props
interface ChromatinViewerProviderProps {
  children: ReactNode;
  defaultGene?: string;
  defaultGenomeVersion?: string;
}

// Provider component
export function ChromatinViewerProvider({
  children,
  defaultGene = "MYC",
  defaultGenomeVersion = "hg38",
}: ChromatinViewerProviderProps) {
  const [selectedGene, setSelectedGeneState] = useState<string>(defaultGene);
  const [genomeVersion, setGenomeVersionState] =
    useState<string>(defaultGenomeVersion);
  const [atacCoverageData, setAtacCoverageDataState] =
    useState<ATACCoverageData | null>(null);
  const [isLoadingCoverage, setIsLoadingCoverageState] =
    useState<boolean>(false);

  const setSelectedGene = (gene: string) => {
    setSelectedGeneState(gene);
    // Clear coverage data when gene changes
    setAtacCoverageDataState(null);
  };

  const setGenomeVersion = (version: string) => {
    setGenomeVersionState(version);
    // Clear coverage data when genome version changes
    setAtacCoverageDataState(null);
  };

  const setAtacCoverageData = (data: ATACCoverageData | null) => {
    setAtacCoverageDataState(data);
  };

  const setIsLoadingCoverage = (loading: boolean) => {
    setIsLoadingCoverageState(loading);
  };

  const value: ChromatinViewerContextType = {
    selectedGene,
    setSelectedGene,
    genomeVersion,
    setGenomeVersion,
    atacCoverageData,
    setAtacCoverageData,
    isLoadingCoverage,
    setIsLoadingCoverage,
  };

  return (
    <ChromatinViewerContext.Provider value={value}>
      {children}
    </ChromatinViewerContext.Provider>
  );
}

// Custom hook to use the context
export function useChromatinViewerSelectedGene(): ChromatinViewerContextType {
  const context = useContext(ChromatinViewerContext);

  if (context === undefined) {
    throw new Error(
      "useChromatinViewerSelectedGene must be used within a ChromatinViewerProvider"
    );
  }

  return context;
}

// Additional convenience hooks for specific parts of the context
export function useChromatinViewerGenome() {
  const { genomeVersion, setGenomeVersion } = useChromatinViewerSelectedGene();
  return { genomeVersion, setGenomeVersion };
}

export function useChromatinViewerCoverage() {
  const {
    atacCoverageData,
    setAtacCoverageData,
    isLoadingCoverage,
    setIsLoadingCoverage,
  } = useChromatinViewerSelectedGene();

  return {
    atacCoverageData,
    setAtacCoverageData,
    isLoadingCoverage,
    setIsLoadingCoverage,
  };
}
