import * as d3 from "d3";
import React, { useEffect, useRef, useState } from "react";
import { useCytobandQuery, CytobandSegment } from "common/queries/useCytoband";
import { CytobandWrapper } from "./style";

export const Cytoband = ({
  chromosomeId,
  svgWidth,
}: {
  chromosomeId: string;
  svgWidth?: number;
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [cytobandWidth, setCytobandWidth] = useState<number>(0);

  const updateWidth = () => {
    if (wrapperRef.current) {
      const newWidth = wrapperRef.current.clientWidth - 32; // Subtract padding
      setCytobandWidth(newWidth > 2 ? newWidth - 2 : 0); // Subtract for border stroke
    }
  };

  useEffect(() => {
    if (svgWidth) {
      setCytobandWidth(svgWidth);
    } else {
      updateWidth(); // initial measure

      window.addEventListener("resize", updateWidth);
    }
    return () => {
      window.removeEventListener("resize", updateWidth);
    };
  }, [svgWidth]);

  const cytobandData = useCytobandQuery({
    chromosome: chromosomeId,
    genomeVersion: "hg38",
    options: {
      enabled: true,
      retry: 3,
    },
  });

  const { isLoading, isError, isSuccess, data } = cytobandData;

  useEffect(() => {
    const renderCytobands = (bands: CytobandSegment[]) => {
      const svg = d3.select("#cytoband-svg");
      svg.selectAll("*").remove(); // Clear previous content

      const chrHeight = 12;
      const chrLength = bands.reduce(
        (maxEnd, band) => Math.max(maxEnd, band.end),
        0
      ); // Get the maximum end position for the chromosome
      const yPos = 1; // account for the border stroke
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
        .attr("width", cytobandWidth)
        .attr("height", chrHeight);

      // Draw border outline
      svg
        .append("rect")
        .attr("x", 0)
        .attr("y", yPos)
        .attr("rx", borderRadius)
        .attr("ry", borderRadius)
        .attr("width", cytobandWidth)
        .attr("height", chrHeight)
        .attr("fill", "none")
        .style("transform", `translate(1px, 0)`) // account for the border stroke
        .attr("stroke", "#C3C3C3");

      // Group for bands with clipping
      const chrGroup = svg
        .append("g")
        .attr("id", chromosomeId)
        .attr("class", "cytoband-group")
        .style("transform", `translate(1px, 0)`) // account for the border stroke
        .attr("clip-path", `url(#${pillId})`);

      bands.forEach((band, index) => {
        const x = (band.start / chrLength) * cytobandWidth;
        const width = ((band.end - band.start) / chrLength) * cytobandWidth;

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

    // Only render when data is successfully loaded and cytobandWidth is set
    if (isSuccess && data && cytobandWidth > 0) {
      console.log("Cytoband data:", data);
      renderCytobands(data);
    }
  }, [cytobandWidth, chromosomeId, isSuccess, data, isLoading]);

  // Handle loading and error states
  if (isLoading) {
    return (
      <CytobandWrapper id="cytoband-wrapper" ref={wrapperRef}>
        <p>Loading chromosome data...</p>
      </CytobandWrapper>
    );
  }

  if (isError) {
    return (
      <CytobandWrapper id="cytoband-wrapper" ref={wrapperRef}>
        <p>Error loading chromosome data</p>
      </CytobandWrapper>
    );
  }

  return (
    <CytobandWrapper id="cytoband-wrapper" ref={wrapperRef}>
      <p>{chromosomeId} - HG38</p>
      <svg id="cytoband-svg" width={cytobandWidth + 2} height="20" />
      <g id="cytoband-groups" />
    </CytobandWrapper>
  );
};
