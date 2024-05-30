import React, { useState } from "react";

import * as globals from "../../globals";
import { Level } from "../../reducers/controls";
import { height, margin, width } from "./util";
import Graph from "../graph/graph";

interface StateProps {
  level: Level;
  minimized: boolean;
}

const EmbeddingPanel = () => {
  const [viewportRef, setViewportRef] = useState<HTMLDivElement | null>(null);

  // TODO(seve): Connect to redux state
  const { level, minimized } = { level: "top", minimized: false } as StateProps;

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
      }}
      id="side-viewport"
      ref={(ref) => {
        setViewportRef(ref);
      }}
    >
      {viewportRef && <Graph viewportRef={viewportRef} isSidePanel />}
    </div>
  );
};

export default EmbeddingPanel;
