import React from "react";

import Categorical from "../categorical";
import Continuous from "../continuous/continuous";
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
