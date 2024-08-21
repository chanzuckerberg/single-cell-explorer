import React, {
  cloneElement,
  useState,
  useCallback,
  ReactNode,
  ReactElement,
  MouseEventHandler,
} from "react";

// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module '../graph.css' or its correspon... Remove this comment to see the full error message
import styles from "../graph.css";

interface Props {
  cameraTF: number[];
  modelTF: number[];
  projectionTF: number[];
  children: ReactNode;
  handleCanvasEvent: (
    event: MouseEventHandler<HTMLCanvasElement> | undefined
  ) => void;
  width: number;
  height: number;
}

interface DisplayState {
  [overlay: string]: boolean;
}

function GraphOverlayLayer({
  cameraTF,
  modelTF,
  projectionTF,
  children,
  handleCanvasEvent,
  width,
  height,
}: Props): ReactElement | null {
  /*
    This component takes its children (assumed in the data coordinate space ([0, 1] range, origin in bottom left corner))
    and transforms itself multiple times resulting in screen space ([0, screenWidth/Height] range, origin in top left corner)

    Children are assigned in the graph component and must implement onDisplayChange()
   */

  const [display, setDisplay] = useState<DisplayState>({});

  const matrixToTransformString = useCallback(
    (m: number[]) =>
      /* 
        Translates the gl-matrix mat3 to SVG matrix transform style
  
                              mat3                    SVG Transform Function          
          a  c  e       
          b  d  f / [a, b, 0, c, d, 0, e, f, 1] =>  matrix(a, b, c, d, e, f) / matrix(sx, 0, 0, sy, tx, ty) / matrix(m[0] m[3] m[1] m[4] m[6] m[7])
          0  0  1      
      */
      `matrix(${m[0]} ${m[1]} ${m[3]} ${m[4]} ${m[6]} ${m[7]})`,
    []
  );

  const reverseMatrixScaleTransformString = useCallback(
    (m: number[]) => `matrix(${1 / m[0]} 0 0 ${1 / m[4]} 0 0)`,
    []
  );

  const overlaySetShowing = useCallback(
    (overlay: string, displaying: boolean) => {
      setDisplay((prevDisplay) => ({
        ...prevDisplay,
        [overlay]: displaying,
      }));
    },
    []
  );

  if (!cameraTF) return null;

  const displaying = Object.values(display).some((value) => value);

  const inverseTransform = `${reverseMatrixScaleTransformString(
    modelTF
  )} ${reverseMatrixScaleTransformString(
    cameraTF
  )} ${reverseMatrixScaleTransformString(projectionTF)} scale(1 2) scale(1 ${
    1 / -height
  }) scale(2 1) scale(${1 / width} 1)`;

  const newChildren = React.Children.map(children, (child) =>
    cloneElement(child as ReactElement, {
      inverseTransform,
      overlaySetShowing,
    })
  );

  return (
    <svg
      className={styles.graphSVG}
      width={width}
      height={height}
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 2,
        backgroundColor: displaying ? "rgba(255, 255, 255, 0.55)" : "",
      }}
      onMouseMove={() => handleCanvasEvent}
      onWheel={() => handleCanvasEvent}
    >
      <g
        id="canvas-transformation-group-x"
        transform={`scale(${width} 1) scale(.5 1) translate(1 0)`}
      >
        <g
          id="canvas-transformation-group-y"
          transform={`scale(1 ${-height}) translate(0 -1) scale(1 .5) translate(0 1)`}
        >
          <g
            id="projection-transformation-group"
            transform={matrixToTransformString(projectionTF)}
          >
            <g
              id="camera-transformation-group"
              transform={matrixToTransformString(cameraTF)}
            >
              <g
                id="model-transformation-group"
                transform={matrixToTransformString(modelTF)}
              >
                {newChildren}
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

export default GraphOverlayLayer;
