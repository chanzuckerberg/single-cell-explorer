import React, { useMemo } from "react";
import { useCoverageQuery } from "common/queries/coverage";
import { SKELETON } from "@blueprintjs/core/lib/esnext/common/classes";
import { useSelector } from "react-redux";
import { RootState } from "reducers";
import { ScaleBar } from "../ScaleBar/ScaleBar";
import { Cytoband } from "../Cytoband/Cytoband";
import { CoveragePlot } from "../CoveragePlot/CoveragePlot";

export const ChromosomeMap = () => {
  const chromosome = "chr2";

  const { bottomPanelHidden, selectedCellTypes } = useSelector((state: RootState) => ({
    bottomPanelHidden: state.controls.bottomPanelHidden,
    selectedCellTypes: state.controls.chromatinSelectedCellTypes,
  }));

  const coverageQueries = useCoverageQuery({
    cellTypes: selectedCellTypes,
    chromosome,
    options: {
      enabled: !bottomPanelHidden,
      retry: 3,
    },
  });

  const isLoading = coverageQueries.some((q) => q.isLoading);
  const isError = coverageQueries.some((q) => q.isError);

  const totalBasePairs = useMemo(
    () =>
      Math.max(
        ...coverageQueries.map((q) => q.data?.coveragePlot.length ?? 0),
        0
      ),
    [coverageQueries]
  );

  const binSize = useMemo(() => {
    for (const q of coverageQueries) {
      const plot = q.data?.coveragePlot;
      if (plot && plot.length > 1) {
        const start = plot[0][1]; // startBasePair
        const end = plot[0][2]; // endBasePair
        return end - start;
      }
    }
    return 0;
  }, [coverageQueries]);

  const totalMegaBasePairs = (totalBasePairs * binSize) / 1_000_000;

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

  return (
    <>
      <ScaleBar svgWidth={totalBasePairs} totalMb={totalMegaBasePairs} />
      <Cytoband chromosomeId={chromosome} svgWidth={totalBasePairs} />
      {selectedCellTypes.map((cellType) => (
        <CoveragePlot
          key={cellType}
          chromosome={chromosome}
          svgWidth={totalBasePairs}
          cellType={cellType}
          coverageQuery={coverageQueries.find(
            (q) => q.data?.cellType === cellType
          )}
        />
      ))}
    </>
  );
};
