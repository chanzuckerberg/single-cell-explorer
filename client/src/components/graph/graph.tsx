import React, { MouseEvent, MouseEventHandler } from "react";
import * as d3 from "d3";
import { toPng } from "html-to-image";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used as @connect
import { connect, shallowEqual } from "react-redux";
import { ReadonlyMat3, mat3, vec2 } from "gl-matrix";
import _regl, { DrawCommand, Regl, TextureImageData } from "regl";
import memoize from "memoize-one";
import Async from "react-async";
import { Button } from "@blueprintjs/core";

import { setupBrush, setupLasso } from "./setupSVGandBrush";
import _camera, { Camera } from "../../util/camera";
import _drawPoints from "./drawPointsRegl";
import _drawSpatialImage from "./drawSpatialImageRegl";
import {
  createColorTable,
  createColorQuery,
  ColorTable,
} from "../../util/stateManager/colorHelpers";
import * as globals from "../../globals";

import GraphOverlayLayer from "./overlays/graphOverlayLayer";
import CentroidLabels from "./overlays/centroidLabels";
import actions from "../../actions";
import renderThrottle from "../../util/renderThrottle";
import { getFeatureFlag } from "../../util/featureFlags/featureFlags";
import { FEATURES } from "../../util/featureFlags/features";
import {
  flagBackground,
  flagSelected,
  flagHighlight,
} from "../../util/glHelpers";
import { Dataframe } from "../../util/dataframe";
import { RootState } from "../../reducers";
import { LassoFunctionWithAttributes } from "./setupLasso";
import { Field } from "../../common/types/schema";
import { Query } from "../../annoMatrix/query";
import { DatasetUnsMetadata } from "../../common/types/entities";

/*
Simple 2D transforms control all point painting.  There are three:
  * model - convert from underlying per-point coordinate to a layout.
    Currently used to move from data to webgl coordinate system.
  * camera - apply a 2D camera transformation (pan, zoom)
  * projection - apply any transformation required for screen size and layout
*/
function createProjectionTF(viewportWidth: number, viewportHeight: number) {
  /*
  the projection transform accounts for the screen size & other layout
  */
  const fractionToUse = 0.95; // fraction of min dimension to use
  const topGutterSizePx = 32; // top gutter for tools
  const bottomGutterSizePx = 32; // bottom gutter for tools
  const heightMinusGutter =
    viewportHeight - topGutterSizePx - bottomGutterSizePx;
  const minDim = Math.min(viewportWidth, heightMinusGutter);
  const aspectScale = new Float32Array([
    (fractionToUse * minDim) / viewportWidth,
    (fractionToUse * minDim) / viewportHeight,
  ]);
  const m = mat3.create();
  mat3.fromTranslation(m, [
    0,
    (bottomGutterSizePx - topGutterSizePx) / viewportHeight / aspectScale[1],
  ]);
  mat3.scale(m, m, aspectScale);
  return m;
}

function createModelTF() {
  /*
  preallocate coordinate system transformation between data and gl.
  Data arrives in a [0,1] range, and we operate elsewhere in [-1,1].
  */
  const m = mat3.fromScaling(mat3.create(), [2, 2]);
  mat3.translate(m, m, [-0.5, -0.5]);
  return m;
}

type GraphState = {
  regl: Regl | null;
  drawPoints: DrawCommand | null;
  colorBuffer: _regl.Buffer | null;
  pointBuffer: _regl.Buffer | null;
  flagBuffer: _regl.Buffer | null;
  camera: Camera | null;
  projectionTF: mat3;
  tool: LassoFunctionWithAttributes | d3.BrushBehavior<unknown> | null;
  container: d3.Selection<SVGGElement, unknown, HTMLElement, any> | null;
  // used?
  updateOverlay: boolean;
  toolSVG: d3.Selection<SVGGElement, number, HTMLElement, any> | null;
  viewport: { width: number; height: number };
  layoutState: {
    layoutDf: Dataframe | null;
    layoutChoice: string | null;
  };
  colorState: {
    colors: string[] | null;
    colorDf: Dataframe | null;
    colorTable: Dataframe | null;
  };
  pointDilationState: {
    pointDilation: string | null;
    pointDilationDf: Dataframe | null;
  };
  modelTF: ReadonlyMat3;
  modelInvTF: ReadonlyMat3;
  testImageSrc: string | null;
  drawSpatialImage: DrawCommand | null;
};
interface GraphAsyncProps {
  positions: Float32Array;
  colors: Float32Array;
  flags: Float32Array;
  width: number;
  height: number;
  unsMetadata: DatasetUnsMetadata;
  imageUnderlay: boolean;
  screenCap: boolean;
}

