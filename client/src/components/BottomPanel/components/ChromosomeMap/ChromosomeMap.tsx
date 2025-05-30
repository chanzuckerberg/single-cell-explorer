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
import { CoverageToScale } from "./style";

export const ChromosomeMap = () => {
  const BAR_WIDTH = 6; // Width of each bar in the coverage plot, adjust as needed
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { selectedGene } = useChromatinViewerSelectedGene();

  const { bottomPanelHidden, selectedCellTypes } = useSelector(
    (state: RootState) => ({
      bottomPanelHidden: state.controls.bottomPanelHidden,
      selectedCellTypes: state.controls.chromatinSelectedCellTypes,
    })
  );

  const parts = selectedGene.split("_");
  const formatSelectedGenes =
    parts.length <= 1 ? selectedGene : parts.slice(0, -1).join("_");

  const coverageQueries = useCoverageQuery({
    cellTypes: selectedCellTypes,
    geneName: formatSelectedGenes,
    genomeVersion: "hg38", // TODO: (smccanny) make this dynamic from organism
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
    if (selectedGeneInfo && !isLoading && totalBasePairs > 0) {
      const timeoutId = setTimeout(() => {
        const geneId = `${selectedGeneInfo.geneName}-label`;
        const geneElement = scrollContainerRef.current?.querySelector(
          `#${geneId}`
        );

        if (geneElement) {
          geneElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          });
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
    return () => {};
  }, [selectedGeneInfo, isLoading, totalBasePairs]);

  const yMax = useMemo(
    () =>
      Math.max(
        ...coverageQueries.map((q) => {
          const coverage = q.data?.coverage;
          if (!coverage || coverage.length === 0) return 0;
          return Math.ceil(Math.max(...coverage.map((c) => c[0]))); // Get the max y value
        }),
        0 // Ensure we return at least 0
      ),
    [coverageQueries]
  );

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
      <Cytoband
        chromosomeId={chromosome}
        startBasePair={startBasePair}
        endBasePair={endBasePair}
      />
      <CoverageToScale ref={scrollContainerRef}>
        <div className="margin-overlay" />
        <ScaleBar
          svgWidth={totalBasePairs * BAR_WIDTH}
          totalBPAtScale={totalBPAtScale}
          startBasePair={startBasePair}
          marginLeft={25}
          labelScale="kb"
          labelFrequency={2}
        />
        {selectedCellTypes.map((cellType) => (
          <CoveragePlot
            key={cellType}
            chromosome={chromosome}
            svgWidth={totalBasePairs * BAR_WIDTH}
            barWidth={BAR_WIDTH}
            yMax={yMax}
            cellType={cellType}
            coverageQuery={coverageQueries.find(
              (q) => q.data?.cellType === cellType
            )}
          />
        ))}
        <GeneMap
          svgWidth={totalBasePairs * BAR_WIDTH}
          geneInfo={coverageQueries[0]?.data?.geneInfo ?? undefined}
          startBasePair={startBasePair}
          endBasePair={endBasePair}
          formatSelectedGenes={formatSelectedGenes}
        />
      </CoverageToScale>
    </>
  );
};
