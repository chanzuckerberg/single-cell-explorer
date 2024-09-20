import React from "react";

import Categorical from "./components/Categorical/Categorical";
import Continuous from "./components/Continuous/Continuous";
import { LeftSidebarContainer, LeftSidebarWrapper } from "./style";

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
