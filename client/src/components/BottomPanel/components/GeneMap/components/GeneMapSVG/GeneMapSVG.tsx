import React, { useState, useEffect, useMemo, ReactNode } from "react";
import { GeneInfo } from "common/queries/coverage";
import { GeneMapSVGProps } from "./types";
import { organizeGenesIntoRows } from "./utils";

export const GeneMapSVG = ({
  data,
  selectedGene,
  svgWidth,
}: GeneMapSVGProps) => {
  const [geneData, setGeneData] = useState<GeneMapSVGProps["data"] | null>(
    null
  );
  const [minPosition, setMinPosition] = useState(0);
  const [maxPosition, setMaxPosition] = useState(0);
  const [svgHeight, setSvgHeight] = useState(100);
  const [organizedRows, setOrganizedRows] = useState<GeneInfo[][]>([]);

  // SVG dimensions and settings
  const margin = { top: 20, right: 0, bottom: 0, left: 0 };
  const trackHeight = 25;
  const trackSpacing = 9;

  // Scale a genomic position to SVG x-coordinate
  const scaleX = useMemo(
    () => (position: number) => {
      const availableWidth = svgWidth - margin.left - margin.right;
      return (
        margin.left +
        ((position - minPosition) / (maxPosition - minPosition)) *
          availableWidth
      );
    },
    [svgWidth, margin.left, margin.right, minPosition, maxPosition]
  );

  useEffect(() => {
    setGeneData(data);

    // Calculate min and max positions for scaling
    let min = Infinity;
    let max = -Infinity;

    // Process all genes to find min and max positions
    const processGenes = (genesArray: GeneInfo[]) => {
      for (const gene of genesArray) {
        min = Math.min(min, gene.geneStart);
        max = Math.max(max, gene.geneEnd);
      }
    };

    // Process data
    processGenes(data);
    // Add some padding to min and max for better visualization
    const padding = (max - min) * 0.05;
    setMinPosition(min - padding);
    setMaxPosition(max + padding);

    // Calculate SVG height based on gene organization
    if (data.length > 0) {
      // Sort genes by start position for row calculation
      const sortedGenes = [...data].sort((a, b) => a.geneStart - b.geneStart);

      // Organize genes into rows
      const rows = organizeGenesIntoRows(sortedGenes, scaleX);
      setOrganizedRows(rows);

      // Calculate SVG height based on number of rows
      const calculatedHeight =
        margin.top +
        rows.length * (trackHeight + trackSpacing) -
        trackSpacing +
        margin.bottom;
      setSvgHeight(calculatedHeight);
    }
  }, [data, margin.bottom, margin.top, scaleX]);

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
        const startX = scaleX(gene.geneStart);
        const endX = scaleX(gene.geneEnd);
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

          // Start tick on left for positive strands
          if (direction === 1) {
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

          // Start tick on right for negative strands
          if (direction === -1) {
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
        tracks.push(
          <text
            key={`${gene.geneName}-label`}
            x={startX - 3} // Position at the left of the gene body
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
