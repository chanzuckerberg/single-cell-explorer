import React from "react";

import GeneExpression from "./components/GeneExpression/GeneExpression";
import InfoPanel from "./components/GeneExpression/components/InfoPanel/InfoPanel";
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
