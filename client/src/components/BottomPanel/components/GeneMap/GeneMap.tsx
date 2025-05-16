import React from "react";
// import { useChromatinViewerSelectedGene } from "common/queries/useChromatinViewerSelectedGene";
// import { useGeneInfoQuery } from "common/queries/useGenomeReferenceInfo";

export const GeneMap = ({
  chromosomeId,
  svgWidth,
}: {
  chromosomeId: string;
  svgWidth: number;
}) => {
  console.log("GeneMap sees:", { chromosomeId, svgWidth });
  // const { selectedGene } = useChromatinViewerSelectedGene();
  // const { data, isLoading, isError, error } = useGeneInfoQuery({
  //   geneName: selectedGene,
  //   genomeVersion: "hg38",
  //   options: {
  //     enabled: true,
  //     retry: 3,
  //   },
  // });
  // if (isLoading) {
  //   return <div>Loading...</div>;
  // }
  // if (isError) {
  //   console.error("Error fetching gene info:", error);
  //   return <div>Error loading gene info</div>;
  // }
  // const geneInfo = data;
  // if (!geneInfo) {
  //   return <div>No gene info available</div>;
  // }
  // console.log("GeneMap sees geneInfo:", geneInfo);
  // const grouped = groupGenesByStrandAndBins(geneInfo.allGenesOnChromosome);
  // console.log("GeneMap sees grouped:", grouped);
  return (
    <div>
      <div>{/* <strong>Selected Gene:</strong> {geneInfo.selectedGene} */}</div>
      {/* <GeneListByMb geneInfo={geneInfo}/> */}
    </div>
  );
};

//   function GeneListByMb({ geneInfo }) {
//   const groupedGenes = useMemo(() => {
//     if (!geneInfo?.allGenesOnChromosome) return [];

//     const result = [];
//     let currentBin = null;

//      // For each gene, sort it into two arrays based on strand (+/-).
//      // Within each strand array, further sort it by rows that do not overlap so if the first gene starts at 1 and ends at 5 and the second gene starts at 6 and ends at 10, they will be in the same bin.
//     // If the second gene starts at 4 and ends at 10, it will be in a different bin.

//      for (const [geneName, gene] of geneInfo.allGenesOnChromosome) {
//       const geneMbBin = Math.floor(gene.geneStart / 5_000_000);

//       if (geneMbBin !== currentBin) {
//         currentBin = geneMbBin;
//         result.push({
//           heading: `${currentBin * 5}–${(currentBin + 1) * 5} Mb`,
//         });
//       }

//       result.push({ geneName, gene });
//     }

//     return result;
//   }, [geneInfo]);

//   return (
//     <ol style={{ overflowY: "scroll", maxHeight: "300px" }}>
//       {groupedGenes.map((item, index) =>
//         item.heading ? (
//           <li key={`heading-${index}`} style={{ marginTop: "0.5em", fontWeight: "bold", listStyleType: "none", marginLeft: "-35px", fontSize: "18px" }}>
//             {item.heading}
//           </li>
//         ) : (
//           <li key={item.geneName}>
//             <strong>{item.geneName}</strong>: {item.gene.geneChromosome}:
//             {item.gene.geneStart}-{item.gene.geneEnd}
//           </li>
//         )
//       )}
//     </ol>
//   );
// }

// interface GeneInfo {
//   geneName: string;
//   geneChromosome: string;
//   geneStart: number;
//   geneEnd: number;
//   geneStrand: "+" | "-";
// }

// interface BinnedGenes {
//   plus: GeneInfo[][];
//   minus: GeneInfo[][];
// }

// function binNonOverlappingGenes(genes: GeneInfo[]): GeneInfo[][] {
//   const bins: GeneInfo[][] = [];

//   for (const gene of genes) {
//     let placed = false;

//     for (const bin of bins) {
//       const lastGeneInBin = bin[bin.length - 1];
//       if (lastGeneInBin.geneEnd < gene.geneStart) {
//         bin.push(gene);
//         placed = true;
//         break;
//       }
//     }

//     if (!placed) {
//       bins.push([gene]);
//     }
//   }

//   return bins;
// }

// function groupGenesByStrandAndBins(genes: GeneInfo[]): BinnedGenes {
//   console.log("groupGenesByStrandAndBins", genes);
//   const plusStrandGenes = genes.filter((g) => g.geneStrand === "+");
//   const minusStrandGenes = genes.filter((g) => g.geneStrand === "-");

//   // Sort each strand by geneStart first (important!)
//   plusStrandGenes.sort((a, b) => a.geneStart - b.geneStart);
//   minusStrandGenes.sort((a, b) => a.geneStart - b.geneStart);

//   return {
//     plus: binNonOverlappingGenes(plusStrandGenes),
//     minus: binNonOverlappingGenes(minusStrandGenes),
//   };
// }
