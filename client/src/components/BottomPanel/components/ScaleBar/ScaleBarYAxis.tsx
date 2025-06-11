import React, { useEffect } from "react";
import * as d3 from "d3";
import {
  baseBorderSecondary,
  smallGraphFontSize,
  semanticTextTertiary,
  TICK_LENGTH,
  Y_AXIS_ID,
  Y_AXIS_WIDTH,
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
    const svg = d3.select(`#${Y_AXIS_ID}`);
    svg.selectAll("*").remove(); // Clear previous content

    const axisY = height / 2;

    svg.attr("width", Y_AXIS_WIDTH).attr("height", height);

    const g = svg.append("g").attr("transform", `translate(0, -12)`);

    // Add the scale label
    g.append("text")
      .attr("x", Y_AXIS_WIDTH - 5) // Position near the right edge
      .attr("y", axisY + 6 + 16) // Same positioning as main scale bar labels
      .attr("text-anchor", "end")
      .attr("fill", semanticTextTertiary)
      .style("font-size", smallGraphFontSize)
      .text(labelScale);

    // Add a first tick mark
    g.append("line")
      .attr("x1", Y_AXIS_WIDTH)
      .attr("x2", Y_AXIS_WIDTH)
      .attr("y1", axisY - 0.5)
      .attr("y2", axisY + TICK_LENGTH)
      .attr("stroke", baseBorderSecondary)
      .attr("stroke-width", 2);
  }, [labelScale, startBasePair, height]);

  return (
    <svg
      id={Y_AXIS_ID}
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
