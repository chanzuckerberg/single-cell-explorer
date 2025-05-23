import { useQueryClient, useQuery } from "@tanstack/react-query";

const SELECTED_GENE_QUERY_KEY = ["selectedGene"];

export function useChromatinViewerSelectedGene() {
  const queryClient = useQueryClient();

  const defaultGene = "MYC";

  const selectedGeneQuery = useQuery({
    queryKey: SELECTED_GENE_QUERY_KEY,
    queryFn: () => {
      throw new Error("This should not be called");
    },
    initialData: defaultGene,
    enabled: false, // Prevent the query from running
  });

  const setSelectedGene = (gene: string) => {
    queryClient.setQueryData(SELECTED_GENE_QUERY_KEY, gene);
  };

  return {
    selectedGene: selectedGeneQuery.data,
    setSelectedGene,
  };
}
