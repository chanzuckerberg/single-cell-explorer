import { vec2, mat3 } from "gl-matrix";
import { MouseEvent } from "react";
import { Point, Viewer } from "openseadragon";
import { debounce } from "lodash";
import clamp from "./clamp";
import { THROTTLE_MS, SCALE_MAX } from "./constants";
import { EVENTS } from "../analytics/events";
import { track } from "../analytics";

const ANALYTICS_PAN_ZOOM_DEBOUNCE_MS = 100;

const EPSILON = 0.000001;

const scaleSpeed = 0.5;

const scaleMin = 0.5;
const panBound = 0.8;

// private
const scratch0 = new Float32Array(16);
const scratch1 = new Float32Array(16);
const scratch3 = new Float32Array(16);

export class Camera {
  canvas: HTMLCanvasElement;

  prevEvent: {
    clientX: number;
    clientY: number;
    type: string;
  };

  viewMatrix: mat3;

  viewMatrixInv: mat3;

  constructor(canvas: HTMLCanvasElement) {
    this.prevEvent = {
      clientX: 0,
      clientY: 0,
      type: "",
    };
    this.canvas = canvas;
    this.viewMatrix = mat3.create();
    this.viewMatrixInv = mat3.create();
  }

  view(): mat3 {
    return this.viewMatrix;
  }

  invView(): mat3 {
    return this.viewMatrixInv;
  }

  distance(): number {
    return this.viewMatrix[0];
  }

  /**
   * Pans the camera by the specified amount in the x and y directions.
   *
   * @param dx - The amount to pan in the x direction.
   * @param dy - The amount to pan in the y direction.
   * @param openseadragon - The OpenSeadragon viewer instance (optional).
   * @param offsetX - The x offset of the pan operation (default: 0).
   * @param offsetY - The y offset of the pan operation (default: 0).
   * @param prevOffsetX - The previous x offset of the pan operation (default: 0).
   * @param prevOffsetY - The previous y offset of the pan operation (default: 0).
   */
  pan({
    dx,
    dy,
    openseadragon,
    offsetX = 0,
    offsetY = 0,
    prevOffsetX = 0,
    prevOffsetY = 0,
  }: {
    dx: number;
    dy: number;
    openseadragon: Viewer | null;
    offsetX?: number;
    offsetY?: number;
    prevOffsetX?: number;
    prevOffsetY?: number;
  }): void {
    this.debouncedPanTrack();

    const m = this.viewMatrix;

    /**
     * (thuang): In spatial mode, we will not apply `panBound`, so the embedding
     * dots can stay in sync with openseadragon's image layer. In other embedding
     * modes, we will use the `panBound` to apply bounding.
     */
    const dxRange: [number, number] = openseadragon
      ? [-(m[6] + 1) / m[0], -(m[6] - 1) / m[0]]
      : [-panBound - (m[6] + 1) / m[0], panBound - (m[6] - 1) / m[0]];

    const dyRange: [number, number] = openseadragon
      ? [-(m[7] + 1) / m[4], -(m[7] - 1) / m[4]]
      : [-panBound - (m[7] + 1) / m[4], panBound - (m[7] - 1) / m[4]];

    const dxClamped = clamp(dx, dxRange);
    const dyClamped = clamp(dy, dyRange);

    if (Math.abs(dxClamped) <= EPSILON && Math.abs(dyClamped) <= EPSILON) {
      return;
    }

    /**
     * (thuang): In spatial mode, we will use the unclamped values, so the
     * embedding dots can stay in sync with openseadragon's image layer. In other
     * embedding modes, we will use the clamped values to apply bounding.
     */
    mat3.translate(m, m, [
      openseadragon ? dx : dxClamped,
      openseadragon ? dy : dyClamped,
    ]);

    mat3.invert(this.viewMatrixInv, m);

    if (openseadragon) {
      openseadragonPan({
        offsetX,
        offsetY,
        prevOffsetX,
        prevOffsetY,
        openseadragon,
      });
    }
  }

