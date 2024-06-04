/* Core dependencies */
import React, { CSSProperties } from "react";

/* App dependencies */
import Categorical from "../categorical";
import * as globals from "../../globals";

import Continuous from "../continuous/continuous";

/* Styles */
export const STYLE_LEFT_SIDEBAR: CSSProperties = {
  /* x y blur spread color */
  borderRight: `1px solid ${globals.lightGrey}`,
  display: "flex",
  flexDirection: "column",
  height: "100%",
};

const LeftSideBar = () => (
  <div style={STYLE_LEFT_SIDEBAR}>
    <div
      style={{
        height: "100%",
        width: globals.leftSidebarWidth,
        overflowY: "auto",
      }}
    >
      <Categorical />
      <Continuous />
    </div>
  </div>
);

export default LeftSideBar;
