import React from "react";

import GeneExpression from "./components/GeneExpression/GeneExpression";
import InfoPanel from "./components/GeneExpression/components/InfoPanel/InfoPanel";
import AgentPanel from "../Agent/AgentPanel";
import { RightSidebarWrapper } from "./style";

function RightSidebar() {
  return (
    <RightSidebarWrapper>
      <GeneExpression />
      <InfoPanel />
      <AgentPanel />
    </RightSidebarWrapper>
  );
}

export default RightSidebar;
