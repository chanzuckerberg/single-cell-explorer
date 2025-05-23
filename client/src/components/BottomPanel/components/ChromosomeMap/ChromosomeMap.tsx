import React, { useMemo } from "react";
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
    genomeVersion: "hg38",
    options: {
      enabled: !bottomPanelHidden,
      retry: 3,
    },
  });

  const isLoading = coverageQueries.some((q) => q.isLoading);
  const isError = coverageQueries.some((q) => q.isError);

  // Start: TEMPORARY UNTIL WE HAVE A SMALLER BIN SIZE
  // const coverageQueries = useMemo(
  //   () =>
  //     // for each query, if the data is not null,
  //     // shorten the array to the first 56 bins
  //     rawCoverageQueries.map((q) => {
  //       if (q.data?.coverage) {
  //         const shortenedCoveragePlot = q.data.coverage.slice(0, 239);
  //         // TEMPORARY UNTIL WE HAVE A SMALLER BIN SIZE
  //         // for each item in shortenedCoveragePlot,
  //         // starting at x =  0, change item[1] to be x and item[2] to be x + binSize
  //         // them x = item[2]
  //         for (let i = 0; i < shortenedCoveragePlot.length; i += 1) {
  //           const item = shortenedCoveragePlot[i];
  //           const binSize = 100; // 100 bp
  //           item[1] = i * binSize;
  //           item[2] = item[1] + binSize;
  //         }
  //         return {
  //           ...q,
  //           data: {
  //             ...q.data,
  //             coverage: shortenedCoveragePlot,
  //           },
  //         };
  //       }
  //       return q;
  //     }),
  //   [rawCoverageQueries]
  // );
  // END: temporary until we have new coverage endpoint

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

  console.log("coverage Queries", coverageQueries);
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
      <Cytoband chromosomeId={chromosome} />
      <CoverageAtScale>
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
