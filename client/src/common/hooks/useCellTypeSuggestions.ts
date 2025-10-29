import { useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "reducers";

/**
 * Hook to get cell type suggestions for LabelInput
 * @returns Array of cell type names for autocomplete
 */
export function useCellTypeSuggestions(): string[] | null {
  const cellTypes = useSelector((state: RootState) => state.controls.cellTypes);

  const suggestions = useMemo(() => {
    if (!cellTypes || cellTypes.length === 0) {
      return null;
    }

    // Extract cell type names from the Redux state
    return cellTypes.map((cellType) => cellType.cellTypeName);
  }, [cellTypes]);

  return suggestions;
}
