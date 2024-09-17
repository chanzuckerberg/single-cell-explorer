import React from "react";

import Categorical from "./components/Categorical/Categorical";
import Continuous from "./components/Continuous/Continuous";
import { LeftSidebarContainer } from "./style";
import { LeftSidebarWrapper } from "~/common/components/LeftSidebarWrapper/LeftSidebarWrapper";

function LeftSideBar() {
  return (
    <LeftSidebarWrapper>
      <LeftSidebarContainer>
        <Categorical />
        <Continuous />
      </LeftSidebarContainer>
    </LeftSidebarWrapper>
  );
}

export default LeftSideBar;
