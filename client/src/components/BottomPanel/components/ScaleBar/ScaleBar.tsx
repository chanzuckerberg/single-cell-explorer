import React, { useEffect } from "react";
import * as d3 from "d3";

export const ScaleBar = ({
  svgWidth,
  totalMb,
}: {
  svgWidth: number;
  totalMb: number;
}) => {
  useEffect(() => {
    const svg = d3.select("#scalebar-svg");
    svg.selectAll("*").remove(); // Clear previous content
    const innerWidth = svgWidth;
    const height = +svg.attr("height");

    // === CONFIG ===
    const margin = { top: 20, right: 10, bottom: 20, left: 7 }; // margins to account for label overflow
    const width = innerWidth + margin.left + margin.right;
    const axisY = height / 2;
    const tickLength = 8;

    // this aligns the beginning of the axis with the beginning of the svg after accounting for the label overflow
    svg.attr("width", width).attr("transform", `translate(-${margin.left}, 0)`);
    const g = svg.append("g").attr("transform", `translate(${margin.left}, 0)`);

    // === SCALE ===
    const xScale = d3.scaleLinear().domain([0, totalMb]).range([0, innerWidth]);

    // === BASE LINE ===
    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", axisY)
      .attr("y2", axisY)
      .attr("stroke", "#C3C3C3")
      .attr("stroke-width", 1);

    // === TICKS ===
    const tickValues = d3.range(0, totalMb + 1, 5); // every 5mb

    g.selectAll(".tick-line")
      .data(tickValues)
      .enter()
      .append("line")
      .attr("x1", (d) => xScale(d))
      .attr("x2", (d) => xScale(d))
      .attr("y1", axisY - tickLength)
      .attr("y2", axisY + tickLength)
      .attr("stroke", "#C3C3C3")
      .attr("stroke-width", 1);

    // === LABELS ===
    g.selectAll(".tick-label")
      .data(tickValues)
      .enter()
      .append("text")
      .attr("x", (d) => xScale(d))
      .attr("y", axisY + tickLength + 16)
      .attr("text-anchor", "middle")
      .attr("fill", "#C3C3C3")
      .style("font-size", "12px")
      .text((d) => (d === 0 ? "mb" : d));
  }, [svgWidth, totalMb]);
  return <svg id="scalebar-svg" height="60" />;
};
