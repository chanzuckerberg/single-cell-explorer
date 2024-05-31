import React from "react";
import { connect } from "react-redux";
import { AnchorButton, ButtonGroup } from "@blueprintjs/core";
import { RootState } from "../../../reducers";
import {
  CollapseToggle,
  InfoPanelContent,
  InfoPanelHeader,
  InfoPanelTabs,
  InfoPanelWrapper,
} from "./style";
import GeneInfo from "../geneInfo/geneInfo";

interface Props {
  activeTab: string;
  geneIsOpen: boolean;
  dispatch: any;
  geneIsMinimized: boolean;
  infoPanelHidden: boolean;
}

const InfoPanel = (props: Props) => {
  const { activeTab, geneIsOpen, dispatch, geneIsMinimized, infoPanelHidden } =
    props;
  console.log(activeTab);
  console.log(geneIsOpen);
  console.log(infoPanelHidden);
  const minimized = geneIsMinimized;

  return (
    <InfoPanelWrapper>
      <div className={infoPanelHidden === true ? "hidden" : ""}>
        <InfoPanelHeader>
          <InfoPanelTabs>
            <div className={activeTab === "CellType" ? "active" : ""}>
              Cell Type
            </div>
            <div className={activeTab === "Gene" ? "active" : ""}>Gene</div>
            <div className={activeTab === "Dataset" ? "active" : ""}>
              Dataset
            </div>
          </InfoPanelTabs>
          <CollapseToggle>
            <ButtonGroup
              style={{
                position: "relative",
                //   right: 5,
                bottom: 2,
              }}
            >
              <AnchorButton
                active={false}
                data-testid="menu"
                minimal
                text=""
                rightIcon={minimized ? "chevron-up" : "chevron-down"}
                onClick={() => {
                  dispatch({ type: "minimize/maximize gene info" });
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
                    type: "clear gene info",
                  })
                }
              />
            </ButtonGroup>
          </CollapseToggle>
        </InfoPanelHeader>
        <InfoPanelContent>
          {activeTab === "CellType" && <div>Content for CellType Panel</div>}
          {activeTab === "Gene" && geneIsOpen && (
            <GeneInfo
              geneSummary=""
              geneName=""
              gene=""
              geneUrl=""
              geneSynonyms={[]}
              showWarningBanner
            />
          )}
          {activeTab === "Dataset" && <div>Content for Dataset Panel</div>}
        </InfoPanelContent>
      </div>
    </InfoPanelWrapper>
  );
};

export default connect((state: RootState) => ({
  activeTab: state.controls.activeTab,
  geneIsOpen: state.controls.geneIsOpen,
  geneIsMinimized: state.controls.geneIsMinimized,
  infoPanelHidden: state.controls.infoPanelHidden,
}))(InfoPanel);
