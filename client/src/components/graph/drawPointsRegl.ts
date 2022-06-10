import { glPointFlags, glPointSize } from "../../util/glHelpers";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
export default function drawPointsRegl(regl: any) {
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

    attribute vec3 color;
    attribute float flag;

    uniform float distance;
    uniform mat3 projView;
    uniform float nPoints;
    uniform float minViewportDimension;
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

    void main() {
      float t;
      if (duration == 0.0) {
        t = 1.0;
      } else {
        t = easeCubicInOut(elapsed / duration);
      }


      bool isBackground, isSelected, isHighlight;
      getFlags(flag, isBackground, isSelected, isHighlight);

      float size = pointSize(nPoints, minViewportDimension, isSelected, isHighlight);
      gl_PointSize = size * pow(distance, 0.5);

      float z = isBackground ? zBottom : (isHighlight ? zTop : zMiddle);

      vec2 position;
      if (t >= 1.0) {
        position = positionsEnd;
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
      positionsStart: regl.prop("positionsStart"),
      positionsEnd: regl.prop("positionsEnd"),
      color: regl.prop("color"),
      flag: regl.prop("flag"),
    },

    uniforms: {
      distance: regl.prop("distance"),
      projView: regl.prop("projView"),
      nPoints: regl.prop("nPoints"),
      duration: regl.prop("duration"),
      minViewportDimension: regl.prop("minViewportDimension"),
      elapsed: ({ time }: { time: number }, { startTime = 0 }) =>
        (time - startTime) * 1000,
    },

    count: regl.prop("count"),

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
