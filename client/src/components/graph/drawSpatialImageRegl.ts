import { Regl, Texture2D } from "regl";

interface ReglProps {
  rectCoords: Float32Array;
  spatialImageAsTexture: Texture2D;
  projView: number[];
  imageWidth: number;
  imageHeight: number;
  count: number;
}

export default function drawSpatialImageRegl(regl: Regl) {
  return regl({
    frag: `
            precision mediump float;
            // our texture
            uniform sampler2D u_image;
            // the texCoords passed in from the vertex shader.
            varying vec2 v_texCoord;
            void main() {
                gl_FragColor = texture2D(u_image, v_texCoord);
            }`,

    vert: `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            uniform vec2 u_resolution;
            uniform mat3 projView;
            varying vec2 v_texCoord;
            void main() {
                // convert the rectangle from pixels to 0.0 to 1.0
                vec3 pos = vec3(a_position, 1.);
                vec2 zeroToOne = pos.xy / u_resolution;
                // convert from 0->1 to 0->2
                vec2 zeroToTwo = zeroToOne * 2.0;
                // convert from 0->2 to -1->+1 (clipspace)
                vec2 clipSpace = zeroToTwo - 1.0;
                vec3 pos2 = projView * vec3(clipSpace, 1.);
                gl_Position = vec4(pos2.xy , 0, 1);
                // pass the texCoord to the fragment shader
                // The GPU will interpolate this value between points.
                v_texCoord = a_texCoord;
            }`,

    attributes: {
      a_texCoord: [0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0],
      a_position: regl.prop<ReglProps, "rectCoords">("rectCoords"),
    },

    uniforms: {
      projView: regl.prop<ReglProps, "projView">("projView"),
      u_image: regl.prop<ReglProps, "spatialImageAsTexture">(
        "spatialImageAsTexture"
      ),
      color: [1, 0, 0, 1],
      u_resolution: [
        regl.prop<ReglProps, "imageWidth">("imageWidth"),
        regl.prop<ReglProps, "imageHeight">("imageHeight"),
      ],
      image_width: regl.prop<ReglProps, "imageWidth">("imageWidth"),
    },
    // This tells regl the number of vertices to draw in this command
    // https://github.com/regl-project/regl
    count: 6,
  });
}
