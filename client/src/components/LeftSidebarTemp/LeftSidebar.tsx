import React from "react";

import Categorical from "./components/CategoricalTemp/Categorical";
import Continuous from "./components/ContinuousTemp/ContinuousTemp";
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
