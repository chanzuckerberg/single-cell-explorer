import React, { useEffect } from "react";
import * as d3 from "d3";
import {
  baseBorderSecondary,
  smallGraphFontSize,
  semanticTextTertiary,
  TICK_LENGTH,
} from "components/BottomPanel/constants";

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
