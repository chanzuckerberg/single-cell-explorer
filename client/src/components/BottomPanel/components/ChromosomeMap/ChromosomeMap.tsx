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

  const coverageQuery = useCoverageQuery({
    cellTypes: selectedCellTypes,
    geneName: formatSelectedGenes,
    genomeVersion: "hg38", // TODO: (smccanny) make this dynamic
    options: {
      enabled: !bottomPanelHidden && selectedCellTypes.length > 0,
      retry: 3,
    },
  });

  const { isLoading, isError } = coverageQuery;

  const totalBasePairs = useMemo(() => {
    const coverageByCellType = coverageQuery.data?.coverageByCellType;
    if (!coverageByCellType) return 0;

    return Math.max(
      ...Object.values(coverageByCellType).map((coverage) => coverage.length),
      0
    );
  }, [coverageQuery.data?.coverageByCellType]);

  const startBasePair = useMemo(() => {
    const coverageByCellType = coverageQuery.data?.coverageByCellType;
    if (!coverageByCellType) return 0;

    for (const coverage of Object.values(coverageByCellType)) {
      if (coverage.length > 0) {
        return coverage[0][1]; // the second element in [value, start, end]
      }
    }

    return 0;
  }, [coverageQuery.data?.coverageByCellType]);

  const endBasePair = useMemo(() => {
    const coverageByCellType = coverageQuery.data?.coverageByCellType;
    if (!coverageByCellType) return 0;

    for (const coverage of Object.values(coverageByCellType)) {
      if (coverage.length > 0) {
        return coverage[coverage.length - 1][2]; // third value = end base pair
      }
    }

    return 0;
  }, [coverageQuery.data?.coverageByCellType]);

  const binSize = useMemo(() => {
    const coverageByCellType = coverageQuery.data?.coverageByCellType;
    if (!coverageByCellType) return 0;

    for (const coverage of Object.values(coverageByCellType)) {
      if (coverage.length > 0) {
        // Destructure the first coverage tuple to get start and end base pairs
        const [, start, end] = coverage[0];
        return end - start;
      }
    }
    return 0;
  }, [coverageQuery.data?.coverageByCellType]);

  const totalBPAtScale = (totalBasePairs * binSize) / 1_000; // this gives us a scale in kb

  // Find the selected gene info from the query result
  const selectedGeneInfo = useMemo(() => {
    const geneInfoArray = coverageQuery.data?.geneInfo;

    if (geneInfoArray) {
      const gene = geneInfoArray.find(
        (g) => g.geneName.toLowerCase() === selectedGene.toLowerCase()
      );
      if (gene) return gene;
    }
    return null;
  }, [coverageQuery.data?.geneInfo, selectedGene]);

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

  const yMax = useMemo(() => {
    const coverageByCellType = coverageQuery.data?.coverageByCellType;
    if (!coverageByCellType) return 0;

    let maxY = 0;

    for (const coverage of Object.values(coverageByCellType)) {
      for (const [value] of coverage) {
        if (value > maxY) {
          maxY = value;
        }
      }
    }

    return Math.ceil(maxY);
  }, [coverageQuery.data?.coverageByCellType]);

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

  const chromosome = coverageQuery?.data?.chromosome;
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
            coverageQuery={
              coverageQuery.data?.coverageByCellType?.[cellType] ?? []
            }
          />
        ))}

        <GeneMap
          svgWidth={totalBasePairs * BAR_WIDTH}
          geneInfo={coverageQuery?.data?.geneInfo ?? undefined}
          startBasePair={startBasePair}
          endBasePair={endBasePair}
          formatSelectedGenes={formatSelectedGenes}
        />
      </CoverageToScale>
    </>
  );
};
