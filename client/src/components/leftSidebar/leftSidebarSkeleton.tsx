/* Core dependencies */
import { SKELETON } from "@blueprintjs/core/lib/esnext/common/classes";
import React, { CSSProperties } from "react";

/* App dependencies */
import Logo from "../framework/logo";
import Title from "../framework/title";

/* Styles */
import { STYLE_LEFT_SIDEBAR } from ".";
import StillLoading from "../brushableHistogram/loading";
import { StillLoading as CategoryLoading } from "../categorical/category";
import { STYLE_TOP_LEFT_LOGO_AND_TITLE } from "./topLeftLogoAndTitle";

const STYLE_SUPER_CATEGORY: CSSProperties = {
  height: 22,
  margin: "8px 0",
  width: 160,
};

/**
 * Skeleton of left side bar, to be displayed during data load.
 * @returns Markup displaying left side bar skeleton.
 */
function LeftSidebarSkeleton(): JSX.Element {
  return (
    <div style={STYLE_LEFT_SIDEBAR}>
      {/* TopLeftLogoAndTitle */}
      <div
        style={{
          ...STYLE_TOP_LEFT_LOGO_AND_TITLE,
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
      <div style={{ padding: 10 }}>
        <div style={STYLE_SUPER_CATEGORY} className={SKELETON} />
        {[...Array(10).keys()].map((i) => (
          <CategoryLoading key={i} />
        ))}
      </div>
      {/* Continuous */}
      <div>
        <div
          style={{ ...STYLE_SUPER_CATEGORY, marginLeft: 10 }}
          className={SKELETON}
        />
        {[...Array(2)].map((_, i) => (
          <StillLoading key={i} />
        ))}
      </div>
    </div>
  );
}

export default LeftSidebarSkeleton;
