import React from "react";

import GeneExpression from "../geneExpression";
import InfoPanel from "../geneExpression/infoPanel";
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
