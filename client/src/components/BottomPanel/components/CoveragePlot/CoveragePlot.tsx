import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import ReactDOM from "react-dom";
import memoize from "memoize-one";
import { CoveragePlotData } from "common/queries/coverage";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "reducers";
import { Button } from "@czi-sds/components";
import {
  primitiveGray300,
  primitiveGray500,
} from "components/BottomPanel/constants";
import Histogram from "./components/Histogram/Histogram";
import { AccessionsData, TooltipData } from "./types";
import { getTooltipStyle } from "./components/TooltipVizTable/utils";
import { TooltipVizTable } from "./components/TooltipVizTable/TooltipVizTable";
import cs from "./style.module.scss";
import { CellTypeDropdown } from "./components/CellTypeDropdown/CellTypeDropdown";

const generateCoverageVizData = (
  coverageData: AccessionsData["coverage"],
  coverageBinSize: number
) =>
  coverageData.map((valueArr) => ({
    x0: valueArr[0] * coverageBinSize - 1, // This is the start of the bin, minus 1 for correct alignment.
    length: valueArr[1], // Actually the height. This is a d3-histogram naming convention.
  }));

// Gets called on every mouse move, so need to memoize.
export const getHistogramTooltipData = memoize(
  (accessionData: AccessionsData, coverageIndex: number): TooltipData[] => {
    const coverageObj = accessionData.coverage[coverageIndex];

    return [
      {
        name: "Chromatin Accessibility", // not shown in tooltip
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
  barWidth,
  yMax,
}: {
  svgWidth: number;
  chromosome: string;
  cellType: string;
  barWidth: number;
  coverageQuery: [number, number, number][];
  yMax: number;
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
    if (!coverageQuery) {
      return {};
    }
    const coverage = transformData(coverageQuery);
    return {
      coverage_bin_size: 1, // this is required for the histogram to render correctly - there should be a better name for this.
      total_length: coverageQuery.length,
      coverage,
    };
  }, [coverageQuery, chromosome, cellType]);

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

  const histogramRef = useRef<HTMLDivElement>(null);
  const yAxisRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!histogramRef.current) return;
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

      const options = {
        domain: [0, data.total_length],
        skipBins: true,
        numBins: Math.round(data.total_length / data.coverage_bin_size),
        showStatistics: false,
        colors: [primitiveGray300],
        hoverColors: [primitiveGray500],
        xTickValues: [],
        yTickFormat: formatTick,
        numTicksY: 2,
        yMax,
        barOpacity: 1,
        height: 70,
        margins: {
          left: 40,
          right: 10,
          top: 10,
          bottom: 5,
        },
        innerWidth: data.total_length * barWidth,
        labelsLarge: false,
        onHistogramBarHover: handleHistogramBarHover,
        onHistogramBarEnter: handleHistogramBarEnter,
        onHistogramBarExit: handleHistogramBarExit,
      };

      const coverageViz = new Histogram(
        histogramRef.current,
        [coverageVizData],
        options
      );

      coverageViz.update();
      coverageViz.renderYAxisOnly(yAxisRef.current);
    };
    renderHistogram(coverageData);
  }, [coverageData, yMax, handleHistogramBarEnter, svgWidth, barWidth]);

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

  const dispatch = useDispatch();
  const { selectedCellTypes } = useSelector((state: RootState) => ({
    selectedCellTypes: state.controls.chromatinSelectedCellTypes,
  }));

  return (
    <div className={cs.coverageVizWrapper}>
      <CellTypeDropdown cellType={cellType} />
      {selectedCellTypes.length > 1 && (
        <Button
          className={cs.trashButton}
          sdsStyle="icon"
          sdsType="tertiary"
          sdsSize="small"
          icon="TrashCan"
          onClick={() =>
            dispatch({
              type: "toggle chromatin histogram",
              removeCellType: cellType,
            })
          }
        />
      )}

      <div className={cs.coverageVizContainer}>
        <div
          ref={yAxisRef}
          style={{
            position: "absolute",
            zIndex: 10,
            left: 0,
            backgroundColor: "white",
          }}
        />
        <div ref={histogramRef} />
      </div>

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
