import React, { useEffect, useRef } from "react";
import { connect, shallowEqual } from "react-redux";
import { Button, ButtonGroup } from "@blueprintjs/core";
import _regl, { DrawCommand, Regl } from "regl";
import * as d3 from "d3";
import { mat3 } from "gl-matrix";
import memoize from "memoize-one";
import Async from "react-async";

import * as globals from "../../globals";
import _drawPoints from "./drawPointsRegl";
import { margin, width, height } from "./util";
import {
  createColorTable,
  createColorQuery,
} from "../../util/stateManager/colorHelpers";
import renderThrottle from "../../util/renderThrottle";
import {
  flagBackground,
  flagSelected,
  flagHighlight,
} from "../../util/glHelpers";
import { Dataframe, DataframeColumn } from "../../util/dataframe";
import { AppDispatch, RootState } from "../../reducers";
import _camera, { Camera } from "../../util/camera";
import { Dispatch } from "redux";
import { Level } from "../../reducers/controls";
import { AnnoMatrixObsCrossfilter } from "../../annoMatrix";

interface StateProps {
  level: Level;
  annoMatrix: Dataframe | null;
  crossfilter: AnnoMatrixObsCrossfilter | null;
  selectionTool: string;
  currentSelection: string[];
  layoutChoice: string;
  graphInteractionMode: string;
  colors: string[];
  pointDilation: number;
  genesets: string[];
  screenCap: boolean;
  mountCapture: boolean;
  imageUnderlay: boolean;
  spatial: boolean;
}
interface DispatchProps {
  dispatch: AppDispatch;
}

interface OwnProps {}

type Props = OwnProps & StateProps & DispatchProps;

const mapStateToProps = (state: RootState): StateProps => ({
  level: "top",
  minimized: false,
  annoMatrix: state.annoMatrix,
  crossfilter: state.obsCrossfilter,
  selectionTool: state.graphSelection.tool,
  currentSelection: state.graphSelection.selection,
  layoutChoice: state.layoutChoice,
  graphInteractionMode: state.controls.graphInteractionMode,
  colors: state.colors,
  pointDilation: state.pointDilation,
  genesets: state.genesets.genesets,
  screenCap: state.controls.screenCap,
  mountCapture: state.controls.mountCapture,
  imageUnderlay: state.controls.imageUnderlay,
  spatial: state.controls.unsMetadata.spatial,
});

const EmbeddingPanel = (props: Props) => {
  function createReglState(canvas: HTMLCanvasElement): {
    camera: Camera;
    regl: Regl;
    drawPoints: DrawCommand;
    pointBuffer: _regl.Buffer;
    colorBuffer: _regl.Buffer;
    flagBuffer: _regl.Buffer;
    // (seve): no spatial on first iteration
    // drawSpatialImage: DrawCommand;
  } {
    /*
        Must be created for each canvas
        */
    // setup canvas, webgl draw function and camera
    const camera = _camera(canvas);
    const regl = _regl(canvas);
    const drawPoints = _drawPoints(regl);
    // const drawSpatialImage = _drawSpatialImage(regl);
    // preallocate webgl buffers
    const pointBuffer = regl.buffer(0);
    const colorBuffer = regl.buffer(0);
    const flagBuffer = regl.buffer(0);
    return {
      camera,
      regl,
      drawPoints,
      pointBuffer,
      colorBuffer,
      flagBuffer,
      // drawSpatialImage,
    };
  }

  const { dispatch, level, minimized } = props;

  return (
    <div
      style={{
        position: "fixed",
        bottom:
          level === "top"
            ? globals.bottomToolbarGutter * 2
            : globals.bottomToolbarGutter,
        borderRadius: "3px 3px 0px 0px",
        left: globals.leftSidebarWidth + globals.scatterplotMarginLeft,
        padding: "0px 20px 20px 0px",
        background: "white",
        /* x y blur spread color */
        boxShadow: "0px 0px 3px 2px rgba(153,153,153,0.2)",
        zIndex: 2,
      }}
      id="scatterplot_wrapper"
    >
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
            dispatch({ type: "minimize/maximize scatterplot" });
          }}
        >
          {minimized ? "show scatterplot" : "hide"}
        </Button>
        <Button
          type="button"
          minimal
          data-testid="clear-scatterplot"
          onClick={() =>
            dispatch({
              type: "clear scatterplot",
            })
          }
        >
          remove
        </Button>
      </ButtonGroup>
      <div
        className={styles.scatterplot}
        id="scatterplot"
        style={{
          width: `${width + margin.left + margin.right}px`,
          height: `${(minimized ? 0 : height + margin.top) + margin.bottom}px`,
        }}
      >
        <canvas
          width={width}
          height={height}
          data-testid="scatterplot"
          style={{
            marginLeft: margin.left,
            marginTop: margin.top,
            display: minimized ? "none" : undefined,
          }}
          ref={this.setReglCanvas}
        />
        <Async
          watchFn={Scatterplot.watchAsync}
          promiseFn={this.fetchAsyncProps}
          watchProps={{
            annoMatrix,
            scatterplotXXaccessor,
            scatterplotYYaccessor,
            colors,
            crossfilter,
            pointDilation,
            viewport,
          }}
        >
          <Async.Pending initial>Loading...</Async.Pending>
          <Async.Rejected>{(error) => error.message}</Async.Rejected>
          <Async.Fulfilled>
            {(asyncProps) => {
              if (regl && !shallowEqual(asyncProps, this.renderCache)) {
                this.updateReglAndRender(asyncProps);
              }
              return (
                <ScatterplotAxis
                  // @ts-expect-error ts-migrate(2322) FIXME: Type '{ minimized: any; scatterplotYYaccessor: any... Remove this comment to see the full error message
                  minimized={minimized}
                  scatterplotYYaccessor={scatterplotYYaccessor}
                  scatterplotXXaccessor={scatterplotXXaccessor}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
                  xScale={(asyncProps as any).xScale}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
                  yScale={(asyncProps as any).yScale}
                />
              );
            }}
          </Async.Fulfilled>
        </Async>
      </div>
    </div>
  );
};

export default connect(mapStateToProps)(EmbeddingPanel);
