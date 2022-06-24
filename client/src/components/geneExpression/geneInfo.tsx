import React from "react";
import { connect } from "react-redux";
import { Button, ButtonGroup } from "@blueprintjs/core";
import * as styles from "./util";

import * as globals from "../../globals";

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
type State = any;

// @ts-expect-error ts-migrate(1238) FIXME: Unable to resolve signature of class decorator whe... Remove this comment to see the full error message
@connect((state) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: FIXME: disabled temporarily on commit
  const { geneSummary, geneName, gene, geneSynonyms, geneUrl } = (state as any)
    .controls;

  return {
    geneSummary,
    geneName,
    gene,
    geneSynonyms,
    geneUrl,
  };
})

// eslint-disable-next-line @typescript-eslint/ban-types --- FIXME: disabled temporarily on migrate to TS.
class GeneInfo extends React.PureComponent<{}, State> {
  // eslint-disable-next-line @typescript-eslint/ban-types --- FIXME: disabled temporarily on commit
  constructor(props: {}) {
    super(props);
    this.state = {
      minimized: null,
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  updateReglAndRender(newRenderCache: any) {
    const { positions, colors, flags } = newRenderCache;
    // this.renderCache = newRenderCache;
    const { pointBuffer, colorBuffer, flagBuffer } = this.state;
    pointBuffer({ data: positions, dimension: 2 });
    colorBuffer({ data: colors, dimension: 3 });
    flagBuffer({ data: flags, dimension: 1 });
    // this.renderCanvas();
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
  render() {
    const {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'dispatch' does not exist on type 'Readon... Remove this comment to see the full error message
      dispatch,
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'geneSummary' does not exist on type 'Readon... Remove this comment to see the full error message
      geneSummary,
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'geneName' does not exist on type 'Readon... Remove this comment to see the full error message
      geneName,
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'gene' does not exist on type 'Readon... Remove this comment to see the full error message
      gene,
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'geneUrl' does not exist on type 'Readon... Remove this comment to see the full error message
      geneUrl,
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'geneSynonyms' does not exist on type 'Readon... Remove this comment to see the full error message
      geneSynonyms,
    } = this.props;
    const { minimized } = this.state;
    const bottomToolbarGutter = 48; // gutter for bottom tool bar
    // const geneInfoRef = useRef(null);

    const synonymList = geneSynonyms.join(", ");
    // const synonymList = ['a', 'b', 'c']
    // geneSynonyms.map((name: string) =>
    //   <span style={{
    //     fontSize: styles.smallText,
    //     padding: "5px",
    //   }}>{name}</span>
    // )

    return (
      <div
        style={{
          position: "fixed",
          bottom: bottomToolbarGutter,
          borderRadius: "3px 3px 0px 0px",
          left: globals.leftSidebarWidth + globals.scatterplotMarginLeft,
          padding: "0px 20px 20px 0px",
          background: "white",
          /* x y blur spread color */
          boxShadow: "0px 0px 3px 2px rgba(153,153,153,0.2)",
          zIndex: 2,
        }}
        id="geneinfo_wrapper"
      >
        <p
          style={{
            position: "absolute",
            marginLeft: styles.margin.left,
            top: styles.margin.bottom / 2,
            fontSize: styles.mediumText,
            color: globals.darkGrey,
          }}
        >
          Gene Info
        </p>
        <ButtonGroup
          style={{
            position: "absolute",
            right: 5,
            top: 5,
          }}
        >
          <Button
            type="button"
            minimal
            onClick={() => {
              this.setState({ minimized: !minimized });
            }}
          >
            {minimized ? "show gene info" : "hide"}
          </Button>
          <Button
            type="button"
            minimal
            data-testid="clear-gene-info"
            onClick={() =>
              dispatch({
                type: "clear gene info",
              })
            }
          >
            remove
          </Button>
        </ButtonGroup>
        <div
          // className={styles.scatterplot}
          id="gene-info"
          style={{
            width: `${
              styles.width + styles.margin.left + styles.margin.right
            }px`,
            height: `${
              (minimized ? 0 : styles.height + styles.margin.top) +
              styles.margin.bottom
            }px`,
          }}
        >
          {!minimized ? (
            <div
              style={{
                marginTop: styles.margin.top,
                marginLeft: styles.margin.left,
                marginRight: styles.margin.right,
                marginBottom: styles.margin.bottom,
              }}
            >
              <p
                style={{
                  fontSize: styles.largeText,
                  fontWeight: globals.bolder,
                }}
              >
                {gene}
              </p>
              <p style={{ fontSize: styles.smallText, fontWeight: 500 }}>
                {geneName}
              </p>
              <p
                style={{
                  fontSize: styles.smallText,
                  display: "-webkit-box",
                  WebkitLineClamp: 7,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {geneSummary}
              </p>
              <p>
                <span style={{ color: globals.mediumGrey }}>Synonyms</span>
                <span style={{ fontSize: styles.smallText, padding: "5px" }}>
                  {synonymList}
                </span>
              </p>
              <a
                href={geneUrl}
                target="_blank"
                rel="noreferrer noopener"
                style={{
                  fontSize: styles.mediumText,
                  color: globals.linkBlue,
                  fontWeight: 500,
                }}
              >
                View on NCBI
              </a>
            </div>
          ) : null}
        </div>
      </div>
    );
  }
}

export default GeneInfo;

// const GeneInfoText = React.memo(
//     ({
//       // @ts-expect-error ts-migrate(2339) FIXME: Property 'minimized' does not exist on type '{ chi... Remove this comment to see the full error message
//       minimized,
//       // @ts-expect-error ts-migrate(2339) FIXME: Property 'geneInfoAccessor' does not exist on... Remove this comment to see the full error message
//       geneInfoAccessor,
//       // @ts-expect-error ts-migrate(2339) FIXME: Property 'xScale' does not exist on type '{ childr... Remove this comment to see the full error message
//       xScale,
//       // @ts-expect-error ts-migrate(2339) FIXME: Property 'yScale' does not exist on type '{ childr... Remove this comment to see the full error message
//       yScale,
//     }) => {

//       const textRef = useRef(null);
//       let ctx;

//       // initialize canvas context
//       useEffect(() => {
//         if (!textRef.current || minimized) return;
//         ctx = testRef.current.getContext("2d");
//       }, []);

//       useEffect(() => {
//           writeText({text: 'here!', x: 180, y: 70 })
//       })

//         svg.selectAll("*").remove();

//         // the axes are much cleaner and easier now. No need to rotate and orient
//         // the axis, just call axisBottom, axisLeft etc.
//         // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
//         const xAxis = d3.axisBottom().ticks(7).scale(xScale);
//         // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
//         const yAxis = d3.axisLeft().ticks(7).scale(yScale);

//         // adding axes is also simpler now, just translate x-axis to (0,height)
//         // and it's alread defined to be a bottom axis.
//         svg
//           .append("g")
//           .attr("transform", `translate(0,${height})`)
//           .attr("class", "x axis")
//           .call(xAxis);

//         // y-axis is translated to (0,0)
//         svg
//           .append("g")
//           .attr("transform", "translate(0,0)")
//           .attr("class", "y axis")
//           .call(yAxis);

//         // adding label. For x-axis, it's at (10, 10), and for y-axis at (width, height-10).
//         svg
//           .append("text")
//           .attr("x", 10)
//           .attr("y", 10)
//           .attr("class", "label")
//           .style("font-style", "italic")
//           .text(scatterplotYYaccessor);

//         svg
//           .append("text")
//           .attr("x", width)
//           .attr("y", height - 10)
//           .attr("text-anchor", "end")
//           .attr("class", "label")
//           .style("font-style", "italic")
//           .text(scatterplotXXaccessor);
//       }, [
//         scatterplotXXaccessor,
//         scatterplotYYaccessor,
//         xScale,
//         yScale,
//         minimized,
//       ]);

//       return (
//         <svg
//           width={width + margin.left + margin.right}
//           height={height + margin.top + margin.bottom}
//           data-testid="scatterplot-svg"
//           style={{
//             // @ts-expect-error ts-migrate(2322) FIXME: Type '"none" | null' is not assignable to type 'Di... Remove this comment to see the full error message
//             display: minimized ? "none" : null,
//           }}
//         >
//           <g ref={svgRef} transform={`translate(${margin.left},${margin.top})`} />
//         </svg>
//       );
//     }
//   );
