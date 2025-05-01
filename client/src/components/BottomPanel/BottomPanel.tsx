import React from "react";
import { connect } from "react-redux";
import { Props, mapStateToProps } from "./types";

import { CoveragePlot } from "../CoveragePlot/CoveragePlot";
import { BottomPanelContainer, BottomPanelWrapper, CloseButton } from "./style";

const BottomSideBar = ({ bottomPanelHidden, dispatch }: Props) => (
  <BottomPanelWrapper isHidden={bottomPanelHidden}>
    <CloseButton
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
    <BottomPanelContainer>
      <CoveragePlot />
    </BottomPanelContainer>
  </BottomPanelWrapper>
);

export default connect(mapStateToProps)(BottomSideBar);
