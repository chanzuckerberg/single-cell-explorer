import * as d3 from "d3";

import { ReadonlyMat3, mat3 } from "gl-matrix";

import _regl, { DrawCommand, Regl } from "regl";

import { Camera } from "../../util/camera";

import { Dataframe } from "../../util/dataframe";

import { LassoFunctionWithAttributes } from "./setupLasso";

import { RootState } from "../../reducers";

export type GraphProps = Partial<RootState>;

export type GraphState = {
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
  isDeepZoomSourceValid: boolean;
};
