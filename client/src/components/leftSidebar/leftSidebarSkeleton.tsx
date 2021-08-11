/* Core dependencies */
import { SKELETON } from "@blueprintjs/core/lib/esnext/common/classes";
import React from "react";

/* App dependencies */
import Logo from "../framework/logo";
import Title from "../framework/title";

/* Styles */
import { leftSidebarStyle } from ".";
import { topLeftLogoAndTileStyle } from "./topLeftLogoAndTitle";

/*
 Skeleton of left side bar, to be displayed during data load.
 @returns Markup displaying left side bar skeleton.
 */
function LeftSidebarSkeleton(): JSX.Element {
  return (
    <div style={leftSidebarStyle}>
      {/* TopLeftLogoAndTitle */}
      <div
        style={{
          ...topLeftLogoAndTileStyle,
          alignItems: "flex-start",
          paddingRight: 5,
        }}
      >
        <div>
          <Logo size={28} />
          <Title />
        </div>
        {/* Hamburger */}
        <div style={{ height: 30, width: 30 }} className={SKELETON} />
      </div>
      {/* Categorical */}
      <div style={{ padding: 8 }}>
        {[...Array(10).keys()].map((i) => (
          <div
            key={i}
            style={{ height: 30, marginBottom: 4 }}
            className={SKELETON}
          />
        ))}
      </div>
      {/* Continuous */}
      {[...Array(2).keys()].map((i) => (
        <div key={i} style={{ height: 211 }} className={SKELETON} />
      ))}
    </div>
  );
}

export default LeftSidebarSkeleton;
