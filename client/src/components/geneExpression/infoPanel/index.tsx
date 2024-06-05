import React from "react";
import { connect } from "react-redux";
import { AnchorButton, ButtonGroup } from "@blueprintjs/core";
import {
  CollapseToggle,
  InfoPanelContent,
  InfoPanelHeader,
  InfoPanelTabs,
  InfoPanelWrapper,
  StyledAnchorButton,
} from "./style";
import GeneInfo from "./geneInfo";
import DatasetInfo from "./datasetInfo";
import { Props, mapStateToProps } from "./types";

function InfoPanel(props: Props) {
  const { activeTab, dispatch, infoPanelMinimized, infoPanelHidden } = props;

  return (
    <InfoPanelWrapper
      isHidden={infoPanelHidden}
      isMinimized={infoPanelMinimized}
    >
      <InfoPanelHeader data-testid="info-panel-header">
        <InfoPanelTabs>
          <StyledAnchorButton
            className={activeTab === "Gene" ? "active" : ""}
            minimal
            text="Gene"
            onClick={() =>
              dispatch({
                type: "toggle active info panel",
                activeTab: "Gene",
              })
            }
          />
          <StyledAnchorButton
            className={activeTab === "Dataset" ? "active" : ""}
            minimal
            text="Dataset"
            onClick={() =>
              dispatch({
                type: "toggle active info panel",
                activeTab: "Dataset",
              })
            }
          />
        </InfoPanelTabs>
        <CollapseToggle>
          <ButtonGroup
            style={{
              position: "relative",
              bottom: 2,
            }}
          >
            <AnchorButton
              active={false}
              data-testid={
                infoPanelMinimized ? "max-info-panel" : "min-info-panel"
              }
              minimal
              text=""
              rightIcon={infoPanelMinimized ? "chevron-up" : "chevron-down"}
              onClick={() => {
                dispatch({ type: "minimize/maximize info panel" });
              }}
            />
            <AnchorButton
              active={false}
              data-testid="close-info-panel"
              minimal
              text=""
              rightIcon="cross"
              onClick={() =>
                dispatch({
                  type: "close info panel",
                })
              }
            />
          </ButtonGroup>
        </CollapseToggle>
      </InfoPanelHeader>
      <InfoPanelContent
        isHidden={infoPanelHidden}
        isMinimized={infoPanelMinimized}
      >
        {activeTab === "Gene" && <GeneInfo />}
        {activeTab === "Dataset" && <DatasetInfo />}
      </InfoPanelContent>
    </InfoPanelWrapper>
  );
}

export default connect(mapStateToProps)(InfoPanel);
