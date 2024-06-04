import React from "react";
import { connect } from "react-redux";
import { AnchorButton, ButtonGroup } from "@blueprintjs/core";
import { AppDispatch, RootState } from "../../../reducers";
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

interface Props {
  activeTab: string;
  dispatch: AppDispatch;
  infoPanelMinimized: boolean;
  infoPanelHidden: boolean;
}

const InfoPanel = (props: Props) => {
  const { activeTab, dispatch, infoPanelMinimized, infoPanelHidden } = props;

  return (
    <InfoPanelWrapper
      isHidden={infoPanelHidden}
      isMinimized={infoPanelMinimized}
    >
      <InfoPanelHeader>
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
              data-testid="menu"
              minimal
              text=""
              rightIcon={infoPanelMinimized ? "chevron-up" : "chevron-down"}
              onClick={() => {
                dispatch({ type: "minimize/maximize info panel" });
              }}
            />
            <AnchorButton
              active={false}
              data-testid="menu"
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
};

export default connect((state: RootState) => ({
  activeTab: state.controls.activeTab,
  geneIsOpen: state.controls.geneIsOpen,
  infoPanelMinimized: state.controls.infoPanelMinimized,
  infoPanelHidden: state.controls.infoPanelHidden,
}))(InfoPanel);
