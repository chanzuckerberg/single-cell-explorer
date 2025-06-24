import React, { useState, useMemo, useRef, useEffect } from "react";
import { useCoverageQuery } from "common/queries/coverage";
import { useSelector } from "react-redux";
import { RootState } from "reducers";
import { useChromatinViewerSelectedGene } from "common/hooks/useChromatinViewerSelectedGene";
import { formatSelectedGene } from "../../utils";
import { ScaleBar } from "../ScaleBar/ScaleBar";
import { ScaleBarYAxis } from "../ScaleBar/ScaleBarYAxis";
import { CoveragePlot } from "../CoveragePlot/CoveragePlot";
import { GeneMap } from "../GeneMap/GeneMap";
import { CoverageToScale } from "./style";
import { LoadingSkeleton } from "./components/LoadingSkeleton/LoadingSkeleton";

export const ChromosomeMap = () => {
  const BAR_WIDTH = 6; // Width of each bar in the coverage plot, adjustable as desired
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const savedScrollPosition = useRef<number>(0);

  const [shouldRestoreScroll, setShouldRestoreScroll] = useState(false);
  const [previousCellTypes, setPreviousCellTypes] = useState<string[]>([]);
  const [lastScrolledGene, setLastScrolledGene] = useState<string>("");

  const { selectedGene } = useChromatinViewerSelectedGene();
  const selectedGeneFormatted = formatSelectedGene(selectedGene);

  const { bottomPanelHidden, selectedCellTypes } = useSelector(
    (state: RootState) => ({
      bottomPanelHidden: state.controls.bottomPanelHidden,
      selectedCellTypes: state.controls.chromatinSelectedCellTypes,
    })
  );

  const { genomeVersion } = useChromatinViewerSelectedGene();
  const coverageQuery = useCoverageQuery({
    cellTypes: selectedCellTypes,
    geneName: selectedGeneFormatted,
    genomeVersion,
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
        return coverage[0][1];
      }
    }
    return 0;
  }, [coverageQuery.data?.coverageByCellType]);

  const endBasePair = useMemo(() => {
    const coverageByCellType = coverageQuery.data?.coverageByCellType;
    if (!coverageByCellType) return 0;

    for (const coverage of Object.values(coverageByCellType)) {
      if (coverage.length > 0) {
        return coverage[coverage.length - 1][2];
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

  // add an event listener to the scroll container to save scroll position
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const handleScroll = (scrollContainerCurrent: HTMLDivElement) => {
      console.log(
        "Scroll position changed:",
        scrollContainerCurrent.scrollLeft
      );
      savedScrollPosition.current = scrollContainerCurrent.scrollLeft;
    };

    if (scrollContainer && !isLoading && totalBasePairs > 0) {
      const onScroll = () => handleScroll(scrollContainer);
      scrollContainer.addEventListener("scroll", onScroll);

      return () => {
        scrollContainer.removeEventListener("scroll", onScroll);
      };
    }

    return () => {};
  }, [isLoading, totalBasePairs]);

  // Detect cell type changes and mark for scroll restoration
  useEffect(() => {
    const currentCellTypes = selectedCellTypes || [];
    console.log("Current cell types:", currentCellTypes);
    console.log("Previous cell types:", previousCellTypes);
    // Check if cell types actually changed
    const cellTypesChanged =
      previousCellTypes.length !== currentCellTypes.length ||
      !previousCellTypes.every((ct) => currentCellTypes.includes(ct)) ||
      !currentCellTypes.every((ct) => previousCellTypes.includes(ct));

    console.log("Cell types changed:", cellTypesChanged);

    if (cellTypesChanged && previousCellTypes.length !== 0) {
      setShouldRestoreScroll(true);
    }

    if (cellTypesChanged) {
      setPreviousCellTypes([...currentCellTypes]);
    }
  }, [selectedCellTypes, previousCellTypes]);

  useEffect(() => {
    const getSelectedGeneInfo = (geneName: string) => {
      const geneInfoArray = coverageQuery.data?.geneInfo;
      if (geneInfoArray) {
        const gene = geneInfoArray.find(
          (g) => g.geneName.toLowerCase() === geneName.toLowerCase()
        );
        if (gene) return gene;
      }
      return null;
    };

    if (!isLoading && totalBasePairs > 0) {
      if (shouldRestoreScroll) {
        console.log("Restoring scroll position:", savedScrollPosition.current);
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = savedScrollPosition.current;
            setShouldRestoreScroll(false);
          }
        });
        return () => {};
      }
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
    }

    return () => {};
  }, [
    shouldRestoreScroll,
    selectedGeneFormatted,
    lastScrolledGene,
    isLoading,
    totalBasePairs,
    coverageQuery.data?.geneInfo,
  ]);

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

  if (isError) {
    return (
      <div
        style={{
          display: "flex",
          margin: "16px",
          height: "50px",
        }}
      >
        Error loading chromosome data
      </div>
    );
  }

  const chromosome = coverageQuery?.data?.chromosome;
  if (!chromosome && !isLoading) {
    return (
      <div
        style={{
          display: "flex",
          margin: "16px",
          height: "50px",
        }}
      >
        No chromosome data available
      </div>
    );
  }
  return (
    <CoverageToScale ref={scrollContainerRef}>
      <div className="margin-overlay" />

      {!isLoading && (
        <ScaleBarYAxis labelScale="kb" startBasePair={startBasePair} />
      )}

      {isLoading ? (
        <LoadingSkeleton height="30px" marginBottom="7px" />
      ) : (
        <ScaleBar
          svgWidth={totalBasePairs * BAR_WIDTH}
          totalBPAtScale={totalBPAtScale}
          startBasePair={startBasePair}
          marginLeft={25}
          labelScale="kb"
          showYAxis
          labelFrequency={5}
        />
      )}
      {selectedCellTypes.length === 0 && isLoading && (
        <LoadingSkeleton height="112px" marginBottom="13px" />
      )}
      {selectedCellTypes.length > 0 &&
        selectedCellTypes.map((cellType) => (
          <CoveragePlot
            key={cellType}
            isLoading={isLoading}
            chromosome={chromosome ?? null}
            svgWidth={totalBasePairs * BAR_WIDTH}
            barWidth={BAR_WIDTH}
            yMax={yMax}
            cellType={cellType}
            coverageQuery={
              coverageQuery.data?.coverageByCellType?.[cellType] ?? []
            }
          />
        ))}

      {isLoading ? (
        <LoadingSkeleton height="46px" marginTop="13px" />
      ) : (
        <GeneMap
          svgWidth={totalBasePairs * BAR_WIDTH}
          geneInfo={coverageQuery?.data?.geneInfo ?? undefined}
          startBasePair={startBasePair}
          endBasePair={endBasePair}
          formatSelectedGenes={selectedGeneFormatted}
        />
      )}
    </CoverageToScale>
  );
};
