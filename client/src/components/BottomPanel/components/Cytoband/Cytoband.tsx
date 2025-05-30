import * as d3 from "d3";
import React, { useEffect, useRef, useState } from "react";
import { useCytobandQuery, CytobandSegment } from "common/queries/useCytoband";
import { CytobandWrapper } from "./style";

export const Cytoband = ({
  chromosomeId,
  startBasePair,
  endBasePair,
  svgWidth,
}: {
  chromosomeId: string;
  startBasePair?: number;
  endBasePair?: number;
  svgWidth?: number;
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [cytobandWidth, setCytobandWidth] = useState<number>(0);
  const GENOME_VERSION = "hg38"; // TODO: (smccanny) make this dynamic

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
    genomeVersion: GENOME_VERSION, // TODO: (smccanny) make this dynamic
  });

  const { isLoading, isError, isSuccess, data } = cytobandData;

  useEffect(() => {
    const renderCytobands = (bands: CytobandSegment[]) => {
      const svg = d3.select("#cytoband-svg");
      svg.selectAll("*").remove(); // Clear previous content

      const chrHeight = 8;
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

      // Add blue highlight overlay for the specified range
      if (startBasePair !== undefined && endBasePair !== undefined) {
        // Ensure the range is within chromosome bounds
        const clampedStart = Math.max(0, Math.min(startBasePair, chrLength));
        const clampedEnd = Math.max(
          clampedStart,
          Math.min(endBasePair, chrLength)
        );

        const highlightX = (clampedStart / chrLength) * cytobandWidth;
        const highlightWidth =
          ((clampedEnd - clampedStart) / chrLength) * cytobandWidth;

        // Add highlight rectangle with blue overlay
        chrGroup
          .append("rect")
          .attr("x", highlightX)
          .attr("y", yPos)
          .attr("width", highlightWidth)
          .attr("height", chrHeight)
          .attr("fill", "#2563eb") // Blue color
          .attr("fill-opacity", 0.4) // Semi-transparent
          .attr("stroke", "#1d4ed8") // Darker blue border
          .attr("stroke-width", 1)
          .attr("class", "range-highlight");

        // Add position indicators at the start and end
        const indicatorHeight = chrHeight + 2;

        // Start position indicator
        svg
          .append("line")
          .attr("x1", highlightX + 1) // +1 to account for transform
          .attr("y1", yPos - 2)
          .attr("x2", highlightX + 1)
          .attr("y2", yPos + indicatorHeight)
          .attr("stroke", "#1d4ed8")
          .attr("stroke-width", 2)
          .attr("class", "range-indicator start");

        // End position indicator
        svg
          .append("line")
          .attr("x1", highlightX + highlightWidth + 1) // +1 to account for transform
          .attr("y1", yPos - 2)
          .attr("x2", highlightX + highlightWidth + 1)
          .attr("y2", yPos + indicatorHeight)
          .attr("stroke", "#1d4ed8")
          .attr("stroke-width", 2)
          .attr("class", "range-indicator end");
      }

      svg
        .append("text")
        .attr("x", -30)
        .attr("y", yPos + chrHeight / 2)
        .attr("dy", "0.35em")
        .text(chromosomeId);
    };

    // Only render when data is successfully loaded and cytobandWidth is set
    if (isSuccess && data && cytobandWidth > 0) {
      renderCytobands(data);
    }
  }, [
    cytobandWidth,
    chromosomeId,
    isSuccess,
    data,
    isLoading,
    startBasePair,
    endBasePair,
  ]);

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

  // Format base pair numbers for display
  const formatBasePair = (bp: number, roundDown = false) => {
    const roundingFn = roundDown ? Math.floor : Math.round;

    if (bp >= 1000000) {
      return `${roundingFn(bp / 10000) / 100}M`;
    }
    if (bp >= 1000) {
      return `${roundingFn(bp / 10) / 100}K`;
    }
    return bp.toString();
  };

  const rangeText =
    startBasePair !== undefined && endBasePair !== undefined
      ? `Range: ${formatBasePair(startBasePair, true)} - ${formatBasePair(
          endBasePair
        )} bp`
      : "";

  return (
    <CytobandWrapper id="cytoband-wrapper" ref={wrapperRef}>
      <p>
        {chromosomeId} - {GENOME_VERSION} {rangeText && `| ${rangeText}`}
      </p>
      <svg id="cytoband-svg" width={cytobandWidth + 2} height="20" />
      <g id="cytoband-groups" />
    </CytobandWrapper>
  );
};
