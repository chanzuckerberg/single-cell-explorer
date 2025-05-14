import React from "react";
import { connect } from "react-redux";
import { ChromosomeMap } from "./components/ChromosomeMap/ChromosomeMap";
import { Props, mapStateToProps } from "./types";
import { GeneSelect } from "./components/GeneSelect/GeneSelect";
import {
  BottomPanelContainer,
  BottomPanelHeader,
  BottomPanelHeaderTitle,
  BottomPanelWrapper,
  BottomPanelButton,
  BottomPanelHeaderActions,
} from "./style";

const BottomSideBar = ({
  dispatch,
  bottomPanelMinimized,
  bottomPanelHidden,
}: Props) => (
  <BottomPanelWrapper isHidden={bottomPanelHidden}>
    <BottomPanelHeader>
      <BottomPanelHeaderTitle>
        Chromatin Accessibility Viewer
      </BottomPanelHeaderTitle>

      <BottomPanelHeaderActions>
        <GeneSelect />
        <BottomPanelButton
          active={false}
          data-testid="minimize-bottom-panel"
          minimal
          text=""
          rightIcon={bottomPanelMinimized ? "maximize" : "minimize"}
          onClick={() =>
            dispatch({
              type: "toggle minimize multiome viz panel",
            })
          }
        />
        <BottomPanelButton
          active={false}
          data-testid="close-bottom-panel"
          minimal
          text=""
          rightIcon="cross"
          onClick={() =>
            dispatch({
              type: "close multiome viz panel",
            })
          }
        />
      </BottomPanelHeaderActions>
    </BottomPanelHeader>

    {!bottomPanelMinimized && (
      <BottomPanelContainer>
        <ChromosomeMap />
      </BottomPanelContainer>
    )}
  </BottomPanelWrapper>
);

export default connect(mapStateToProps)(BottomSideBar);
