import React from "react";

import GeneExpression from "./components/GeneExpression/GeneExpression";
import InfoPanel from "./components/InfoPanel/InfoPanel";
import { RightSidebarWrapper } from "~/common/components/RightSidebarWrapper/RightSidebarWrapper";

function RightSidebar() {
  return (
    <RightSidebarWrapper>
      <GeneExpression />
      <InfoPanel />
    </RightSidebarWrapper>
  );
}

export default RightSidebar;
