import { H4 } from "@blueprintjs/core";
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import ReactDOM from "react-dom";
import memoize from "memoize-one";
import { UseQueryResult } from "@tanstack/react-query";
import {
  CoveragePlotData,
  FetchCoverageResponse,
} from "common/queries/coverage";
import Histogram from "./components/Histogram/Histogram";
import { AccessionsData, TooltipData } from "./types";
import { getTooltipStyle } from "./components/TooltipVizTable/utils";
import { TooltipVizTable } from "./components/TooltipVizTable/TooltipVizTable";
import cs from "./style.module.scss";

export const READ_FILL_COLOR = "#CCCCCC";
export const CONTIG_FILL_COLOR = "#767676";

const generateCoverageVizData = (
  coverageData: AccessionsData["coverage"],
  coverageBinSize: number
) =>
  coverageData.map((valueArr) => ({
    x0: valueArr[0] * coverageBinSize,
    length: valueArr[1], // Actually the height. This is a d3-histogram naming convention.
  }));

// Gets called on every mouse move, so need to memoize.
export const getHistogramTooltipData = memoize(
  (accessionData: AccessionsData, coverageIndex: number): TooltipData[] => {
    const coverageObj = accessionData.coverage[coverageIndex];

    return [
      {
        name: "Chromatin Accessibility",
        data: [
          ["Cell Type", `${coverageObj[3]}`],
          ["ChromosomeID", coverageObj[2]],
          ["Bin Size", `${coverageObj[4]}`],
          ["Tn5 Insertions", `${coverageObj[1]}`],
        ],
      },
    ];
  }
);

export function CoveragePlot({
  svgWidth,
  chromosome,
  cellType,
  coverageQuery,
}: {
  svgWidth: number;
  chromosome: string;
  cellType: string;
  coverageQuery: UseQueryResult<FetchCoverageResponse> | undefined;
}) {
  const [histogramTooltipLocation, setHistogramTooltipLocation] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [histogramTooltipData, setHistogramTooltipData] = useState<
    TooltipData[] | null
  >(null);

  const coverageData = useMemo(() => {
    function transformData(data: CoveragePlotData): AccessionsData["coverage"] {
      return data.map((item, index) => {
        const barIndex = item[0];
        const chromosomeId = `${chromosome}:${item[1]}-${item[2]}`;
        const binSize = item[2] - item[1];

        return [index + 1, barIndex, chromosomeId, cellType, binSize];
      });
    }
    if (!coverageQuery?.data?.coveragePlot) {
      return {};
    }
    const coverage = transformData(coverageQuery.data.coveragePlot);
    return {
      coverage_bin_size: 1, // this is required for the histogram to render correctly - there should be a better name for this.
      total_length: coverageQuery.data.coveragePlot.length,
      coverage,
    };
  }, [coverageQuery?.data?.coveragePlot, chromosome, cellType]);

  const handleHistogramBarEnter = useCallback(
    (hoverData: [number, number]) => {
      if (hoverData && hoverData[0] === 0 && coverageData.coverage) {
        setHistogramTooltipData(
          getHistogramTooltipData(coverageData, hoverData[1])
        );
      }
    },
    [coverageData]
  );

  const coverageVizContainer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!coverageVizContainer.current) return;
    if (!coverageData.coverage) return;

    const renderHistogram = (data: AccessionsData) => {
      const coverageVizData = generateCoverageVizData(
        data.coverage,
        data.coverage_bin_size
      );

      const formatTick = (n: number) => {
        if (n >= 1_000_000_000) return `${Math.round(n / 1_000_000_000)}B`;
        if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
        if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
        return n.toString();
      };

      const coverageViz = new Histogram(
        coverageVizContainer.current,
        [coverageVizData],
        {
          domain: [0, data.total_length],
          skipBins: true,
          numBins: Math.round(data.total_length / data.coverage_bin_size),
          showStatistics: false,
          colors: [READ_FILL_COLOR],
          hoverColors: [CONTIG_FILL_COLOR],
          xTickValues: [],
          yTickFormat: formatTick,
          barOpacity: 1,
          margins: {
            left: 40,
            right: 10,
            top: 10,
            bottom: 5,
          },
          innerWidth: data.total_length,
          numTicksY: 1,
          labelsLarge: false,
          onHistogramBarHover: handleHistogramBarHover,
          onHistogramBarEnter: handleHistogramBarEnter,
          onHistogramBarExit: handleHistogramBarExit,
        }
      );
      coverageViz.update();
    };
    renderHistogram(coverageData);
  }, [coverageData, handleHistogramBarEnter, svgWidth]);

  const handleHistogramBarHover = (clientX: number, clientY: number): void => {
    setHistogramTooltipLocation({
      left: clientX,
      top: clientY,
    });
  };

  const handleHistogramBarExit = () => {
    setHistogramTooltipLocation(null);
    setHistogramTooltipData(null);
  };

  return (
    <>
      <H4>{cellType}</H4>
      <div ref={coverageVizContainer} />
      {histogramTooltipLocation &&
        histogramTooltipData &&
        ReactDOM.createPortal(
          <div
            style={getTooltipStyle(histogramTooltipLocation)}
            className={cs.hoverTooltip}
          >
            <TooltipVizTable data={histogramTooltipData} />
          </div>,
          document.body
        )}
    </>
  );
}