  debouncedPanTrack = debounce(
    () => {
      track(EVENTS.EXPLORER_PANNED);
    },
    ANALYTICS_PAN_ZOOM_DEBOUNCE_MS,
    {
      trailing: true,
    }
  );

  goHome(openseadragon: Viewer | null = null) {
    // Reset the custom layer's transformation matrix to the identity matrix
    mat3.identity(this.viewMatrix);
    mat3.invert(this.viewMatrixInv, this.viewMatrix);

    if (openseadragon) {
      /**
       * (thuang): `setTimeout` is needed to ensure that the OpenSeadragon
       * fits the image to the viewport properly after resize
       */
      setTimeout(() => openseadragon.viewport.goHome(true), THROTTLE_MS);
    }
  }

  zoomAt({
    d = 1,
    x = 0,
    y = 0,
    openseadragon = null,
    offsetX = 0,
    offsetY = 0,
  }: {
    d: number;
    x: number;
    y: number;
    openseadragon: Viewer | null;
    offsetX: number;
    offsetY: number;
  }): void {
    /*
    Camera zoom at [x,y]
    */
    const m = this.viewMatrix;

    const bounds: [number, number] = [-panBound, panBound];
    const xClamped = clamp(x, bounds);
    const yClamped = clamp(y, bounds);

    const dClamped = clamp(d * m[0], [scaleMin, SCALE_MAX]) / m[0];

    if (Math.abs(1 - dClamped) <= EPSILON) return; // noop request

    /**
     * (thuang): In spatial mode, we will use the unclamped values, so the
     * embedding dots can stay in sync with openseadragon's image layer. In other
     * embedding modes, we will use the clamped values to apply bounding.
     */
    const finalX = openseadragon ? x : xClamped;
    const finalY = openseadragon ? y : yClamped;

    mat3.translate(m, m, [finalX, finalY]);
    mat3.scale(m, m, [dClamped, dClamped]);
    mat3.translate(m, m, [-finalX, -finalY]);

    mat3.invert(this.viewMatrixInv, m);

    if (openseadragon) {
      const webPoint = new Point(offsetX, offsetY);
      const viewportPoint = openseadragon.viewport.pointFromPixel(webPoint);

      openseadragon.viewport.zoomBy(
        dClamped,
        new Point(viewportPoint.x, viewportPoint.y),
        true
      );
    }
  }

  /*
  Event handling
  */

  flush(e: MouseEvent<HTMLCanvasElement, MouseEvent<Element, MouseEvent>>) {
    this.prevEvent.type = e.type;
    this.prevEvent.clientX = e.clientX;
    this.prevEvent.clientY = e.clientY;
  }

  localPosition(
    target: HTMLCanvasElement,
    canvasX: number,
    canvasY: number,
    projectionInvTF: mat3
  ): { local: vec2; offset: vec2 } {
    /*
    Convert mouse position to local
    */
    const { height, width } = target;

    const targetRect = target.getBoundingClientRect();

    const offsetX = canvasX - targetRect.left;
    const offsetY = canvasY - targetRect.top;

    const pos = vec2.fromValues(
      2 * (offsetX / width) - 1,
      -2 * (offsetY / height) + 1
    );

    if (projectionInvTF) {
      vec2.transformMat3(pos, pos, projectionInvTF);
    }

    vec2.transformMat3(pos, pos, this.invView());

    return { local: pos, offset: [offsetX, offsetY] };
  }

