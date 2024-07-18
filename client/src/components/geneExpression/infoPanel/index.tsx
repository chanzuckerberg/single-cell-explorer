import React, { useState, ChangeEvent, useEffect } from "react";
import { connect } from "react-redux";
import { AnchorButton, ButtonGroup } from "@blueprintjs/core";
import { Tabs, Tab } from "czifui";

import {
  CollapseToggle,
  InfoPanelContent,
  InfoPanelHeader,
  InfoPanelWrapper,
} from "./style";
import CellTypeInfo from "./cellTypeInfo";
import GeneInfo from "./geneInfo";
import DatasetInfo from "./datasetInfo";
import { Props, mapStateToProps } from "./types";

function InfoPanel(props: Props) {
  const { activeTab, dispatch, infoPanelMinimized, infoPanelHidden } = props;
  const [value, setValue] = useState(1);

  const handleTabsChange = (
    _: ChangeEvent<Record<string, unknown>>,
    tabsValue: unknown
  ) => {
    setValue(tabsValue as number);
    dispatch({
      type: "toggle active info panel",
      activeTab:
        tabsValue === 0 ? "Gene" : tabsValue === 1 ? "CellType" : "Dataset",
    });
  };

  useEffect(() => {
    setValue(activeTab === "Gene" ? 0 : activeTab === "CellType" ? 1 : 2);
  }, [activeTab]);

  return (
    <InfoPanelWrapper
      isHidden={infoPanelHidden}
      isMinimized={infoPanelMinimized}
    >
      <InfoPanelHeader
        data-testid="info-panel-header"
        style={{ paddingBottom: "5px" }}
      >
        <Tabs value={value} sdsSize="small" onChange={handleTabsChange}>
          <Tab label="Gene" />
          <Tab label="Cell Type" />
          <Tab label="Dataset" />
        </Tabs>
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
        {activeTab === "CellType" && <CellTypeInfo />}
        {activeTab === "Dataset" && <DatasetInfo />}
      </InfoPanelContent>
    </InfoPanelWrapper>
  );
}

export default connect(mapStateToProps)(InfoPanel);
