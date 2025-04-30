import React from "react";

import { CoveragePlot } from "../CoveragePlot/CoveragePlot";
import { BottomSidebarContainer, BottomSidebarWrapper } from "./style";

export const BottomSideBar = () => (
  <BottomSidebarWrapper>
    <BottomSidebarContainer>
      <CoveragePlot />
    </BottomSidebarContainer>
  </BottomSidebarWrapper>
);