  mousePan(
    e: MouseEvent<HTMLCanvasElement, MouseEvent<Element, MouseEvent>>,
    projectionTF: mat3,
    openseadragon: Viewer | null = null
  ): true {
    const projectionInvTF = mat3.invert(scratch0, projectionTF);

    const { local, offset } = this.localPosition(
      this.canvas,
      e.clientX,
      e.clientY,
      projectionInvTF
    );

    const { local: prevLocal, offset: prevOffset } = this.localPosition(
      this.canvas,
      this.prevEvent.clientX,
      this.prevEvent.clientY,
      projectionInvTF
    );

    const delta = vec2.sub(scratch1, local, prevLocal);

    this.pan({
      dx: delta[0],
      dy: delta[1],
      openseadragon,
      offsetX: offset[0],
      offsetY: offset[1],
      prevOffsetX: prevOffset[0],
      prevOffsetY: prevOffset[1],
    });

    return true;
  }

  wheelZoom(
    e: WheelEvent,
    projectionTF: mat3,
    openseadragon: Viewer | null
  ): true {
    const { height } = this.canvas;
    const { deltaY, deltaMode, clientX, clientY } = e;
    const scale = scaleSpeed * (deltaMode === 1 ? 12 : 1) * (deltaY || 0);

    const projectionInvTF = mat3.invert(scratch0, projectionTF);

    const { local, offset } = this.localPosition(
      this.canvas,
      clientX,
      clientY,
      projectionInvTF
    );

    this.zoomAt({
      d: 1 / Math.exp(scale / height), // scale factor
      x: local[0],
      y: local[1],
      openseadragon,
      offsetX: offset[0],
      offsetY: offset[1],
    });

    this.debouncedZoomTrack();

    return true;
  }

  debouncedZoomTrack = debounce(
    () => {
      const distance = this.distance();

      /**
       * (thuang): Product requirement - Don't track zoom events when we're zooming out
       */
      if (distance < 1) return;

      track(EVENTS.EXPLORER_ZOOMED, { zoomLevel: Math.round(distance) });
    },
    ANALYTICS_PAN_ZOOM_DEBOUNCE_MS,
    {
      trailing: true,
    }
  );

  handleEvent(
    e: MouseEvent<HTMLCanvasElement, MouseEvent<Element, MouseEvent>>,
    projectionTF: mat3,
    openseadragon: Viewer | null = null
  ): boolean {
    /*
    process the event, and return true if camera view changed
    */
    let viewChanged = false;
    switch (e.type) {
      case "mousemove": {
        /* eslint-disable-next-line no-bitwise --- MouseEvent.buttons exposes a bitmask, best acted on with bitops */
        if (e.buttons & 0x1) {
          viewChanged = this.mousePan(e, projectionTF, openseadragon);
        }
        this.flush(e);
        break;
      }

      case "wheel": {
        viewChanged = this.wheelZoom(
          e as unknown as WheelEvent,
          projectionTF,
          openseadragon
        );
        this.flush(e);
        break;
      }

      default:
        // noop
        break;
    }
    return viewChanged;
  }
}

function attachCamera(canvas: HTMLCanvasElement): Camera {
  return new Camera(canvas);
}

function openseadragonPan({
  offsetX,
  offsetY,
  prevOffsetX,
  prevOffsetY,
  openseadragon,
}: {
  offsetX: number;
  offsetY: number;
  prevOffsetX: number;
  prevOffsetY: number;
  openseadragon: Viewer;
}) {
  const webPoint = new Point(offsetX, offsetY);
  const viewportPoint = openseadragon.viewport.pointFromPixel(webPoint);

  const prevWebPoint = new Point(prevOffsetX, prevOffsetY);
  const prevViewportPoint = openseadragon.viewport.pointFromPixel(prevWebPoint);

  const delta = vec2.sub(
    scratch3,
    [viewportPoint.x, viewportPoint.y],
    [prevViewportPoint.x, prevViewportPoint.y]
  );

  /**
   * (thuang): We explicitly set `-` to the clamped values `delta` because
   * OpenSeadragon's `panBy` function expects the delta to be in the
   * opposite direction of the pan.
   */
  openseadragon.viewport.panBy(new Point(-delta[0], -delta[1]), true);
}

export default attachCamera;
