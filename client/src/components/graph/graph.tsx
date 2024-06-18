import React, { MouseEvent, MouseEventHandler } from "react";
import * as d3 from "d3";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used as @connect
import { connect, shallowEqual } from "react-redux";
import { mat3, vec2 } from "gl-matrix";
import _regl, { DrawCommand, Regl } from "regl";
import memoize from "memoize-one";
import Async, { AsyncProps } from "react-async";
import { Button, Icon } from "@blueprintjs/core";

import Openseadragon, { Viewer } from "openseadragon";

import { throttle } from "lodash";
import { IconNames } from "@blueprintjs/icons";
import { setupBrush, setupLasso } from "./setupSVGandBrush";
import _camera, { Camera } from "../../util/camera";
import _drawPoints from "./drawPointsRegl";
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

import {
  captureLegend,
  createModelTF,
  createProjectionTF,
  downloadImage,
  getSpatialPrefixUrl,
  getSpatialTileSources,
  loadImage,
  sidePanelAttributeNameChange,
} from "./util";

import { COMMON_CANVAS_STYLE } from "./constants";
import { THROTTLE_MS } from "../../util/constants";
import { GraphProps, OwnProps, GraphState, StateProps } from "./types";
import { isSpatialMode, shouldShowOpenseadragon } from "../../common/selectors";
import { fetchDeepZoomImageFailed } from "../../actions/config";
import { track } from "../../analytics";
import { EVENTS } from "../../analytics/events";

interface GraphAsyncProps {
  positions: Float32Array;
  colors: Float32Array;
  flags: Float32Array;
  width: number;
  height: number;
  imageUnderlay: boolean;
  screenCap: boolean;
}

const mapStateToProps = (state: RootState, ownProps: OwnProps): StateProps => ({
  annoMatrix: state.annoMatrix,
  crossfilter: state.obsCrossfilter,
  selectionTool: state.graphSelection.tool,
  currentSelection: state.graphSelection.selection,
  layoutChoice: ownProps.isSidePanel
    ? state.panelEmbedding.layoutChoice
    : state.layoutChoice,
  graphInteractionMode: state.controls.graphInteractionMode,
  colors: state.colors,
  pointDilation: state.pointDilation,
  genesets: state.genesets.genesets,
  screenCap: state.controls.screenCap,
  mountCapture: state.controls.mountCapture,
  imageUnderlay: state.controls.imageUnderlay,
  config: state.config,
});

