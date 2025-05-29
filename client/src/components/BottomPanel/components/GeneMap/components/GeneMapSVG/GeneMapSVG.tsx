import React, { useState, useEffect, useMemo, ReactNode } from "react";
import { GeneInfo } from "common/queries/coverage";
import { GeneMapSVGProps } from "./types";
import { organizeGenesIntoRows } from "./utils";

export const GeneMapSVG = ({
  data,
  selectedGene,
  svgWidth,
  startBasePair,
  endBasePair,
}: GeneMapSVGProps) => {
  const [geneData, setGeneData] = useState<GeneInfo[] | null>(null);
  const [svgHeight, setSvgHeight] = useState(100);
  const [organizedRows, setOrganizedRows] = useState<GeneInfo[][]>([]);

  // SVG dimensions and settings
  const margin = { top: 20, right: 0, bottom: 0, left: 0 };
  const trackHeight = 25;
  const trackSpacing = 9;

  // Scale a genomic position to SVG x-coordinate based on viewport
  const scaleX = useMemo(
    () => (position: number) => {
      const availableWidth = svgWidth - margin.left - margin.right;
      return (
        margin.left +
        ((position - startBasePair) / (endBasePair - startBasePair)) *
          availableWidth
      );
    },
    [svgWidth, margin.left, margin.right, startBasePair, endBasePair]
  );

  useEffect(() => {
    setGeneData(data);

    // Calculate SVG height based on gene organization
    if (data.length > 0) {
      // Organize genes into rows
      const rows = organizeGenesIntoRows(
        data,
        startBasePair,
        endBasePair,
        scaleX
      );
      setOrganizedRows(rows);

      // Calculate SVG height based on number of rows
      const calculatedHeight =
        margin.top +
        rows.length * (trackHeight + trackSpacing) -
        trackSpacing +
        margin.bottom;
      setSvgHeight(calculatedHeight);
    }
  }, [data, startBasePair, endBasePair, margin.bottom, margin.top, scaleX]);

  // Determine color for each gene
  const getGeneColor = (geneName: string) => {
    // Specific gene highlighting
    if (geneName === selectedGene) return "#3366CC"; // TODO: (smccanny) unify and parametrize this color
    return `#c3c3c3`; // TODO: (smccanny) unify and parametrize this color
  };

  // Render gene tracks
  const renderGeneTracks = () => {
    if (!geneData) return null;

    const tracks: ReactNode[] = [];
    let currentY = margin.top;

    // Get organized rows of genes
    const rows = organizedRows;

    // Render all rows
    let rowIndex = 0;
    rows.forEach((row) => {
      // Draw the track line
      tracks.push(
        <line
          key={`row-${rowIndex}-line`}
          x1={margin.left}
          y1={currentY + trackHeight / 2}
          x2={svgWidth - margin.right}
          y2={currentY + trackHeight / 2}
          stroke="#EEEEEE" // TODO: (smccanny) unify and parametrize this color
          strokeWidth={1}
        />
      );
      rowIndex += 1;

      // Draw genes in this row
      row.forEach((gene) => {
        // Clip gene coordinates to viewport
        const clippedStart = Math.max(gene.geneStart, startBasePair);
        const clippedEnd = Math.min(gene.geneEnd, endBasePair);

        const startX = scaleX(clippedStart);
        const endX = scaleX(clippedEnd);
        const width = endX - startX;

        const direction = gene.geneStrand === "+" ? 1 : -1;

        // Draw one chevron for short genes
        if (width < 5) {
          // Position caret based on strand direction
          const caretX = direction === 1 ? endX : startX;

          tracks.push(
            <path
              key={`${gene.geneName}-chevron`}
              d={`M ${caretX - 3 * direction} ${currentY + trackHeight / 2 - 4} 
                  L ${caretX + 1 * direction} ${currentY + trackHeight / 2} 
                  L ${caretX - 3 * direction} ${
                currentY + trackHeight / 2 + 4
              }`}
              fill="none"
              stroke={getGeneColor(gene.geneName)}
              strokeWidth={2}
            />
          );
        } else {
          // Gene body - draw base line for gene
          tracks.push(
            <line
              key={`${gene.geneName}-body`}
              x1={startX}
              y1={currentY + trackHeight / 2}
              x2={endX}
              y2={currentY + trackHeight / 2}
              stroke={getGeneColor(gene.geneName)}
              strokeWidth={2}
            />
          );

          // Only draw start tick if the actual gene start is visible in viewport
          if (direction === 1 && gene.geneStart >= startBasePair) {
            tracks.push(
              <line
                key={`${gene.geneName}-start-line`}
                x1={startX}
                y1={currentY + trackHeight / 2 - 4}
                x2={startX}
                y2={currentY + trackHeight / 2 + 4}
                stroke={getGeneColor(gene.geneName)}
                strokeWidth={2}
              />
            );
          }

          // Only draw end tick if the actual gene end is visible in viewport
          if (direction === -1 && gene.geneEnd <= endBasePair) {
            tracks.push(
              <line
                key={`${gene.geneName}-start-line`}
                x1={endX}
                y1={currentY + trackHeight / 2 - 4}
                x2={endX}
                y2={currentY + trackHeight / 2 + 4}
                stroke={getGeneColor(gene.geneName)}
                strokeWidth={2}
              />
            );
          }

          // Draw carats along the gene line
          const spaceBetweenCarets = 13;
          const numCarats = Math.floor(width / spaceBetweenCarets) + 1;

          let i = 0;
          while (i < numCarats) {
            if (direction === -1) {
              // For negative strands
              const caratX = startX + i * spaceBetweenCarets;
              // Only draw if we're not too close to the end
              if (caratX > endX - 5) break;
              tracks.push(
                <path
                  key={`${gene.geneName}-carat-${i}`}
                  d={`M ${caratX - 3 * direction} ${
                    currentY + trackHeight / 2 - 4
                  } 
                    L ${caratX + 1 * direction} ${currentY + trackHeight / 2} 
                    L ${caratX - 3 * direction} ${
                    currentY + trackHeight / 2 + 4
                  }`}
                  fill="none"
                  stroke={getGeneColor(gene.geneName)}
                  strokeWidth={2}
                />
              );
            } else {
              // For positive strands
              const caratX = endX - i * spaceBetweenCarets;
              // Only draw if we're not too close to the beginning
              if (caratX < startX + 5) break;
              tracks.push(
                <path
                  key={`${gene.geneName}-carat-${i}`}
                  d={`M ${caratX - 3 * direction} ${
                    currentY + trackHeight / 2 - 4
                  } 
                    L ${caratX + 1 * direction} ${currentY + trackHeight / 2} 
                    L ${caratX - 3 * direction} ${
                    currentY + trackHeight / 2 + 4
                  }`}
                  fill="none"
                  stroke={getGeneColor(gene.geneName)}
                  strokeWidth={2}
                />
              );
            }
            i += 1;
          }
        }
        // Gene name
        // Display at the top left of the gene body

        // Add double left caret if gene starts before viewport
        if (gene.geneStart < startBasePair) {
          tracks.push(
            <g>
              <path
                key={`${gene.geneName}-left-indicator-1`}
                d={`M ${startX + 6} ${currentY - 6 - 4} 
                 L ${startX + 2} ${currentY - 6} 
                 L ${startX + 6} ${currentY - 6 + 4}`}
                fill="none"
                stroke={getGeneColor(gene.geneName)}
                strokeWidth={1}
              />
              <path
                key={`${gene.geneName}-left-indicator-2`}
                d={`M ${startX + 12} ${currentY - 6 - 4} 
                 L ${startX + 8} ${currentY - 6} 
                 L ${startX + 12} ${currentY - 6 + 4}`}
                fill="none"
                stroke={getGeneColor(gene.geneName)}
                strokeWidth={1}
              />
            </g>
          );
        }
        // Position label based on gene start position
        const labelXOffset = gene.geneStart >= startBasePair ? -3 : 15;
        tracks.push(
          <text
            id={`${gene.geneName}-label`}
            key={`${gene.geneName}-label`}
            x={startX + labelXOffset} // Position at the left of the gene body
            y={currentY - 1} // Position above the gene body
            fontSize={10}
            textAnchor="start"
            fill={getGeneColor(gene.geneName)}
            dominantBaseline="text-bottom"
          >
            {gene.geneName}
          </text>
        );
      });

      currentY += trackHeight + trackSpacing;
    });

    return tracks;
  };

  return (
    <div className="gene-map-container">
      <svg width={svgWidth} height={svgHeight}>
        {geneData && renderGeneTracks()}
      </svg>
    </div>
  );
};
