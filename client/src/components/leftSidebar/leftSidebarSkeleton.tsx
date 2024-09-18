/* Core dependencies */
import { SKELETON } from "@blueprintjs/core/lib/esnext/common/classes";
import React, { CSSProperties } from "react";

/* Styles */
import StillLoading from "common/components/BrushableHistogram/components/StillLoading/StillLoading";
import { StillLoading as CategoryLoading } from "../categorical/category";
import { LeftSidebarWrapper } from "./style";

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
    <LeftSidebarWrapper>
      {/* Categorical */}
      <div style={{ padding: 10 }}>
        <div style={STYLE_SUPER_CATEGORY} className={SKELETON} />
        {[...Array(10)].map((_, i) => (
          /* eslint-disable-next-line react/no-array-index-key -- array order won't change */
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
          /* eslint-disable-next-line react/no-array-index-key -- array order won't change */
          <StillLoading key={i} />
        ))}
      </div>
    </LeftSidebarWrapper>
  );
}

export default LeftSidebarSkeleton;
