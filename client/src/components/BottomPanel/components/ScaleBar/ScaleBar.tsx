import React, { useEffect } from "react";
import * as d3 from "d3";

export const ScaleBar = ({ svgWidth }: { svgWidth: number }) => {
  useEffect(() => {
    const svg = d3.select("#scalebar-svg");
    svg.selectAll("*").remove(); // Clear previous content
    const width = +svg.attr("width");
    const height = +svg.attr("height");

    // TODO: coordinate all the SVGs to have the same width and the same starting margins
    // be sure to think about labels that overflow the exact graph area and the overal width of the svg

    // === CONFIG ===
    const totalMb = 25; // or dynamic input
    const margin = { top: 20, right: 10, bottom: 20, left: 25 };
    const innerWidth = width + margin.left + margin.right;
    console.log("innerWidth", innerWidth);
    const axisY = height / 2;
    const tickLength = 8;

    // === SCALE ===
    const xScale = d3.scaleLinear().domain([0, totalMb]).range([0, innerWidth]);

    // === GROUP ===
    const g = svg.append("g").attr("transform", `translate(${margin.left}, 0)`);

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
  }, []);
  return <svg id="scalebar-svg" width={svgWidth} height="60" />;
};
