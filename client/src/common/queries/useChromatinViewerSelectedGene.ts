import { useQueryClient, useQuery } from "@tanstack/react-query";

const SELECTED_GENE_QUERY_KEY = ["selectedGene"];

export function useChromatinViewerSelectedGene() {
  const queryClient = useQueryClient();

  const selectedGeneQuery = useQuery({
    queryKey: SELECTED_GENE_QUERY_KEY,
    queryFn: () => null, // default value
    initialData: null,
  });

  const setSelectedGene = (gene: string) => {
    queryClient.setQueryData(SELECTED_GENE_QUERY_KEY, gene);
  };

  return {
    selectedGene: selectedGeneQuery.data,
    setSelectedGene,
  };
}
