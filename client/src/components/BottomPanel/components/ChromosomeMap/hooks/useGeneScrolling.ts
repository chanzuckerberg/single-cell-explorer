import { useCallback, useState } from "react";
import { GeneInfo } from "common/queries/coverage";

export const useGeneScrolling = (
  scrollContainerRef: React.RefObject<HTMLDivElement>,
  selectedGeneFormatted: string,
  geneInfo: GeneInfo[] | undefined
) => {
  const [lastScrolledGene, setLastScrolledGene] = useState<string>("");

  const getSelectedGeneInfo = useCallback(
    (geneName: string) => {
      if (geneInfo) {
        const gene = geneInfo.find(
          (g) => g.geneName.toLowerCase() === geneName.toLowerCase()
        );
        return gene || null;
      }
      return null;
    },
    [geneInfo]
  );

  const scrollToGene = useCallback(() => {
    if (selectedGeneFormatted && selectedGeneFormatted !== lastScrolledGene) {
      const timeoutId = setTimeout(() => {
        const geneLabel = `${selectedGeneFormatted}-label`;
        const geneElement = scrollContainerRef.current?.querySelector(
          `#${geneLabel}`
        );
        const selectedGeneInfo = getSelectedGeneInfo(selectedGeneFormatted);

        if (geneElement) {
          geneElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: selectedGeneInfo?.geneStrand === "+" ? "start" : "end",
          });
          setLastScrolledGene(selectedGeneFormatted);
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
    return () => {};
  }, [
    selectedGeneFormatted,
    lastScrolledGene,
    scrollContainerRef,
    getSelectedGeneInfo,
  ]);

  return { scrollToGene, lastScrolledGene };
};
