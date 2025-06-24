import React, { useRef, useEffect } from "react";
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
import { useCoverageData } from "./hooks/useCoverageData";
import { useGeneScrolling } from "./hooks/useGeneScrolling";
import { useScrollPreservation } from "./hooks/useScrollPreservation";
import { ErrorState } from "./components/ErrorState/ErrorState";

export const ChromosomeMap = () => {
  const BAR_WIDTH = 6; // Width of each bar in the coverage plot, adjustable as desired
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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

  const { totalBasePairs, startBasePair, endBasePair, yMax, totalBPAtScale } =
    useCoverageData(coverageQuery);

  const { shouldRestoreScroll, restoreScrollPosition, isRestoringScroll } =
    useScrollPreservation(
      scrollContainerRef,
      isLoading,
      totalBasePairs,
      selectedCellTypes
    );

  const { scrollToGene } = useGeneScrolling(
    scrollContainerRef,
    selectedGeneFormatted,
    coverageQuery.data?.geneInfo
  );

  useEffect(() => {
    if (!isLoading && totalBasePairs > 0) {
      if (shouldRestoreScroll) {
        restoreScrollPosition();
        return () => {};
      }

      if (!isRestoringScroll) {
        return scrollToGene();
      }
    }
    return () => {};
  }, [
    shouldRestoreScroll,
    isRestoringScroll,
    selectedGeneFormatted,
    isLoading,
    totalBasePairs,
    restoreScrollPosition,
    scrollToGene,
  ]);

  // Error states
  if (isError) return <ErrorState>Error loading chromosome data</ErrorState>;
  if (!coverageQuery?.data?.chromosome && !isLoading)
    return <ErrorState>No chromosome data available</ErrorState>;

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
            chromosome={coverageQuery?.data?.chromosome ?? null}
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
