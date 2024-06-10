import React, { useState } from "react";
import { connect } from "react-redux";

import * as globals from "../../globals";
import { height, margin, width } from "./util";
import Graph from "../graph/graph";
import Controls from "../controls";
import Embedding from "../embedding";

interface StateProps {
  level: string;
  minimized: boolean;
}

const mapStateToProps = (): StateProps => ({
  level: "top",
  minimized: false,
});

const PanelEmbedding = (props: StateProps) => {
  const [viewportRef, setViewportRef] = useState<HTMLDivElement | null>(null);

  const { level, minimized } = props;

  // TODO(seve): Connect to redux state

  return (
    <div
      style={{
        position: "fixed",
        bottom:
          level === "top"
            ? globals.bottomToolbarGutter * 2
            : globals.bottomToolbarGutter,
        borderRadius: "3px 3px 0px 0px",
        right: globals.leftSidebarWidth + globals.scatterplotMarginLeft,
        padding: "0px 20px 20px 0px",
        background: "white",
        /* x y blur spread color */
        boxShadow: "0px 0px 3px 2px rgba(153,153,153,0.2)",
        width: `${width + margin.left + margin.right}px`,
        height: `${(minimized ? 0 : height + margin.top) + margin.bottom}px`,
        zIndex: 5,
      }}
      id="side-viewport"
      ref={(ref) => {
        setViewportRef(ref);
      }}
    >
      <Controls>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "left",
            }}
          >
            <Embedding isSidePanel />
          </div>
        </div>
      </Controls>
      {viewportRef && <Graph viewportRef={viewportRef} isSidePanel />}
    </div>
  );
};

export default connect(mapStateToProps)(PanelEmbedding);
