import React from "react";
import { connect } from "react-redux";
import { ScaleBar } from "./components/ScaleBar/ScaleBar";
import { Props, mapStateToProps } from "./types";
import { Cytoband } from "./components/Cytoband/Cytoband";
import { CoveragePlot } from "./components/CoveragePlot/CoveragePlot";
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
        <ScaleBar svgWidth={1310} />
        <Cytoband chromosomeId="chr2" svgWidth={1310} />
        <CoveragePlot svgWidth={1310} />
      </BottomPanelContainer>
    )}
  </BottomPanelWrapper>
);

export default connect(mapStateToProps)(BottomSideBar);
