import React, { useEffect } from "react";
import * as d3 from "d3";
import {
  baseBorderSecondary,
  smallGraphFontSize,
  semanticTextTertiary,
} from "components/BottomPanel/constants";

const TICK_LENGTH = 6;

// Function to format labels based on scale and increment properly
const formatLabel = (
  tickValue: number,
  labelScale: string,
  startBasePair: number
) => {
  if (tickValue === 0) return "";

  // Determine increment based on label scale
  let increment;
  let formatValue;

  switch (labelScale.toLowerCase()) {
    case "kb":
      increment = 1; // increment by 1 kb (which is 1000 bp)
      formatValue = Math.round((startBasePair + tickValue * 1000) / 1000);
      return `${formatValue.toString()}`;

    case "mb":
      increment = 0.001; // increment by 0.001 mb (which is 1000 bp)
      formatValue = ((startBasePair + tickValue * 1000) / 1000000).toFixed(3);
      return `${formatValue.toString()}`;

    default:
      // case 'bp'
      increment = 1000; // increment by 1000 bp
      formatValue = startBasePair + tickValue * increment;
      return `${formatValue.toString()}`;
  }
};

// Separate Y-Axis component for the scale label
export const ScaleBarYAxis = ({
  labelScale,
  startBasePair,
  height = 33,
}: {
  labelScale: string;
  startBasePair: number;
  height?: number;
}) => {
  useEffect(() => {
    const svg = d3.select("#scalebar-yaxis-svg");
    svg.selectAll("*").remove(); // Clear previous content

    const axisY = height / 2;
    const yAxisWidth = 41; // Fixed width for y-axis

    svg.attr("width", yAxisWidth).attr("height", height);

    const g = svg.append("g").attr("transform", `translate(0, -12)`);

    // Add the scale label (first tick equivalent)
    g.append("text")
      .attr("x", yAxisWidth - 5) // Position near the right edge
      .attr("y", axisY + 6 + 16) // Same positioning as main scale bar labels
      .attr("text-anchor", "end")
      .attr("fill", semanticTextTertiary)
      .style("font-size", smallGraphFontSize)
      .text(labelScale);

    // Optional: Add a small tick mark
    g.append("line")
      .attr("x1", yAxisWidth)
      .attr("x2", yAxisWidth)
      .attr("y1", axisY - 0.5)
      .attr("y2", axisY + TICK_LENGTH)
      .attr("stroke", baseBorderSecondary)
      .attr("stroke-width", 2);
  }, [labelScale, startBasePair, height]);

  return (
    <svg
      id="scalebar-yaxis-svg"
      height={height}
      style={{
        position: "absolute",
        zIndex: 10,
        left: 0,
        backgroundColor: "white",
      }}
    />
  );
};

export const ScaleBar = ({
  svgWidth,
  totalBPAtScale,
  startBasePair,
  marginLeft = 7,
  marginRight = 10,
  marginTop = 0,
  marginBottom = 20,
  labelFrequency = 1,
  labelScale,
  showYAxis = true, // New prop to control y-axis rendering
}: {
  svgWidth: number;
  totalBPAtScale: number;
  startBasePair: number;
  marginLeft?: number;
  marginRight?: number;
  marginTop?: number;
  marginBottom?: number;
  labelFrequency?: number;
  labelScale: string;
  showYAxis?: boolean;
}) => {
  useEffect(() => {
    const svg = d3.select("#scalebar-svg");
    svg.selectAll("*").remove(); // Clear previous content
    const innerWidth = svgWidth;
    const height = +svg.attr("height");
    const cleanEndValue = Math.ceil(totalBPAtScale);

    // Skip the first tick (0) if we're not showing y-axis
    const startTick = showYAxis ? 0 : labelFrequency;
    const labelTickValues = d3.range(
      startTick,
      cleanEndValue + 1,
      labelFrequency
    );

    // Calculate dynamic right margin based on last label width
    const lastLabelValue = cleanEndValue;
    const tempText = svg
      .append("text")
      .style("font-size", smallGraphFontSize)
      .style("visibility", "hidden")
      .text(formatLabel(lastLabelValue, labelScale, startBasePair));

    const lastLabelWidth =
      (tempText.node() as SVGTextElement)?.getBBox().width || 0;
    tempText.remove();

    const dynamicRightMargin = Math.max(marginRight, lastLabelWidth / 2 + 5);

    const margin = {
      top: marginTop,
      right: dynamicRightMargin,
      bottom: marginBottom,
      left: marginLeft,
    }; // margins to account for label overflow
    const width = innerWidth + margin.left + margin.right;
    const axisY = height / 2;

    // this aligns the beginning of the axis with the beginning of the svg after accounting for the label overflow
    svg.attr("width", width).attr("transform", `translate(-${margin.left}, 0)`);
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, -12)`);

    // === SCALE ===
    const xScale = d3
      .scaleLinear()
      .domain([0, cleanEndValue])
      .range([0, innerWidth]);

    // === BASE LINE ===
    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", axisY)
      .attr("y2", axisY)
      .attr("stroke", baseBorderSecondary)
      .attr("stroke-width", 1);

    // === TICKS (Show all tick lines) ===
    const allTickValues = d3.range(0, cleanEndValue + 1, 1);

    g.selectAll(".tick-line")
      .data(allTickValues)
      .enter()
      .append("line")
      .attr("x1", (d) => xScale(d))
      .attr("x2", (d) => xScale(d))
      .attr("y1", axisY)
      .attr("y2", axisY + TICK_LENGTH)
      .attr("stroke", baseBorderSecondary)
      .attr("stroke-width", 1);

    // === LABELS (Only show labels based on labelFrequency) ===
    g.selectAll(".tick-label")
      .data(labelTickValues)
      .enter()
      .append("text")
      .attr("x", (d) => xScale(d))
      .attr("y", axisY + TICK_LENGTH + 16)
      .attr("text-anchor", "middle")
      .attr("fill", semanticTextTertiary)
      .style("font-size", smallGraphFontSize)
      .text((d) => formatLabel(d, labelScale, startBasePair));
  }, [
    svgWidth,
    totalBPAtScale,
    marginBottom,
    marginLeft,
    marginRight,
    marginTop,
    startBasePair,
    labelFrequency,
    labelScale,
    showYAxis,
  ]);
  return <svg id="scalebar-svg" height="33" />;
};
