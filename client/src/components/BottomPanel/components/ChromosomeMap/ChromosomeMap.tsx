import React, { useMemo, useRef, useEffect } from "react";
import { useCoverageQuery } from "common/queries/coverage";
import { SKELETON } from "@blueprintjs/core/lib/esnext/common/classes";
import { useSelector } from "react-redux";
import { RootState } from "reducers";
import { useChromatinViewerSelectedGene } from "common/queries/useChromatinViewerSelectedGene";
import { ScaleBar } from "../ScaleBar/ScaleBar";
import { CoveragePlot } from "../CoveragePlot/CoveragePlot";
import { GeneMap } from "../GeneMap/GeneMap";
import { Cytoband } from "../Cytoband/Cytoband";
import { CoverageAtScale } from "./style";

export const ChromosomeMap = () => {
  const BAR_WIDTH = 6;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { selectedGene } = useChromatinViewerSelectedGene();

  const { bottomPanelHidden, selectedCellTypes } = useSelector(
    (state: RootState) => ({
      bottomPanelHidden: state.controls.bottomPanelHidden,
      selectedCellTypes: state.controls.chromatinSelectedCellTypes,
    })
  );

  const coverageQueries = useCoverageQuery({
    cellTypes: selectedCellTypes,
    geneName: selectedGene,
    genomeVersion: "hg38", // TODO: (smccanny) make this dynamic
    options: {
      enabled: !bottomPanelHidden,
      retry: 3,
    },
  });

  const isLoading = coverageQueries.some((q) => q.isLoading);
  const isError = coverageQueries.some((q) => q.isError);

  const totalBasePairs = useMemo(
    () =>
      Math.max(...coverageQueries.map((q) => q.data?.coverage.length ?? 0), 0),
    [coverageQueries]
  );

  const startBasePair = useMemo(() => {
    for (const q of coverageQueries) {
      const plot = q.data?.coverage;
      if (plot && plot.length > 0) {
        const start = plot[0][1]; // startBasePair
        return start;
      }
    }
    return 0;
  }, [coverageQueries]);

  const endBasePair = useMemo(() => {
    for (const q of coverageQueries) {
      const plot = q.data?.coverage;
      if (plot && plot.length > 0) {
        const end = plot[plot.length - 1][2]; // endBasePair
        return end;
      }
    }
    return 0;
  }, [coverageQueries]);

  const binSize = useMemo(() => {
    for (const q of coverageQueries) {
      const plot = q.data?.coverage;
      if (plot && plot.length > 1) {
        const start = plot[0][1]; // startBasePair
        const end = plot[0][2]; // endBasePair
        return end - start;
      }
    }
    return 0;
  }, [coverageQueries]);

  const totalBPAtScale = (totalBasePairs * binSize) / 1_000; // this gives us a scale in kb

  // Find the selected gene info and calculate its position
  const selectedGeneInfo = useMemo(() => {
    for (const q of coverageQueries) {
      if (q.data?.geneInfo) {
        const gene = q.data.geneInfo.find(
          (g) => g.geneName.toLowerCase() === selectedGene.toLowerCase()
        );
        if (gene) return gene;
      }
    }
    return null;
  }, [coverageQueries, selectedGene]);
  useEffect(() => {
    // Calculate scroll position for the selected gene
    const scrollToGene = () => {
      if (
        !scrollContainerRef.current ||
        !selectedGeneInfo ||
        !startBasePair ||
        !binSize
      ) {
        return;
      }

      // Calculate the pixel position relative to the start of the coverage data
      const relativePosition = selectedGeneInfo.geneStart - startBasePair;
      const pixelPosition = (relativePosition / binSize) * BAR_WIDTH;
      // Subtracting 20px to place the gene nicely in the viewport
      const scrollPosition = Math.max(0, pixelPosition - 20);

      // Smooth scroll to the position
      scrollContainerRef.current.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });
    };

    // Auto-scroll when selected gene changes and data is loaded
    if (selectedGeneInfo && !isLoading && totalBasePairs > 0) {
      // Add a small delay to ensure the DOM is updated
      const timeoutId = setTimeout(scrollToGene, 100);
      return () => clearTimeout(timeoutId);
    }
    return () => {}; // Cleanup function
  }, [selectedGeneInfo, isLoading, totalBasePairs, startBasePair, binSize]);

  if (isLoading) {
    return (
      <div
        className={SKELETON}
        style={{
          display: "flex",
          margin: "16px",
          height: "50px",
        }}
      />
    );
  }

  // TODO: (smccanny) check if this is the error state we want to show
  if (isError) {
    return (
      <div
        className={SKELETON}
        style={{
          display: "flex",
          margin: "16px",
          height: "50px",
        }}
      >
        Error loading data
      </div>
    );
  }

  const coverageData = coverageQueries.map((q) => q.data);
  console.log("coverage Data", coverageData); // TODO: (smccanny) remove this log

  const chromosome = coverageQueries[0]?.data?.chromosome;
  if (!chromosome) {
    return (
      <div
        className={SKELETON}
        style={{
          display: "flex",
          margin: "16px",
          height: "50px",
        }}
      >
        No chromosome data
      </div>
    );
  }
  return (
    <>
      <p>Hello</p>
      <Cytoband chromosomeId={chromosome} />
      <CoverageAtScale ref={scrollContainerRef}>
        <ScaleBar
          svgWidth={totalBasePairs * BAR_WIDTH}
          totalBPAtScale={totalBPAtScale}
          startBasePair={startBasePair}
          marginLeft={25}
          labelScale="kb"
          labelFrequency={1}
        />
        {selectedCellTypes.map((cellType) => (
          <CoveragePlot
            key={cellType}
            chromosome={chromosome}
            svgWidth={totalBasePairs * BAR_WIDTH}
            barWidth={BAR_WIDTH}
            cellType={cellType}
            coverageQuery={coverageQueries.find(
              (q) => q.data?.cellType === cellType
            )}
          />
        ))}
        <GeneMap
          chromosomeId={chromosome}
          svgWidth={totalBasePairs * BAR_WIDTH}
          geneInfo={coverageQueries[0]?.data?.geneInfo ?? undefined}
          startBasePair={startBasePair}
          endBasePair={endBasePair}
        />
      </CoverageAtScale>
    </>
  );
};