type GraphProps = Partial<RootState>;
// @ts-expect-error ts-migrate(1238) FIXME: Unable to resolve signature of class decorator whe... Remove this comment to see the full error message
@connect((state: RootState) => ({
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
  unsMetadata: state.controls.unsMetadata,
}))
class Graph extends React.Component<GraphProps, GraphState> {
  static createReglState(canvas: HTMLCanvasElement): {
    camera: Camera;
    regl: Regl;
    drawPoints: DrawCommand;
    pointBuffer: _regl.Buffer;
    colorBuffer: _regl.Buffer;
    flagBuffer: _regl.Buffer;
    drawSpatialImage: DrawCommand;
  } {
    /*
        Must be created for each canvas
        */
    // setup canvas, webgl draw function and camera
    const camera = _camera(canvas);
    const regl = _regl(canvas);
    const drawPoints = _drawPoints(regl);
    const drawSpatialImage = _drawSpatialImage(regl);
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
      drawSpatialImage,
    };
  }

  static watchAsync(props: GraphProps, prevProps: GraphProps): boolean {
    return !shallowEqual(props.watchProps, prevProps.watchProps);
  }

  isSpatial = false;

  spatialImage: TextureImageData | null = null;

  /**
   * (thuang): This prevents re-rendering causes a second image download
   */
  private isDownloadingImage = false;

  private graphRef = React.createRef<HTMLDivElement>();

  private underlayImage: HTMLImageElement = new Image();

  cachedAsyncProps: GraphAsyncProps | null;

  reglCanvas: HTMLCanvasElement | null;

  computePointPositions = memoize((X, Y, modelTF) => {
    /*
        compute the model coordinate for each point
        */
    const positions = new Float32Array(2 * X.length);
    for (let i = 0, len = X.length; i < len; i += 1) {
      const p = vec2.fromValues(X[i], Y[i]);
      vec2.transformMat3(p, p, modelTF);
      positions[2 * i] = p[0];
      positions[2 * i + 1] = p[1];
    }
    return positions;
  });

  computeSelectedFlags = memoize(
    (crossfilter, _flagSelected, _flagUnselected) => {
      const x = crossfilter.fillByIsSelected(
        new Float32Array(crossfilter.size()),
        _flagSelected,
        _flagUnselected
      );
      return x;
    }
  );

  computeHighlightFlags = memoize(
    (nObs, pointDilationData, pointDilationLabel) => {
      const flags = new Float32Array(nObs);
      if (pointDilationData) {
        for (let i = 0, len = flags.length; i < len; i += 1) {
          if (pointDilationData[i] === pointDilationLabel) {
            flags[i] = flagHighlight;
          }
        }
      }
      return flags;
    }
  );

  computeColorByFlags = memoize((nObs, colorByData) => {
    const flags = new Float32Array(nObs);
    if (colorByData) {
      for (let i = 0, len = flags.length; i < len; i += 1) {
        const val = colorByData[i];
        if (typeof val === "number" && !Number.isFinite(val)) {
          flags[i] = flagBackground;
        }
      }
    }
    return flags;
  });

  computePointFlags = memoize(
    (crossfilter, colorByData, pointDilationData, pointDilationLabel) => {
      /*
        We communicate with the shader using three flags:
        - isNaN -- the value is a NaN. Only makes sense when we have a colorAccessor
        - isSelected -- the value is selected
        - isHightlighted -- the value is highlighted in the UI (orthogonal from selection highlighting)

        Due to constraints in webgl vertex shader attributes, these are encoded in a float, "kinda"
        like bitmasks.

        We also have separate code paths for generating flags for categorical and
        continuous metadata, as they rely on different tests, and some of the flags
        (eg, isNaN) are meaningless in the face of categorical metadata.
        */
      const nObs = crossfilter.size();
      const flags = new Float32Array(nObs);
      const selectedFlags = this.computeSelectedFlags(
        crossfilter,
        flagSelected,
        0
      );
      const highlightFlags = this.computeHighlightFlags(
        nObs,
        pointDilationData,
        pointDilationLabel
      );
      const colorByFlags = this.computeColorByFlags(nObs, colorByData);
      for (let i = 0; i < nObs; i += 1) {
        flags[i] = selectedFlags[i] + highlightFlags[i] + colorByFlags[i];
      }
      return flags;
    }
  );

  constructor(props: GraphProps) {
    super(props);
    const viewport = this.getViewportDimensions();
    this.reglCanvas = null;
    this.cachedAsyncProps = null;
    const modelTF = createModelTF();
    this.state = {
      toolSVG: null,
      tool: null,
      container: null,
      viewport,
      // projection
      camera: null,
      modelTF,
      modelInvTF: mat3.invert(mat3.create(), modelTF),
      projectionTF: createProjectionTF(viewport.width, viewport.height),
      // regl state
      regl: null,
      drawPoints: null,
      pointBuffer: null,
      colorBuffer: null,
      flagBuffer: null,
      drawSpatialImage: null,
      // component rendering derived state - these must stay synchronized
      // with the reducer state they were generated from.
      layoutState: {
        layoutDf: null,
        layoutChoice: null,
      },
      colorState: {
        colors: null,
        colorDf: null,
        colorTable: null,
      },
      pointDilationState: {
        pointDilation: null,
        pointDilationDf: null,
      },
      updateOverlay: false,
      testImageSrc: null,
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
  componentDidMount() {
    window.addEventListener("resize", this.handleResize);
    if (this.graphRef.current) {
      this.graphRef.current.addEventListener("wheel", this.disableScroll, {
        passive: false,
      });
    }
  }

  componentDidUpdate(prevProps: GraphProps, prevState: GraphState): void {
    const { selectionTool, currentSelection, graphInteractionMode } =
      this.props;
    const { toolSVG, viewport } = this.state;
    const hasResized =
      prevState.viewport.height !== viewport.height ||
      prevState.viewport.width !== viewport.width;
    let stateChanges: Partial<GraphState> = {};
    if (
      (viewport.height && viewport.width && !toolSVG) || // first time init
      hasResized || //  window size has changed we want to recreate all SVGs
      selectionTool !== prevProps.selectionTool || // change of selection tool
      prevProps.graphInteractionMode !== graphInteractionMode // lasso/zoom mode is switched
    ) {
      stateChanges = {
        ...stateChanges,
        ...this.createToolSVG(),
      };
    }
    /*
        if the selection tool or state has changed, ensure that the selection
        tool correctly reflects the underlying selection.
        */
    if (
      currentSelection !== prevProps.currentSelection ||
      graphInteractionMode !== prevProps.graphInteractionMode ||
      stateChanges.toolSVG
    ) {
      const { tool, container } = this.state;
      this.selectionToolUpdate(
        stateChanges.tool ? stateChanges.tool : tool!,
        stateChanges.container ? stateChanges.container : container!
      );
    }
    if (Object.keys(stateChanges).length > 0) {
      this.setState((state) => ({ ...state, ...stateChanges }));
    }
  }

  componentWillUnmount(): void {
    window.removeEventListener("resize", this.handleResize);
    if (this.graphRef.current) {
      this.graphRef.current.removeEventListener("wheel", this.disableScroll);
    }
  }

  handleResize = (): void => {
    const viewport = this.getViewportDimensions();
    const projectionTF = createProjectionTF(viewport.width, viewport.height);
    this.setState((state) => ({
      ...state,
      viewport,
      projectionTF,
    }));
  };

  handleCanvasEvent: MouseEventHandler<HTMLCanvasElement> = (e) => {
    const { camera, projectionTF } = this.state;
    if (e.type !== "wheel") e.preventDefault();
    if (
      camera?.handleEvent(
        e as unknown as MouseEvent<
          HTMLCanvasElement,
          MouseEvent<Element, MouseEvent>
        >,
        projectionTF
      )
    ) {
      this.renderCanvas();
      this.setState((state: GraphState) => ({
        ...state,
        updateOverlay: !state.updateOverlay,
      }));
    }
  };

  handleBrushDragAction(): void {
    /*
          event describing brush position:
          @-------|
          |       |
          |       |
          |-------@
        */
    // ignore programmatically generated events
    const { camera } = this.state;
    if (
      d3.event.sourceEvent === null ||
      !d3.event.selection ||
      !camera // ignore if camera not initialized
    )
      return;
    const { dispatch, layoutChoice } = this.props;
    const s = d3.event.selection;
    const northwest = this.mapScreenToPoint(s[0]);
    const southeast = this.mapScreenToPoint(s[1]);
    const [minX, maxY] = northwest;
    const [maxX, minY] = southeast;
    dispatch(
      actions.graphBrushChangeAction(layoutChoice.current, {
        minX,
        minY,
        maxX,
        maxY,
        northwest,
        southeast,
      })
    );
  }

  handleBrushStartAction(): void {
    // Ignore programmatically generated events.
    if (!d3.event.sourceEvent) return;
    const { dispatch } = this.props;
    dispatch(actions.graphBrushStartAction());
  }

  handleBrushEndAction(): void {
    const { camera } = this.state;
    // Ignore programmatically generated events. Also abort if camera not initialized.
    if (!d3.event.sourceEvent || !camera) return;
    /*
        coordinates will be included if selection made, null
        if selection cleared.
        */
    const { dispatch, layoutChoice } = this.props;
    const s = d3.event.selection;
    if (s) {
      const northwest = this.mapScreenToPoint(s[0]);
      const southeast = this.mapScreenToPoint(s[1]);
      const [minX, maxY] = northwest;
      const [maxX, minY] = southeast;
      dispatch(
        actions.graphBrushEndAction(layoutChoice.current, {
          minX,
          minY,
          maxX,
          maxY,
          northwest,
          southeast,
        })
      );
    } else {
      dispatch(actions.graphBrushDeselectAction(layoutChoice.current));
    }
  }

  handleBrushDeselectAction(): void {
    const { dispatch, layoutChoice } = this.props;
    dispatch(actions.graphBrushDeselectAction(layoutChoice.current));
  }

  handleLassoStart(): void {
    const { dispatch } = this.props;
    dispatch(actions.graphLassoStartAction());
  }

  // when a lasso is completed, filter to the points within the lasso polygon
  handleLassoEnd(polygon: [number, number][]): void {
    const minimumPolygonArea = 10;
    const { dispatch, layoutChoice } = this.props;
    if (
      polygon.length < 3 ||
      Math.abs(d3.polygonArea(polygon)) < minimumPolygonArea
    ) {
      // if less than three points, or super small area, treat as a clear selection.
      dispatch(actions.graphLassoDeselectAction(layoutChoice.current));
    } else {
      dispatch(
        actions.graphLassoEndAction(
          layoutChoice.current,
          polygon.map((xy) => this.mapScreenToPoint(xy))
        )
      );
    }
  }

  handleLassoCancel(): void {
    const { dispatch, layoutChoice } = this.props;
    dispatch(actions.graphLassoCancelAction(layoutChoice.current));
  }

  handleLassoDeselectAction(): void {
    const { dispatch, layoutChoice } = this.props;
    dispatch(actions.graphLassoDeselectAction(layoutChoice.current));
  }

  handleDeselectAction(): void {
    const { selectionTool } = this.props;
    if (selectionTool === "brush") this.handleBrushDeselectAction();
    if (selectionTool === "lasso") this.handleLassoDeselectAction();
  }

  disableScroll = (event: WheelEvent): void => {
    // disables browser scrolling behavior when hovering over the graph
    event.preventDefault();
  };

  setReglCanvas = (canvas: HTMLCanvasElement): void => {
    // Ignore null canvas on unmount
    if (!canvas) {
      return;
    }
    this.reglCanvas = canvas;
    this.setState({
      ...Graph.createReglState(canvas),
    });
  };

  getViewportDimensions = (): { height: number; width: number } => {
    const { viewportRef } = this.props;
    return {
      height: viewportRef.clientHeight,
      width: viewportRef.clientWidth,
    };
  };

  createToolSVG = ():
    | d3.Selection<SVGGElement, unknown, HTMLElement, any>
    | undefined
    | object => {
    /*
        Called from componentDidUpdate. Create the tool SVG, and return any
        state changes that should be passed to setState().
        */
    const { selectionTool, graphInteractionMode } = this.props;
    const { viewport } = this.state;
    /* clear out whatever was on the div, even if nothing, but usually the brushes etc */
    const lasso = d3.select("#lasso-layer");
    if (lasso.empty()) return {}; // still initializing
    lasso.selectAll(".lasso-group").remove();
    // Don't render or recreate toolSVG if currently in zoom mode
    if (graphInteractionMode !== "select") {
      // don't return "change" of state unless we are really changing it!
      const { toolSVG } = this.state;
      if (toolSVG === undefined) return {};
      return { toolSVG: undefined };
    }
    let handleStart;
    let handleDrag;
    let handleEnd;
    let handleCancel;
    let ret;

    if (selectionTool === "brush") {
      handleStart = this.handleBrushStartAction.bind(this);
      handleDrag = this.handleBrushDragAction.bind(this);
      handleEnd = this.handleBrushEndAction.bind(this);
      ret = setupBrush({
        selectionToolType: selectionTool,
        handleStartAction: handleStart,
        handleDragAction: handleDrag,
        handleEndAction: handleEnd,
        handleCancelAction: handleCancel,
        viewport,
      });
    } else {
      handleStart = this.handleLassoStart.bind(this);
      handleEnd = this.handleLassoEnd.bind(this);
      handleCancel = this.handleLassoCancel.bind(this);
      ret = setupLasso({
        selectionToolType: selectionTool,
        handleStartAction: handleStart,
        handleEndAction: handleEnd,
        handleCancelAction: handleCancel,
      });
    }
    if (!ret) return {};
    const { svg: newToolSVG, container, tool } = ret;
    return { toolSVG: newToolSVG, tool, container };
  };

  loadTextureFromProp = async (src: string): Promise<HTMLImageElement> => {
    this.underlayImage.crossOrigin = "anonymous";
    this.underlayImage.src = src;

    await new Promise((resolve, reject) => {
      this.underlayImage.onload = () => resolve(this.underlayImage);
      this.underlayImage.onerror = reject;
    });

    return this.underlayImage;
  };

  fetchAsyncProps = async (props: GraphProps): Promise<GraphAsyncProps> => {
    const {
      annoMatrix,
      colors: colorsProp,
      layoutChoice,
      crossfilter,
      pointDilation,
      viewport,
      imageUnderlay,
      screenCap,
      unsMetadata,
    } = props.watchProps;
    const { modelTF } = this.state;
    const [layoutDf, colorDf, pointDilationDf] = await this.fetchData(
      annoMatrix,
      layoutChoice,
      colorsProp,
      pointDilation
    );
    const { currentDimNames } = layoutChoice;

    const X = layoutDf.col(currentDimNames[0]).asArray();
    const Y = layoutDf.col(currentDimNames[1]).asArray();

    const positions = this.computePointPositions(X, Y, modelTF);
    const colorTable = this.updateColorTable(colorsProp, colorDf);
    const colorByData = colorDf?.icol(0)?.asArray();
    const {
      metadataField: pointDilationCategory,
      categoryField: pointDilationLabel,
    } = pointDilation;
    const pointDilationData = pointDilationDf
      ?.col(pointDilationCategory)
      ?.asArray();
    const flags = this.computePointFlags(
      crossfilter,
      colorByData,
      pointDilationData,
      pointDilationLabel
    );

    this.isSpatial = getFeatureFlag(FEATURES.SPATIAL);

    this.spatialImage =
      this.isSpatial && unsMetadata.spatial.image
        ? await this.loadTextureFromProp(
            `data:image/webp;base64,${unsMetadata.spatial.image}`
          )
        : null;

    const { width, height } = viewport;
    return {
      positions,
      colors: colorTable.rgb,
      flags,
      width,
      height,
      imageUnderlay,
      screenCap,
      unsMetadata,
    };
  };

  async fetchData(
    annoMatrix: RootState["annoMatrix"],
    layoutChoice: RootState["layoutChoice"],
    colors: RootState["colors"],
    pointDilation: RootState["pointDilation"]
  ): Promise<[Dataframe, Dataframe | null, Dataframe | null]> {
    /*
        fetch all data needed.  Includes:
          - the color by dataframe
          - the layout dataframe
          - the point dilation dataframe
        */
    const { metadataField: pointDilationAccessor } = pointDilation;
    const query = this.createColorByQuery(colors);
    const promises: [
      Promise<Dataframe>,
      Promise<Dataframe | null>,
      Promise<Dataframe | null>
    ] = [
      annoMatrix.fetch("emb", layoutChoice.current, globals.numBinsEmb),
      query
        ? annoMatrix.fetch(...query, globals.numBinsObsX)
        : Promise.resolve(null),
      pointDilationAccessor
        ? annoMatrix.fetch("obs", pointDilationAccessor)
        : Promise.resolve(null),
    ];
    return Promise.all(promises);
  }

  brushToolUpdate(
    tool: d3.BrushBehavior<unknown>,
    container: d3.Selection<SVGGElement, unknown, HTMLElement, d3.BaseType>
  ): void {
    /*
        this is called from componentDidUpdate(), so be very careful using
        anything from this.state, which may be updated asynchronously.
        */
    const { currentSelection } = this.props;
    const node = container.node();
    if (node) {
      const toolCurrentSelection = d3.brushSelection(node);
      if (currentSelection.mode === "within-rect") {
        /*
                if there is a selection, make sure the brush tool matches
                */
        const screenCoords = [
          this.mapPointToScreen(currentSelection.brushCoords.northwest),
          this.mapPointToScreen(currentSelection.brushCoords.southeast),
        ];
        if (!toolCurrentSelection) {
          /* tool is not selected, so just move the brush */
          container.call(tool.move, screenCoords);
        } else {
          /* there is an active selection and a brush - make sure they match */
          /* this just sums the difference of each dimension, of each point */
          let delta = 0;
          for (let x = 0; x < 2; x += 1) {
            for (let y = 0; y < 2; y += 1) {
              delta += Math.abs(
                screenCoords[x][y] -
                  (toolCurrentSelection as [number, number][])[x][y]
              );
            }
          }
          if (delta > 0) {
            container.call(tool.move, screenCoords);
          }
        }
      } else if (toolCurrentSelection) {
        /* no selection, so clear the brush tool if it is set */
        container.call(tool.move, null);
      }
    }
  }

  lassoToolUpdate(tool: LassoFunctionWithAttributes): void {
    /*
        this is called from componentDidUpdate(), so be very careful using
        anything from this.state, which may be updated asynchronously.
        */
    const { currentSelection } = this.props;
    if (currentSelection.mode === "within-polygon") {
      /*
            if there is a current selection, make sure the lasso tool matches
            */
      const polygon = currentSelection.polygon.map((p: [number, number]) =>
        this.mapPointToScreen(p)
      );
      tool.move(polygon);
    } else {
      tool.reset();
    }
  }

  selectionToolUpdate(
    tool: GraphState["tool"],
    container: d3.Selection<SVGGElement, unknown, HTMLElement, SVGGElement>
  ): void {
    /*
        this is called from componentDidUpdate(), so be very careful using
        anything from this.state, which may be updated asynchronously.
        */
    const { selectionTool } = this.props;
    switch (selectionTool) {
      case "brush":
        this.brushToolUpdate(tool as d3.BrushBehavior<unknown>, container);
        break;
      case "lasso":
        this.lassoToolUpdate(tool as LassoFunctionWithAttributes);
        break;
      default:
        /* punt? */
        break;
    }
  }

  mapScreenToPoint(pin: [number, number]): vec2 {
    /*
        Map an XY coordinates from screen domain to cell/point range,
        accounting for current pan/zoom camera.
        */
    const { camera, projectionTF, modelInvTF, viewport } = this.state;
    const cameraInvTF = camera ? camera.invView() : null;
    /* screen -> gl */
    const x = (2 * pin[0]) / viewport.width - 1;
    const y = 2 * (1 - pin[1] / viewport.height) - 1;
    const xy = vec2.fromValues(x, y);
    const projectionInvTF = mat3.invert(mat3.create(), projectionTF);
    vec2.transformMat3(xy, xy, projectionInvTF);
    if (cameraInvTF) {
      vec2.transformMat3(xy, xy, cameraInvTF);
    }
    vec2.transformMat3(xy, xy, modelInvTF);
    return xy;
  }

  mapPointToScreen(xyCell: [number, number]): [number, number] {
    /*
        Map an XY coordinate from cell/point domain to screen range.  Inverse
        of mapScreenToPoint()
        */
    const { camera, projectionTF, modelTF, viewport } = this.state;
    const cameraTF = camera?.view() || undefined;
    const xy = vec2.transformMat3(vec2.create(), xyCell, modelTF);
    if (cameraTF) {
      vec2.transformMat3(xy, xy, cameraTF);
    }
    vec2.transformMat3(xy, xy, projectionTF);
    return [
      Math.round(((xy[0] + 1) * viewport.width) / 2),
      Math.round(-((xy[1] + 1) / 2 - 1) * viewport.height),
    ];
  }

  renderCanvas = renderThrottle(() => {
    const {
      regl,
      drawPoints,
      colorBuffer,
      pointBuffer,
      flagBuffer,
      camera,
      projectionTF,
      drawSpatialImage,
    } = this.state;
    this.renderPoints(
      regl,
      drawPoints,
      colorBuffer,
      pointBuffer,
      flagBuffer,
      camera,
      projectionTF,
      drawSpatialImage
    );
  });

  updateReglAndRender(
    asyncProps: GraphAsyncProps,
    prevAsyncProps: GraphAsyncProps | null
  ): void {
    const {
      positions,
      colors,
      flags,
      height,
      width,
      imageUnderlay,
      screenCap,
    } = asyncProps;

    this.cachedAsyncProps = asyncProps;
    const { pointBuffer, colorBuffer, flagBuffer } = this.state;
    let needToRenderCanvas = false;
    if (height !== prevAsyncProps?.height || width !== prevAsyncProps?.width) {
      needToRenderCanvas = true;
    }
    if (positions !== prevAsyncProps?.positions) {
      // @ts-expect-error (seve): need to look into arg mismatch
      pointBuffer?.({ data: positions, dimension: 2 });
      needToRenderCanvas = true;
    }
    if (colors !== prevAsyncProps?.colors) {
      // @ts-expect-error (seve): need to look into arg mismatch
      colorBuffer?.({ data: colors, dimension: 3 });
      needToRenderCanvas = true;
    }
    if (flags !== prevAsyncProps?.flags) {
      // @ts-expect-error (seve): need to look into arg mismatch
      flagBuffer?.({ data: flags, dimension: 1 });
      needToRenderCanvas = true;
    }
    if (imageUnderlay !== prevAsyncProps?.imageUnderlay) {
      needToRenderCanvas = true;
    }
    if (screenCap && screenCap !== prevAsyncProps?.screenCap) {
      needToRenderCanvas = true;
    }

    if (needToRenderCanvas) {
      this.renderCanvas();
    }
  }

  updateColorTable(
    colors: RootState["colors"],
    colorDf: Dataframe | null
  ): ColorTable {
    const { annoMatrix } = this.props;
    const { schema } = annoMatrix;
    /* update color table state */
    if (!colors || !colorDf) {
      return createColorTable(
        null, // default mode
        null,
        null,
        schema,
        null
      );
    }
    const { colorAccessor, userColors, colorMode } = colors;
    return createColorTable(
      colorMode,
      colorAccessor,
      colorDf,
      schema,
      userColors
    );
  }

  createColorByQuery(colors: RootState["colors"]): [Field, Query] | null {
    const { annoMatrix, genesets } = this.props;
    const { schema } = annoMatrix;
    const { colorMode, colorAccessor } = colors;
    return createColorQuery(colorMode, colorAccessor, schema, genesets);
  }

  async renderPoints(
    regl: GraphState["regl"],
    drawPoints: GraphState["drawPoints"],
    colorBuffer: GraphState["colorBuffer"],
    pointBuffer: GraphState["pointBuffer"],
    flagBuffer: GraphState["flagBuffer"],
    camera: GraphState["camera"],
    projectionTF: GraphState["projectionTF"],
    drawSpatialImage: GraphState["drawSpatialImage"]
  ): Promise<void> {
    const {
      annoMatrix,
      dispatch,
      screenCap,
      mountCapture,
      layoutChoice,
      imageUnderlay,
      unsMetadata,
    } = this.props;
    if (!this.reglCanvas || !annoMatrix) return;
    const { schema } = annoMatrix;
    const cameraTF = camera?.view();

    const projView = mat3.multiply(
      mat3.create(),
      projectionTF,
      cameraTF || mat3.create()
    );
    const { width, height } = this.reglCanvas;

    regl?.poll();
    regl?.clear({
      depth: 1,
      color: [1, 1, 1, 1],
    });

    if (drawPoints) {
      drawPoints({
        distance: camera?.distance(),
        color: colorBuffer,
        position: pointBuffer,
        flag: flagBuffer,
        count: annoMatrix.nObs,
        projView,
        nPoints: schema.dataframe.nObs,
        minViewportDimension: Math.min(width, height),
      });
    }
    if (
      imageUnderlay &&
      drawSpatialImage &&
      layoutChoice.current === "spatial" &&
      this.isSpatial &&
      unsMetadata.spatial &&
      this.spatialImage
    ) {
      const imW = unsMetadata.spatial.imageWidth;
      const imH = unsMetadata.spatial.imageHeight;
      drawSpatialImage({
        projView,
        imageWidth: imW,
        imageHeight: imH,
        rectCoords: [0, 0, imW, 0, 0, imH, 0, imH, imW, 0, imW, imH],
        spatialImageAsTexture: regl?.texture({
          data: this.spatialImage,
          wrapS: "clamp",
          wrapT: "clamp",
        }),
      });
    }

    if (screenCap && regl && !this.isDownloadingImage) {
      /**
       * (thuang): This prevents re-rendering causes a second image download
       */
      this.isDownloadingImage = true;

      const graph = regl._gl.canvas;
      const imageURI = await toPng(graph as HTMLCanvasElement, {
        backgroundColor: "white",
        height,
        width,
        // the library is having issues with loading bp3 icons, its checking `/static/static/images` for some reason
        skipFonts: true,
      });
      if (mountCapture) {
        this.setState({ testImageSrc: imageURI });
        dispatch({ type: "test: screencap end" });
      } else {
        const a = document.createElement("a");
        a.href = imageURI;
        a.download = `${layoutChoice.current.split(";;").at(-1)}_emb.png`;
        a.style.display = "none";
        document.body.append(a);
        a.click();
        // Revoke the blob URL and remove the element.
        setTimeout(() => {
          URL.revokeObjectURL(imageURI);
          a.remove();
        }, 1000);
        dispatch({ type: "graph: screencap end" });
        this.isDownloadingImage = false;
      }
    }

    regl?._gl.flush();
  }

  render(): JSX.Element {
    const {
      graphInteractionMode,
      annoMatrix,
      colors,
      layoutChoice,
      pointDilation,
      crossfilter,
      screenCap,
      imageUnderlay,
      unsMetadata,
    } = this.props;
    const { modelTF, projectionTF, camera, viewport, regl, testImageSrc } =
      this.state;
    const cameraTF = camera?.view()?.slice();

    return (
      <div
        id="graph-wrapper"
        style={{
          position: "relative",
          top: 0,
          left: 0,
        }}
        data-testid="graph-wrapper"
        data-camera-distance={camera?.distance()}
        ref={this.graphRef}
      >
        <GraphOverlayLayer
          /**  @ts-expect-error TODO: type GraphOverlayLayer**/
          width={viewport.width}
          height={viewport.height}
          cameraTF={cameraTF}
          modelTF={modelTF}
          projectionTF={projectionTF}
          handleCanvasEvent={
            graphInteractionMode === "zoom" ? this.handleCanvasEvent : undefined
          }
        >
          <CentroidLabels />
        </GraphOverlayLayer>
        <svg
          id="lasso-layer"
          data-testid="layout-overlay"
          className="graph-svg"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 1,
          }}
          width={viewport.width}
          height={viewport.height}
          pointerEvents={graphInteractionMode === "select" ? "auto" : "none"}
        />
        <canvas
          width={viewport.width}
          height={viewport.height}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            padding: 0,
            margin: 0,
            shapeRendering: "crispEdges",
          }}
          className="graph-canvas"
          data-testid="layout-graph"
          ref={this.setReglCanvas}
          onMouseDown={this.handleCanvasEvent}
          onMouseUp={this.handleCanvasEvent}
          onMouseMove={this.handleCanvasEvent}
          onDoubleClick={this.handleCanvasEvent}
          onWheel={this.handleCanvasEvent}
        />
        {testImageSrc && (
          <img
            width={viewport.width}
            height={viewport.height}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              padding: 0,
              margin: 0,
            }}
            alt=""
            data-testid="graph-image"
            src={testImageSrc}
          />
        )}
        <Async
          watchFn={Graph.watchAsync}
          promiseFn={this.fetchAsyncProps}
          watchProps={{
            annoMatrix,
            colors,
            layoutChoice,
            pointDilation,
            crossfilter,
            viewport,
            screenCap,
            imageUnderlay,
            unsMetadata,
          }}
        >
          <Async.Pending initial>
            <StillLoading
              displayName={layoutChoice.current}
              width={viewport.width}
              height={viewport.height}
            />
          </Async.Pending>
          <Async.Rejected>
            {(error) => (
              <ErrorLoading
                displayName={layoutChoice.current}
                error={error}
                width={viewport.width}
                height={viewport.height}
              />
            )}
          </Async.Rejected>
          <Async.Fulfilled>
            {(asyncProps: GraphAsyncProps) => {
              if (regl && !shallowEqual(asyncProps, this.cachedAsyncProps)) {
                this.updateReglAndRender(asyncProps, this.cachedAsyncProps);
              }
              return null;
            }}
          </Async.Fulfilled>
        </Async>
      </div>
    );
  }
}

type ErrorLoadingProps = {
  displayName: string;
  error: Error;
  width: number;
  height: number;
};

const ErrorLoading = ({
  displayName,
  error,
  width,
  height,
}: ErrorLoadingProps) => {
  console.error(error); // log to console as this is an unexpected error
  return (
    <div
      style={{
        position: "fixed",
        fontWeight: 500,
        top: height / 2,
        left: globals.leftSidebarWidth + width / 2 - 50,
      }}
    >
      <span>{`Failure loading ${displayName}`}</span>
    </div>
  );
};

type StillLoadingProps = {
  displayName: string;
  width: number;
  height: number;
};

const StillLoading = ({ displayName, width, height }: StillLoadingProps) => (
  /*
  Render a busy/loading indicator
  */
  <div
    style={{
      position: "fixed",
      fontWeight: 500,
      top: height / 2,
      width,
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        justifyItems: "center",
        alignItems: "center",
      }}
    >
      <Button minimal loading intent="primary" />
      <span style={{ fontStyle: "italic" }}>Loading {displayName}</span>
    </div>
  </div>
);
export default Graph;