class Graph extends React.Component<GraphProps, GraphState> {
  static createReglState(canvas: HTMLCanvasElement): {
    camera: Camera;
    regl: Regl;
    drawPoints: DrawCommand;
    pointBuffer: _regl.Buffer;
    colorBuffer: _regl.Buffer;
    flagBuffer: _regl.Buffer;
  } {
    /*
        Must be created for each canvas
        */
    // setup canvas, webgl draw function and camera
    const camera = _camera(canvas);
    const regl = _regl(canvas);
    const drawPoints = _drawPoints(regl);

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
    };
  }

  static watchAsync(
    watchProps: AsyncProps<GraphAsyncProps>,
    prevWatchProps: AsyncProps<GraphAsyncProps>
  ): boolean {
    return !shallowEqual(watchProps.watchProps, prevWatchProps.watchProps);
  }

  /**
   * (thuang): This prevents re-rendering causes a second image download
   */
  private isDownloadingImage = false;

  private graphRef = React.createRef<HTMLDivElement>();

  private underlayImage: HTMLImageElement = new Image();

  cachedAsyncProps: GraphAsyncProps | null;

  reglCanvas: HTMLCanvasElement | null;

  private openseadragon: Viewer | null = null;

  throttledHandleResize: () => void;

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
      projectionTF: createProjectionTF({
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
        isSpatialMode: isSpatialMode(props),
      }),
      // regl state
      regl: null,
      drawPoints: null,
      pointBuffer: null,
      colorBuffer: null,
      flagBuffer: null,
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
      isImageLayerInViewport: true,
    };

    this.throttledHandleResize = throttle(
      this.handleResize.bind(this),
      THROTTLE_MS,
      { trailing: true }
    );
  }

  componentDidMount() {
    window.addEventListener("resize", this.throttledHandleResize);

    if (this.graphRef.current) {
      this.graphRef.current.addEventListener("wheel", this.disableScroll, {
        passive: false,
      });
    }
  }

  componentDidUpdate(prevProps: GraphProps, prevState: GraphState): void {
    const {
      selectionTool,
      graphInteractionMode,
      screenCap,
      imageUnderlay,
      layoutChoice,
    } = this.props;

    const { toolSVG, viewport } = this.state;

    const hasResized =
      prevState.viewport.height !== viewport.height ||
      prevState.viewport.width !== viewport.width;

    let stateChanges: Partial<GraphState> = {};

    this.updateOpenSeadragon();

    if (prevProps.screenCap !== screenCap) {
      stateChanges = {
        ...stateChanges,
        viewport: this.getViewportDimensions(),
      };
    }
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

    if (Object.keys(stateChanges).length > 0) {
      this.setState((state) => ({ ...state, ...stateChanges }));
    }

    if (
      shouldShowOpenseadragon(prevProps) &&
      !shouldShowOpenseadragon(this.props)
    ) {
      this.destroyOpenseadragon();
    }

    if (prevProps.imageUnderlay && !imageUnderlay) {
      this.hideOpenseadragon();
    }

    if (!prevProps.imageUnderlay && imageUnderlay) {
      this.showOpenseadragon();
    }

    // Re-center when switching embedding mode
    if (prevProps.layoutChoice.current !== layoutChoice.current) {
      this.handleResize();
    }
  }

  componentWillUnmount(): void {
    window.removeEventListener("resize", this.throttledHandleResize);

    if (this.graphRef.current) {
      this.graphRef.current.removeEventListener("wheel", this.disableScroll);
    }
  }

  handleResize = (): void => {
    const viewport = this.getViewportDimensions();
    const projectionTF = createProjectionTF({
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      isSpatialMode: isSpatialMode(this.props),
    });

    this.setState((state) => ({
      ...state,
      viewport,
      projectionTF,
    }));

    this.handleGoHome();
  };

  handleGoHome = () => {
    const { camera } = this.state;

    camera?.goHome(this.openseadragon);
    this.renderCanvas();
  };

  handleRecenterButtonClick = () => {
    track(EVENTS.EXPLORER_RE_CENTER_EMBEDDING);

    this.handleGoHome();
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
        projectionTF,
        this.openseadragon
      )
    ) {
      this.renderCanvas();
      this.setState((state: GraphState) => ({
        ...state,
        updateOverlay: !state.updateOverlay,
      }));
    }
  };

  async handleBrushDragAction(): Promise<void> {
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

    await dispatch(
      actions.graphBrushChangeAction(layoutChoice?.current, {
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

  async handleBrushEndAction(): Promise<void> {
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
      await dispatch(
        actions.graphBrushEndAction(layoutChoice?.current, {
          minX,
          minY,
          maxX,
          maxY,
          northwest,
          southeast,
        })
      );
    } else {
      await dispatch(actions.graphBrushDeselectAction(layoutChoice?.current));
    }
  }

  async handleBrushDeselectAction(): Promise<void> {
    const { dispatch, layoutChoice } = this.props;
    await dispatch(actions.graphBrushDeselectAction(layoutChoice?.current));
  }

  handleLassoStart(): void {
    const { dispatch } = this.props;
    dispatch(actions.graphLassoStartAction());
  }

  // when a lasso is completed, filter to the points within the lasso polygon
  async handleLassoEnd(polygon: [number, number][]): Promise<void> {
    const minimumPolygonArea = 10;
    const { dispatch, layoutChoice } = this.props;

    if (
      polygon.length < 3 ||
      Math.abs(d3.polygonArea(polygon)) < minimumPolygonArea
    ) {
      // if less than three points, or super small area, treat as a clear selection.
      await dispatch(actions.graphLassoDeselectAction(layoutChoice?.current));
    } else {
      await dispatch(
        actions.graphLassoEndAction(
          layoutChoice?.current,
          polygon.map((xy) => this.mapScreenToPoint(xy))
        )
      );
    }
  }

  async handleLassoCancel(): Promise<void> {
    const { dispatch, layoutChoice } = this.props;

    await dispatch(actions.graphLassoCancelAction(layoutChoice?.current));
  }

  async handleLassoDeselectAction(): Promise<void> {
    const { dispatch, layoutChoice } = this.props;

    await dispatch(actions.graphLassoDeselectAction(layoutChoice?.current));
  }

  async handleDeselectAction(): Promise<void> {
    const { selectionTool } = this.props;
    if (selectionTool === "brush") await this.handleBrushDeselectAction();
    if (selectionTool === "lasso") await this.handleLassoDeselectAction();
  }

  async handleImageDownload(regl: GraphState["regl"]) {
    const { dispatch, screenCap, mountCapture, layoutChoice, colors } =
      this.props;

    if (!this.reglCanvas || !screenCap || !regl || this.isDownloadingImage) {
      return;
    }

    const { width, height } = this.reglCanvas;

    /**
     * (thuang): This prevents re-rendering causes a second image download
     */
    this.isDownloadingImage = true;

    const graphCanvas = regl._gl.canvas as HTMLCanvasElement;

    // Create an offscreen canvas
    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;

    const canvasContext = offscreenCanvas.getContext("2d");

    if (!canvasContext) {
      console.error("Failed to get 2D context for the offscreen canvas");
      this.isDownloadingImage = false;
      return;
    }

    try {
      const graphDataURL = graphCanvas.toDataURL();

      // Load both data URLs into image objects
      const graphImage = await loadImage(graphDataURL);

      // Fill the offscreen canvas with a white background
      canvasContext.fillStyle = "white";
      canvasContext.fillRect(
        0,
        0,
        offscreenCanvas.width,
        offscreenCanvas.height
      );

      /**
       * (thuang): This has to be done before the graph image is drawn,
       * so that the graph image is drawn on top of the OpenSeadragon image.
       */
      await this.drawImageLayerForDownload({ offscreenCanvas, canvasContext });

      // Draw the graph image on top, ensuring it covers the entire canvas
      canvasContext.drawImage(
        graphImage,
        0,
        0,
        offscreenCanvas.width,
        offscreenCanvas.height
      );

      const graphImageURI = offscreenCanvas.toDataURL("image/png");

      if (mountCapture) {
        this.setState(({ testImageSrc }) => ({
          /**
           * (thuang): We want to remove the test image if there's already one
           */
          testImageSrc: testImageSrc ? null : graphImageURI,
        }));

        dispatch({ type: "test: screencap end" });
      } else {
        downloadImage(graphImageURI, layoutChoice);

        let categoricalLegendImageURI: string | null = null;

        // without this, the legend is drawn offscreen
        const PADDING_PX = 100;

        categoricalLegendImageURI = await captureLegend(
          colors,
          canvasContext,
          PADDING_PX,
          categoricalLegendImageURI
        );

        if (categoricalLegendImageURI) {
          downloadImage(categoricalLegendImageURI);
        }
        track(EVENTS.EXPLORER_DOWNLOAD_COMPLETE, {
          embedding: layoutChoice.current,
        });
        dispatch({ type: "graph: screencap end" });
      }

      this.isDownloadingImage = false;
    } catch (error) {
      console.error(
        "Failed to load images or generate the final image:",
        error
      );
      this.isDownloadingImage = false;
    }
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
    const { viewportRef, screenCap } = this.props;

    if (screenCap) {
      const prevAspectRatio =
        viewportRef.clientHeight / viewportRef.clientWidth;

      // seve: Default to 1080p resolution (arbitrary, but a good starting point for screen captures)
      return {
        height: 1080 * prevAspectRatio,
        width: 1080,
      };
    }
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
    const {
      selectionTool,
      graphInteractionMode,
      isSidePanel = false,
    } = this.props;
    const { viewport } = this.state;
    /* clear out whatever was on the div, even if nothing, but usually the brushes etc */
    const lasso = d3.select(
      sidePanelAttributeNameChange(`#lasso-layer`, isSidePanel)
    );
    if (lasso.empty()) return {}; // still initializing
    lasso
      .selectAll(sidePanelAttributeNameChange(`.lasso-group`, isSidePanel))
      .remove();
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
        isSidePanel,
      });
    }
    if (!ret) return {};
    const { svg: newToolSVG, container, tool } = ret;
    return { toolSVG: newToolSVG, tool, container };
  };

  loadTextureFromProp = (src: string): HTMLImageElement => {
    this.underlayImage.src = src;
    return this.underlayImage;
  };

  fetchAsyncProps = async (
    props: AsyncProps<GraphAsyncProps>
  ): Promise<GraphAsyncProps> => {
    const {
      annoMatrix,
      colors: colorsProp,
      layoutChoice,
      crossfilter,
      pointDilation,
      viewport,
      imageUnderlay,
      screenCap,
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

    const { width, height } = viewport;

    return {
      positions,
      colors: colorTable.rgb,
      flags,
      width,
      height,
      imageUnderlay,
      screenCap,
    };
  };

  async drawImageLayerForDownload({
    offscreenCanvas,
    canvasContext,
  }: {
    offscreenCanvas: HTMLCanvasElement;
    canvasContext: CanvasRenderingContext2D;
  }) {
    if (!this.openseadragon) return;

    const imageCanvas = this.openseadragon.drawer.canvas as HTMLCanvasElement;

    const imageDataURL = imageCanvas.toDataURL();

    const image = await loadImage(imageDataURL);

    // Calculate aspect ratio
    const aspectRatio = image.width / image.height;
    let targetWidth;
    let targetHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (offscreenCanvas.width / offscreenCanvas.height > aspectRatio) {
      // Fit by height
      targetHeight = offscreenCanvas.height;
      targetWidth = targetHeight * aspectRatio;
      offsetX = (offscreenCanvas.width - targetWidth) / 2;
    } else {
      // Fit by width
      targetWidth = offscreenCanvas.width;
      targetHeight = targetWidth / aspectRatio;
      offsetY = (offscreenCanvas.height - targetHeight) / 2;
    }

    // Draw the OpenSeadragon image as background with proper scaling
    canvasContext.drawImage(image, offsetX, offsetY, targetWidth, targetHeight);
  }

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
      annoMatrix.fetch(Field.emb, layoutChoice?.current, globals.numBinsEmb),
      query
        ? annoMatrix.fetch(...query, globals.numBinsObsX)
        : Promise.resolve(null),
      pointDilationAccessor
        ? annoMatrix.fetch(Field.obs, pointDilationAccessor)
        : Promise.resolve(null),
    ];
    return Promise.all(promises);
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

  renderCanvas = renderThrottle(async () => {
    const {
      regl,
      drawPoints,
      colorBuffer,
      pointBuffer,
      flagBuffer,
      camera,
      projectionTF,
    } = this.state;

    await this.renderPoints(
      regl,
      drawPoints,
      colorBuffer,
      pointBuffer,
      flagBuffer,
      camera,
      projectionTF
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
    // @ts-expect-error (seve): fix downstream lint errors as a result of detailed app store typing
    return createColorQuery(colorMode, colorAccessor, schema, genesets);
  }

  updateOpenSeadragon() {
    const {
      viewport: { width, height },
    } = this.state;

    const {
      config: { s3URI },
      isSidePanel = false,
      imageUnderlay,
    } = this.props;

    if (
      this.openseadragon ||
      !imageUnderlay ||
      !shouldShowOpenseadragon(this.props) ||
      !width ||
      !height ||
      !s3URI
    ) {
      return;
    }

    this.openseadragon = Openseadragon({
      id: sidePanelAttributeNameChange(`openseadragon`, isSidePanel),
      prefixUrl: getSpatialPrefixUrl(s3URI),
      tileSources: getSpatialTileSources(s3URI),
      showNavigationControl: false,
      /**
       * (thuang): This is needed to prevent error `tainted canvas` when downloading the image
       */
      crossOriginPolicy: "Anonymous",
    });

    /**
     * (thuang): Remove the openseadragon element when the image fails to load,
     * likely because the image is not found in the S3 bucket.
     */
    this.openseadragon.addHandler("open-failed", () => {
      const { dispatch } = this.props;

      dispatch(fetchDeepZoomImageFailed());
    });

    this.openseadragon.addHandler(
      "viewport-change",
      /**
       * (thuang): Binding `this` to the function to access the openseadragon instance
       */
      this.checkIsImageLayerInViewport.bind(this)
    );
  }

  destroyOpenseadragon() {
    this.openseadragon?.destroy();
    this.openseadragon = null;
  }

  hideOpenseadragon() {
    if (!this.openseadragon) return;

    const tiledImage = this.openseadragon.world.getItemAt(0); // Get the first image

    tiledImage?.setOpacity(0);
  }

  showOpenseadragon() {
    if (!this.openseadragon) return;

    const tiledImage = this.openseadragon.world.getItemAt(0); // Get the first image

    tiledImage?.setOpacity(1);
  }

  checkIsImageLayerInViewport() {
    if (!this.openseadragon) return;

    const bounds = this.openseadragon.world.getItemAt(0)?.getBounds();
    const viewportBounds = this.openseadragon.viewport?.getBounds();

    if (!bounds || !viewportBounds) return;

    const imageOutsideViewport =
      bounds.x > viewportBounds.x + viewportBounds.width ||
      bounds.x + bounds.width < viewportBounds.x ||
      bounds.y > viewportBounds.y + viewportBounds.height ||
      bounds.y + bounds.height < viewportBounds.y;

    if (imageOutsideViewport) {
      this.setState((state) =>
        state.isImageLayerInViewport
          ? { ...state, isImageLayerInViewport: false }
          : state
      );

      return;
    }

    this.setState((state) =>
      state.isImageLayerInViewport
        ? state
        : { ...state, isImageLayerInViewport: true }
    );
  }

  async renderPoints(
    regl: GraphState["regl"],
    drawPoints: GraphState["drawPoints"],
    colorBuffer: GraphState["colorBuffer"],
    pointBuffer: GraphState["pointBuffer"],
    flagBuffer: GraphState["flagBuffer"],
    camera: GraphState["camera"],
    projectionTF: GraphState["projectionTF"]
  ): Promise<void> {
    const { annoMatrix } = this.props;

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

    await this.handleImageDownload(regl);

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
      isSidePanel = false,
      isHidden = false,
    } = this.props;

    const {
      modelTF,
      projectionTF,
      camera,
      viewport,
      regl,
      testImageSrc,
      isImageLayerInViewport,
    } = this.state;

    const cameraTF = camera?.view()?.slice();

    return (
      <div
        id={sidePanelAttributeNameChange(`graph-wrapper`, isSidePanel)}
        style={{
          top: 0,
          position: "relative",
          left: 0,
          flexDirection: "column",
          display: isHidden ? "none" : "flex",
          alignItems: "center",
        }}
        data-testid={sidePanelAttributeNameChange(`graph-wrapper`, isSidePanel)}
        data-camera-distance={camera?.distance()}
        ref={this.graphRef}
      >
        {isSpatialMode(this.props) && isImageLayerInViewport === false && (
          <Button
            onClick={this.handleRecenterButtonClick}
            type="button"
            style={{
              justifyContent: "center",
              width: "fit-content",
              zIndex: 3,
              marginTop: "60px",
            }}
          >
            <Icon
              icon={IconNames.LOCATE}
              style={{ marginLeft: "0", marginRight: "4px" }}
            />
            Re-center Embedding
          </Button>
        )}
        {/* If sidepanel don't show centroids */}
        {!isSidePanel && (
          <GraphOverlayLayer
            /**  @ts-expect-error TODO: type GraphOverlayLayer**/
            width={viewport.width}
            height={viewport.height}
            cameraTF={cameraTF}
            modelTF={modelTF}
            projectionTF={projectionTF}
            handleCanvasEvent={
              graphInteractionMode === "zoom"
                ? this.handleCanvasEvent
                : undefined
            }
          >
            <CentroidLabels />
          </GraphOverlayLayer>
        )}
        <svg
          id={sidePanelAttributeNameChange(`lasso-layer`, isSidePanel)}
          data-testid={sidePanelAttributeNameChange(
            `layout-overlay`,
            isSidePanel
          )}
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
        {shouldShowOpenseadragon(this.props) && (
          <div
            id={sidePanelAttributeNameChange(`openseadragon`, isSidePanel)}
            style={{
              width: viewport.width,
              height: viewport.height,
              /**
               * (thuang): Copied from the style of the graph-canvas element
               * to ensure both openseadragon and the canvas are resizable
               */
              ...COMMON_CANVAS_STYLE,
            }}
          />
        )}
        <canvas
          width={viewport.width}
          height={viewport.height}
          style={{
            ...COMMON_CANVAS_STYLE,
            shapeRendering: "crispEdges",
          }}
          id={sidePanelAttributeNameChange(`graph-canvas`, isSidePanel)}
          data-testid={sidePanelAttributeNameChange(
            `layout-graph`,
            isSidePanel
          )}
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
            style={
              /**
               * (thuang): Copied from the style of the graph-canvas element
               * to ensure both openseadragon and the canvas are resizable
               */
              COMMON_CANVAS_STYLE
            }
            alt=""
            data-testid={sidePanelAttributeNameChange(
              `graph-image`,
              isSidePanel
            )}
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
          }}
        >
          <Async.Pending initial>
            <StillLoading
              displayName={layoutChoice?.current}
              width={viewport.width}
              height={viewport.height}
            />
          </Async.Pending>
          <Async.Rejected>
            {(error) => (
              <ErrorLoading
                displayName={layoutChoice?.current}
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
export default connect(mapStateToProps)(Graph);
