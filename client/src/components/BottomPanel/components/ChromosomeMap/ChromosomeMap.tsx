import React, { useMemo } from "react";
import { useCoverageQuery } from "common/queries/coverage";
import { SKELETON } from "@blueprintjs/core/lib/esnext/common/classes";
import { useSelector } from "react-redux";
import { RootState } from "reducers";
import { ScaleBar } from "../ScaleBar/ScaleBar";
import { CoveragePlot } from "../CoveragePlot/CoveragePlot";
import { GeneMap } from "../GeneMap/GeneMap";
import { Cytoband } from "../Cytoband/Cytoband";
import { CoverageAtScale } from "./style";

export const ChromosomeMap = () => {
  const chromosome = "chr2";
  const BAR_WIDTH = 8;

  const { bottomPanelHidden, selectedCellTypes } = useSelector(
    (state: RootState) => ({
      bottomPanelHidden: state.controls.bottomPanelHidden,
      selectedCellTypes: state.controls.chromatinSelectedCellTypes,
    })
  );

  const rawCoverageQueries = useCoverageQuery({
    // START: temporary until we have new coverage endpoint
    cellTypes: selectedCellTypes,
    chromosome,
    options: {
      enabled: !bottomPanelHidden,
      retry: 3,
    },
  });

  const isLoading = rawCoverageQueries.some((q) => q.isLoading);
  const isError = rawCoverageQueries.some((q) => q.isError);

  const coverageQueries = useMemo(
    () =>
      // for each query, if the data is not null,
      // shorten the array to the first 56 bins
      rawCoverageQueries.map((q) => {
        if (q.data?.coveragePlot) {
          const shortenedCoveragePlot = q.data.coveragePlot.slice(0, 239);
          return {
            ...q,
            data: {
              ...q.data,
              coveragePlot: shortenedCoveragePlot,
            },
          };
        }
        return q;
      }),
    [rawCoverageQueries]
  );
  // END: temporary until we have new coverage endpoint

  const totalBasePairs = useMemo(
    () =>
      Math.max(
        ...coverageQueries.map((q) => q.data?.coveragePlot.length ?? 0),
        0
      ),
    [coverageQueries]
  );

  const startBasePair = useMemo(() => {
    for (const q of coverageQueries) {
      const plot = q.data?.coveragePlot;
      if (plot && plot.length > 0) {
        const start = plot[0][1]; // startBasePair
        return start;
      }
    }
    return 0;
  }, [coverageQueries]);

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

  const totalKiloBasePairs = (totalBasePairs * binSize) / 1_000;

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
      <Cytoband chromosomeId={chromosome} />
      <CoverageAtScale>
        <ScaleBar
          svgWidth={totalBasePairs * BAR_WIDTH}
          totalMb={totalKiloBasePairs}
          startBasePair={startBasePair}
          marginLeft={15}
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
        />
      </CoverageAtScale>
    </>
  );
};
