import React, { createContext, useContext, useState, ReactNode } from "react";

// Define the context type
interface ChromatinViewerContextType {
  selectedGene: string;
  setSelectedGene: (gene: string) => void;
}

// Create the context
const ChromatinViewerContext = createContext<
  ChromatinViewerContextType | undefined
>(undefined);

// Provider component props
interface ChromatinViewerProviderProps {
  children: ReactNode;
  defaultGene?: string;
}

// Provider component
export function ChromatinViewerProvider({
  children,
  defaultGene = "MYC",
}: ChromatinViewerProviderProps) {
  const [selectedGene, setSelectedGeneState] = useState<string>(defaultGene);

  const setSelectedGene = (gene: string) => {
    setSelectedGeneState(gene);
  };

  const value: ChromatinViewerContextType = {
    selectedGene,
    setSelectedGene,
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
