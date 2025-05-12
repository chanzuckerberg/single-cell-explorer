import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import ReactDOM from "react-dom";
import memoize from "memoize-one";
import { RootState } from "reducers";
import { useSelector } from "react-redux";
import { SKELETON } from "@blueprintjs/core/lib/esnext/common/classes";
import { useCoverageQuery } from "common/queries/coverage";
import Histogram from "./components/Histogram/Histogram";
import { AccessionsData, TooltipData } from "./types";
import { currentAccessionData } from "./mockData";
import { formatPercent } from "./components/Histogram/ArrayUtils";
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
    // coverageObj format:
    //   [binIndex, averageCoverageDepth, coverageBreadth, numberContigs, numberReads]
    const coverageObj = accessionData.coverage[coverageIndex];
    const binSize = accessionData.coverage_bin_size;

    return [
      {
        name: "Coverage",
        data: [
          [
            "Base Pair Range",
            // \u2013 is en-dash
            `${Math.round(coverageObj[0] * binSize)}\u2013${Math.round(
              (coverageObj[0] + 1) * binSize
            )}`,
          ],
          ["Coverage Depth", `${coverageObj[1]}x`],
          ["Coverage Breadth", formatPercent(coverageObj[2])],
          ["Overlapping Contigs", `${coverageObj[3]}`],
          ["Overlapping Loose Reads", `${coverageObj[4]}`],
        ],
      },
    ];
  }
);

export function CoveragePlot({ svgWidth }: { svgWidth: number }) {
  const [histogramTooltipLocation, setHistogramTooltipLocation] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [histogramTooltipData, setHistogramTooltipData] = useState<
    TooltipData[] | null
  >(null);

  const { bottomPanelHidden } = useSelector((state: RootState) => ({
    bottomPanelHidden: state.controls.bottomPanelHidden,
  }));

  const coverageQuery = useCoverageQuery({
    cellType: "cell",
    chromosome: "chr1",
    options: {
      enabled: !bottomPanelHidden,
      retry: 3,
    },
  });

  const coverageData = useMemo(
    () => ({
      ...currentAccessionData,
      coverage:
        coverageQuery.data?.coveragePlot ?? currentAccessionData.coverage,
    }),
    [coverageQuery.data?.coveragePlot]
  );

  const handleHistogramBarEnter = useCallback(
    (hoverData: [number, number]) => {
      if (hoverData && hoverData[0] === 0) {
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
          innerWidth: svgWidth,
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

  if (coverageQuery.isLoading) {
    return (
      <div
        className={SKELETON}
        style={{
          display: "flex",
          margin: "16px",
          height: "80%",
        }}
      />
    );
  }

  return (
    <>
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
