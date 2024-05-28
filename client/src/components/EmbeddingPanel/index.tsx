import React, { useState } from "react";
import { connect } from "react-redux";
import { Button, ButtonGroup } from "@blueprintjs/core";

// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module './scatterplot.css' or its corr... Remove this comment to see the full error message
import styles from "../scatterplot/scatterplot.css";
import * as globals from "../../globals";
import _drawPoints from "./drawPointsRegl";
import { Dataframe } from "../../util/dataframe";
import { AppDispatch, RootState } from "../../reducers";
import _camera from "../../util/camera";
import { Level } from "../../reducers/controls";
import { AnnoMatrixObsCrossfilter } from "../../annoMatrix";
import { height, margin, width } from "./util";
import Graph from "../graph/graph";

interface StateProps {
  level: Level;
  minimized: boolean;
  // annoMatrix: Dataframe | null;
  // crossfilter: AnnoMatrixObsCrossfilter | null;
  // selectionTool: string;
  // currentSelection: string[];
  // layoutChoice: string;
  // graphInteractionMode: string;
  // colors: string[];
  // pointDilation: number;
  // genesets: string[];
  // screenCap: boolean;
  // mountCapture: boolean;
  // imageUnderlay: boolean;
  // spatial: boolean;
}
interface DispatchProps {
  dispatch: AppDispatch;
}

interface OwnProps {}

type Props = OwnProps & StateProps & DispatchProps;

const mapStateToProps = (state: RootState): StateProps => ({
  // TODO(seve): TO BE LATER DEFINED
  level: "top",
  minimized: false,
  // END TODO

  // annoMatrix: state.annoMatrix,
  // crossfilter: state.obsCrossfilter,
  // selectionTool: state.graphSelection.tool,
  // currentSelection: state.graphSelection.selection,
  // layoutChoice: state.layoutChoice,
  // graphInteractionMode: state.controls.graphInteractionMode,
  // colors: state.colors,
  // pointDilation: state.pointDilation,
  // genesets: state.genesets.genesets,
  // screenCap: state.controls.screenCap,
  // mountCapture: state.controls.mountCapture,
  // imageUnderlay: state.controls.imageUnderlay,
  // spatial: state.controls.unsMetadata.spatial,
});

const EmbeddingPanel = (props: Props) => {
  const [viewportRef, setViewportRef] = useState<HTMLDivElement | null>(null);

  const { dispatch, level, minimized } = props;

  return (
    <div
      style={{
        position: "fixed",
        bottom:
          level === "top"
            ? globals.bottomToolbarGutter * 2
            : globals.bottomToolbarGutter,
        borderRadius: "3px 3px 0px 0px",
        left: globals.leftSidebarWidth + globals.scatterplotMarginLeft,
        padding: "0px 20px 20px 0px",
        background: "white",
        /* x y blur spread color */
        boxShadow: "0px 0px 3px 2px rgba(153,153,153,0.2)",
        zIndex: 2,
      }}
      id="scatterplot_wrapper"
    >
      <ButtonGroup
        style={{
          position: "absolute",
          right: 5,
          top: 5,
        }}
      >
        <Button
          type="button"
          minimal
          onClick={() => {
            // dispatch({ type: "minimize/maximize scatterplot" });
          }}
        >
          {minimized ? "show scatterplot" : "hide"}
        </Button>
        <Button
          type="button"
          minimal
          data-testid="clear-scatterplot"
          onClick={() =>
            dispatch({
              type: "clear scatterplot",
            })
          }
        >
          remove
        </Button>
      </ButtonGroup>
      <div
        className={styles.scatterplot}
        id="side-viewport"
        style={{
          width: `${width + margin.left + margin.right}px`,
          height: `${(minimized ? 0 : height + margin.top) + margin.bottom}px`,
        }}
        ref={(ref) => {
          setViewportRef(ref);
        }}
      >
        {viewportRef && <Graph viewportRef={viewportRef} isSidePanel />}
      </div>
    </div>
  );
};

export default connect(mapStateToProps)(EmbeddingPanel);
