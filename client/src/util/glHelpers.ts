/*
Utility code for WebGL shaders
*/

/*
PointFlags:
  Point flags are used in graph & scatter plots.

  We want a bitmask-like flag structure, but due to webgl limitations
  must emulate it with floats.

  Supported flags are:

    selected: the point is currently selected
    highlight: the point is currently highlighted
    background: the point is background information
*/

// for JS
export const flagSelected = 1;
export const flagBackground = 2;
export const flagHighlight = 4;

// for GLSL
export const glPointFlags = `

  const float flagSelected = 1.;
  const float flagBackground = 2.;
  const float flagHighlight = 4.;

  bool isLowBitSet(float f) {
    f = mod(f, 2.);
    return (f > 0.9 && f <= 1.1);
  }

  float shiftRightOne(float f) {
    return floor(f / 2.);
  }

  void getFlags(in float flag,
                out bool isBackground,
                out bool isSelected,
                out bool isHighlight) {
    isSelected = isLowBitSet(flag);
    flag = shiftRightOne(flag);
    isBackground = isLowBitSet(flag);
    flag = shiftRightOne(flag);
    isHighlight = isLowBitSet(flag);
  }

`;

/*
Point Size:
  Calculate point size for scatter plot based upon pseudo density.

  Current approach: linear scaling of point size, clamped to [1,10],
  between two points that are based on empirical testing.

    - 1M points on a 500x500 canvas: 1M/(500*500) -> 0.5
    - 1000 points on a 1440x1440 canvas:  1000/(1440*1440) -> 5

  The domain is pseudo density (numPoints / minViewportDimension^2)
  The range is web gl point size.
*/

// configuration
const domain = [1000000 / (500 * 500), 1000 / (1440 * 1440)];
const range = [0.5, 5];

// derived from configuration
const scale = (range[1] - range[0]) / (domain[1] - domain[0]);
const offset = scale * -domain[0] + range[0];

export const glPointSize = `
  float pointSize(float nPoints, float minViewportDimension, bool isSelected, bool isHighlight) {
      float density = nPoints / (minViewportDimension * minViewportDimension);
      float pointSize = (${scale.toFixed(4)}*density) + ${offset.toFixed(4)};
      pointSize = clamp(pointSize, 
      ${range[0].toFixed(4)}, 
      ${range[1].toFixed(4)});

    if (isHighlight) return 2. * pointSize;
    if (isSelected) return pointSize;
    return pointSize / 5.;
  }
`;

export const densityFactor = 0.9;

export const glPointSizeSpatial = `

  float pointSizeSpatial(float nPoints, float minViewportDimension, bool isSelected, bool isHighlight, float distance, float imageHeight, float scaleref, float spotDiameterFullres) {
    
    float scaleFactor = (minViewportDimension / imageHeight) ;


    // Adjust base size based on distance (zoom level)
    float adjustedDistance = clamp(distance, 1., 2.5); // Clamp the distance to avoid extreme values
    float zoomFactor = 1.0 / adjustedDistance * distance * ${densityFactor}; // Inverse of adjustedDistance and multiply by distnace and density factor to get smoother dot size change
    float adjustedZoomFactor = clamp(zoomFactor, 0.1, .9); // Clamp the zoom factor to avoid extreme values and overlapping dots

    float baseSize = spotDiameterFullres * scaleref * scaleFactor * adjustedZoomFactor; // Base size proportional to viewport
    
    if (isSelected) {
      return baseSize * 1.5; // Increase size if selected
    } else if (isHighlight) {
      return baseSize * 2.0; // Increase size if highlighted
    } else {
      return baseSize;
    }
  }
`;
