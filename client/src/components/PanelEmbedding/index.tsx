import React, { useState } from "react";
import { connect } from "react-redux";
import { IconNames } from "@blueprintjs/icons";
import { Button } from "@blueprintjs/core";

import * as globals from "../../globals";
import { height, width } from "./util";
import Graph from "../graph/graph";
import Controls from "../controls";
import Embedding from "../embedding";
import { AppDispatch, RootState } from "../../reducers";
import actions from "../../actions";

interface StateProps {
  isMinimized: boolean;
  isOpen: RootState["panelEmbedding"]["open"];
}

interface DispatchProps {
  dispatch: AppDispatch;
}

const mapStateToProps = (state: RootState): StateProps => ({
  isMinimized: state.panelEmbedding.minimized,
  isOpen: state.panelEmbedding.open,
});

const PanelEmbedding = (props: StateProps & DispatchProps) => {
  const [viewportRef, setViewportRef] = useState<HTMLDivElement | null>(null);

  const { isMinimized, isOpen, dispatch } = props;

  const handleSwapLayoutChoices = async (): Promise<void> => {
    await dispatch(actions.swapLayoutChoicesAction());
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        borderRadius: "3px 3px 0px 0px",
        right: globals.leftSidebarWidth + globals.scatterplotMarginLeft,
        bottom: "12px",
        padding: "0px 20px 20px 0px",
        background: "white",
        /* x y blur spread color */
        boxShadow: "0px 0px 3px 2px rgba(153,153,153,0.2)",
        width: `${width}px`,
        height: `${isMinimized ? 48 : height}px`,
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
            marginTop: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "left",
              gap: "8px",
            }}
          >
            <Embedding isSidePanel />
            <Button
              type="button"
              icon={IconNames.SWAP_VERTICAL}
              onClick={handleSwapLayoutChoices}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "right",
              gap: "8px",
            }}
          >
            <Button
              type="button"
              icon={isMinimized ? IconNames.MAXIMIZE : IconNames.MINIMIZE}
              onClick={() => {
                dispatch({
                  type: "toggle minimize panel embedding",
                });
              }}
            />
            <Button
              type="button"
              icon={IconNames.CROSS}
              onClick={() => {
                dispatch({
                  type: "toggle panel embedding",
                });
              }}
            />
          </div>
        </div>
      </Controls>
      {viewportRef && (
        <Graph isHidden={isMinimized} viewportRef={viewportRef} isSidePanel />
      )}
    </div>
  );
};

export default connect(mapStateToProps)(PanelEmbedding);
