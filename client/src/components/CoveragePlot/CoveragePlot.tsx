import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { H2 } from "@blueprintjs/core";
import memoize from "memoize-one";
import Histogram from "./components/Histogram/Histogram";
import { AccessionsData, TooltipData } from "./types";
import { currentAccessionData } from "./mockData";
import { formatPercent } from "./components/Histogram/ArrayUtils";
import { getTooltipStyle } from "./components/TooltipVizTable/utils";
import { TooltipVizTable } from "./components/TooltipVizTable/TooltipVizTable";
import cs from "./style.module.scss";

export const READ_FILL_COLOR = "#A9BDFC";
export const CONTIG_FILL_COLOR = "#3867FA";

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

export function CoveragePlot() {
  const [histogramTooltipLocation, setHistogramTooltipLocation] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [histogramTooltipData, setHistogramTooltipData] = useState<
    TooltipData[] | null
  >(null);

  const coverageVizContainer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!coverageVizContainer.current) return;

    const renderHistogram = (data: AccessionsData) => {
      const coverageVizData = generateCoverageVizData(
        data.coverage,
        data.coverage_bin_size
      );

      const coverageViz = new Histogram(
        coverageVizContainer.current,
        [coverageVizData],
        {
          labelY: "Coverage",
          domain: [0, data.total_length],
          skipBins: true,
          numBins: Math.round(data.total_length / data.coverage_bin_size),
          showStatistics: false,
          colors: [READ_FILL_COLOR],
          hoverColors: [CONTIG_FILL_COLOR],
          barOpacity: 1,
          margins: {
            left: 50,
            right: 40,
            top: 30,
            bottom: 30,
          },
          numTicksY: 2,
          labelYHorizontalOffset: 15,
          labelsLarge: false,
          onHistogramBarHover: handleHistogramBarHover,
          onHistogramBarEnter: handleHistogramBarEnter,
          onHistogramBarExit: handleHistogramBarExit,
        }
      );
      coverageViz.update();
    };
    renderHistogram(currentAccessionData);
  }, []);

  const handleHistogramBarEnter = (hoverData: [number, number]) => {
    if (hoverData && hoverData[0] === 0) {
      setHistogramTooltipData(
        getHistogramTooltipData(currentAccessionData, hoverData[1])
      );
    }
  };

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
    <div>
      <header>
        <H2>Cell Name</H2>
      </header>
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
    </div>
  );
}
