import React, { useEffect } from "react";
import * as d3 from "d3";

export const ScaleBar = ({
  svgWidth,
  totalBPAtScale,
  startBasePair,
  marginLeft = 7,
  marginRight = 10,
  marginTop = 20,
  marginBottom = 20, // default value for marginBottom
  labelFrequency = 1, // default value for labelFrequency
  labelScale,
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
}) => {
  useEffect(() => {
    const svg = d3.select("#scalebar-svg");
    svg.selectAll("*").remove(); // Clear previous content
    const innerWidth = svgWidth;
    const height = +svg.attr("height");

    // === CONFIG ===
    const margin = {
      top: marginTop,
      right: marginRight,
      bottom: marginBottom,
      left: marginLeft,
    }; // margins to account for label overflow
    const width = innerWidth + margin.left + margin.right;
    const axisY = height / 2;
    const tickLength = 8;

    // this aligns the beginning of the axis with the beginning of the svg after accounting for the label overflow
    svg.attr("width", width).attr("transform", `translate(-${margin.left}, 0)`);
    const g = svg.append("g").attr("transform", `translate(${margin.left}, 0)`);

    // === SCALE ===
    const xScale = d3
      .scaleLinear()
      .domain([0, totalBPAtScale])
      .range([0, innerWidth]);

    // === BASE LINE ===
    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", axisY)
      .attr("y2", axisY)
      .attr("stroke", "#C3C3C3")
      .attr("stroke-width", 1);

    // === TICKS ===
    const tickValues = d3.range(0, totalBPAtScale + 1, labelFrequency);

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

    // Function to format labels based on scale and increment properly
    const formatLabel = (tickValue: number) => {
      if (tickValue === 0) return labelScale;

      // Determine increment based on label scale
      let increment;
      let formatValue;

      switch (labelScale.toLowerCase()) {
        // TODO: (smccanny) add support for other scales
        // case 'kb':
        //   increment = 1; // increment by 1 kb (which is 1000 bp)
        //   formatValue = Math.round((startBasePair + (tickValue * 1000)) / 1000);
        //   return formatValue.toString();

        // case 'mb':
        //   increment = 0.001; // increment by 0.001 mb (which is 1000 bp)
        //   formatValue = ((startBasePair + (tickValue * 1000)) / 1000000).toFixed(3);
        //   return parseFloat(formatValue).toString();

        default:
          // case 'bp'
          increment = 1000; // increment by 1000 bp
          formatValue = startBasePair + tickValue * increment;
          return formatValue.toString();
      }
    };

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
      .text((d) => formatLabel(d));
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
  ]);
  return <svg id="scalebar-svg" height="60" />;
};
