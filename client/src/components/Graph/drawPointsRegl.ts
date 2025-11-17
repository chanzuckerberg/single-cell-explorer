import { Regl } from "regl";
import {
  glPointFlags,
  glPointSize,
  glPointSizeSpatial,
} from "../../util/glHelpers";

interface ReglProps {
  positionsStart: Float32Array;
  positionsEnd: Float32Array;
  positionsFinal: Float32Array;
  color: Float32Array;
  flag: Float32Array;
  distance: number;
  projView: number[];
  nPoints: number;
  minViewportDimension: number;
  count: number;
  imageHeight: number;
  scaleref: number;
  spotDiameterFullres: number;
  isSpatial: boolean;
  duration: number;
  startTime: number;
}

export default function drawPointsRegl(regl: Regl) {
  return regl({
    vert: `
    float easeCubicInOut(float t) {
      t *= 2.0;
      t = (t <= 1.0 ? t * t * t : (t -= 2.0) * t * t + 2.0) / 2.0;

      if (t > 1.0) {
        t = 1.0;
      }

      return t;
    }

    precision mediump float;

    attribute vec2 positionsStart;
    attribute vec2 positionsEnd;
    attribute vec2 positionsFinal;
    attribute vec3 color;
    attribute float flag;

    uniform float distance;
    uniform mat3 projView;
    uniform float nPoints;
    uniform float minViewportDimension;
    
    uniform float imageHeight;
    uniform float scaleref;
    uniform float spotDiameterFullres;
    uniform bool isSpatial;
    uniform float duration;
    uniform float elapsed;

    varying lowp vec4 fragColor;

    const float zBottom = 0.99;
    const float zMiddle = 0.;
    const float zTop = -1.;

    // import getFlags()
    ${glPointFlags}

    // get pointSize()
    ${glPointSize}

    // get pointSizeSpatial()
    ${glPointSizeSpatial}

    void main() {
      float t;
      if (duration == 0.0) {
        t = 1.0;
      } else {
        t = easeCubicInOut(elapsed / duration);
      }

      bool isBackground, isSelected, isHighlight;
      float size;
      
      getFlags(flag, isBackground, isSelected, isHighlight);

      if (isSpatial) {
        size = pointSizeSpatial(minViewportDimension, isSelected, isHighlight, distance, imageHeight, scaleref, spotDiameterFullres);
      } else {
        size = pointSize(nPoints, minViewportDimension, isSelected, isHighlight);
      }

      gl_PointSize = size * pow(distance, 0.5);

      float z = isBackground ? zBottom : (isHighlight ? zTop : zMiddle);
      vec2 position;
      if (t >= 1.0) {
        position = positionsFinal;
      } else {
        position = mix(positionsStart, positionsEnd, t);
      }
      vec3 xy = projView * vec3(position, 1.);
      gl_Position = vec4(xy.xy, z, 1.);

      float alpha = isBackground ? 0.9 : 1.0;
      fragColor = vec4(color, alpha);
    }`,

    frag: `
    precision mediump float;
    varying lowp vec4 fragColor;
    void main() {
      if (length(gl_PointCoord.xy - 0.5) > 0.5) {
        discard;
      }
      gl_FragColor = fragColor;
    }`,

    attributes: {
      positionsStart: regl.prop<ReglProps, "positionsStart">("positionsStart"),
      positionsEnd: regl.prop<ReglProps, "positionsEnd">("positionsEnd"),
      positionsFinal: regl.prop<ReglProps, "positionsFinal">("positionsFinal"),
      color: regl.prop<ReglProps, "color">("color"),
      flag: regl.prop<ReglProps, "flag">("flag"),
    },

    uniforms: {
      distance: regl.prop<ReglProps, "distance">("distance"),
      projView: regl.prop<ReglProps, "projView">("projView"),
      nPoints: regl.prop<ReglProps, "nPoints">("nPoints"),
      minViewportDimension: regl.prop<ReglProps, "minViewportDimension">(
        "minViewportDimension"
      ),
      imageHeight: regl.prop<ReglProps, "imageHeight">("imageHeight"),
      scaleref: regl.prop<ReglProps, "scaleref">("scaleref"),
      spotDiameterFullres: regl.prop<ReglProps, "spotDiameterFullres">(
        "spotDiameterFullres"
      ),
      isSpatial: regl.prop<ReglProps, "isSpatial">("isSpatial"),
      duration: regl.prop<ReglProps, "duration">("duration"),
      elapsed: ({ time }: { time: number }, { startTime = 0 }: ReglProps) =>
        (time - startTime) * 1000,
    },

    count: regl.prop<ReglProps, "count">("count"),

    primitive: "points",

    blend: {
      enable: true,
      func: {
        srcRGB: "src alpha",
        srcAlpha: 1,
        dstRGB: 0,
        dstAlpha: "zero",
      },
    },
  });
}
