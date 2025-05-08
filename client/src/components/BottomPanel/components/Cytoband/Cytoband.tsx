import * as d3 from "d3";
import React, { useEffect } from "react";
import { CytobandWrapper } from "./style";
import { mockCytobandData, Band } from "./mockCytobandData";

export const Cytoband = ({
  chromosomeId,
  svgWidth,
}: {
  chromosomeId: string;
  svgWidth: number;
}) => {
  useEffect(() => {
    const renderCytobands = (bands: Band[]) => {
      const svg = d3.select("#cytoband-svg");
      svg.selectAll("*").remove(); // Clear previous content

      const chrHeight = 12;
      const chrLength = bands.reduce(
        (maxEnd, band) => Math.max(maxEnd, band.end),
        0
      ); // Get the maximum end position for the chromosome
      const yPos = 20;
      const borderRadius = chrHeight / 2;
      const pillId = `clip-${chromosomeId}`;

      // Define clipPath with pill-shaped rounded rect
      svg
        .append("defs")
        .append("clipPath")
        .attr("id", pillId)
        .append("rect")
        .attr("x", 0)
        .attr("y", yPos)
        .attr("rx", borderRadius)
        .attr("ry", borderRadius)
        .attr("width", svgWidth)
        .attr("height", chrHeight);

      // Draw border outline
      svg
        .append("rect")
        .attr("x", 0)
        .attr("y", yPos)
        .attr("rx", borderRadius)
        .attr("ry", borderRadius)
        .attr("width", svgWidth)
        .attr("height", chrHeight)
        .attr("fill", "none")
        .attr("stroke", "#C3C3C3");

      // Group for bands with clipping
      const chrGroup = svg
        .append("g")
        .attr("id", chromosomeId)
        .attr("class", "cytoband-group")
        .attr("clip-path", `url(#${pillId})`);

      bands.forEach((band, index) => {
        const x = (band.start / chrLength) * svgWidth;
        const width = ((band.end - band.start) / chrLength) * svgWidth;

        if (band.stain === "acen") {
          const prevBand = bands[index - 1];
          const isPrevAcen = prevBand && prevBand.stain === "acen";

          const triangleHeight = chrHeight;
          let trianglePoints = `${x},${yPos + 1} ${x + width},${
            yPos + triangleHeight / 2
          } ${x},${yPos + triangleHeight - 1}`;

          if (isPrevAcen) {
            trianglePoints = `${x + width},${yPos + 1} ${x + width - width},${
              yPos + triangleHeight / 2
            } ${x + width},${yPos + triangleHeight - 1}`;
          }

          chrGroup
            .append("polygon")
            .attr("points", trianglePoints)
            .attr("class", `band acen`);
        } else {
          chrGroup
            .append("rect")
            .attr("x", x)
            .attr("y", yPos)
            .attr("width", width)
            .attr("height", chrHeight)
            .attr("class", `band ${band.stain}`);
        }
      });

      svg
        .append("text")
        .attr("x", -30)
        .attr("y", yPos + chrHeight / 2)
        .attr("dy", "0.35em")
        .text(chromosomeId);
    };

    renderCytobands(mockCytobandData[chromosomeId]);
  }, [svgWidth, chromosomeId]);

  return (
    <CytobandWrapper>
      <svg id="cytoband-svg" width={svgWidth} height="60">
        <g id="cytoband-groups" />
      </svg>
    </CytobandWrapper>
  );
};
