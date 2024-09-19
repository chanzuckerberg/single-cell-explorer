import React from "react";

import GeneExpression from "./components/geneExpression";
import InfoPanel from "./components/geneExpression/infoPanel";
import { RightSidebarWrapper } from "./style";

function RightSidebar() {
  return (
    <RightSidebarWrapper>
      <GeneExpression />
      <InfoPanel />
    </RightSidebarWrapper>
  );
}

export default RightSidebar;
