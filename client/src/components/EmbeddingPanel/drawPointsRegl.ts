// (seve): copied from graph/

import { Regl } from "regl";
import { glPointFlags, glPointSize } from "../../util/glHelpers";

interface ReglProps {
  position: Float32Array;
  color: Float32Array;
  flag: Float32Array;
  distance: number;
  projView: number[];
  nPoints: number;
  minViewportDimension: number;
  count: number;
}

export default function drawPointsRegl(regl: Regl) {
  return regl({
    vert: `
    precision mediump float;

    attribute vec2 position;
    attribute vec3 color;
    attribute float flag;

    uniform float distance;
    uniform mat3 projView;
    uniform float nPoints;
    uniform float minViewportDimension;

    varying lowp vec4 fragColor;

    const float zBottom = 0.99;
    const float zMiddle = 0.;
    const float zTop = -1.;

    // import getFlags()
    ${glPointFlags}

    // get pointSize()
    ${glPointSize}

    void main() {
      bool isBackground, isSelected, isHighlight;
      getFlags(flag, isBackground, isSelected, isHighlight);

      float size = pointSize(nPoints, minViewportDimension, isSelected, isHighlight);
      gl_PointSize = size * pow(distance, 0.5);

      float z = isBackground ? zBottom : (isHighlight ? zTop : zMiddle);
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
      position: regl.prop<ReglProps, "position">("position"),
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
