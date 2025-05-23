import { useQueryClient, useQuery } from "@tanstack/react-query";

const SELECTED_GENE_QUERY_KEY = ["selectedGene"];

export function useChromatinViewerSelectedGene() {
  const queryClient = useQueryClient();

  const defaultGene = "MYC";

  const selectedGeneQuery = useQuery({
    queryKey: SELECTED_GENE_QUERY_KEY,
    queryFn: () => defaultGene, // return default value
    initialData: defaultGene,
  });

  const setSelectedGene = (gene: string) => {
    queryClient.setQueryData(SELECTED_GENE_QUERY_KEY, gene);
  };

  return {
    selectedGene: selectedGeneQuery.data,
    setSelectedGene,
  };
}
