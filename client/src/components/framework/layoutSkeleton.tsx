/* Core dependencies */
import { SKELETON } from "@blueprintjs/core/lib/esnext/common/classes";
import React from "react";

/* App dependencies */
import Controls from "../controls";
import Layout from "./layout";
import LeftSidebarSkeleton from "../leftSidebar/leftSidebarSkeleton";
import RightSidebarSkeleton from "../rightSidebar/rightSidebarSkeleton";

/**
 * Skeleton layout component displayed when in loading state.
 * @returns Markup displaying skeleton.
 */
function LayoutSkeleton(): JSX.Element {
  return (
    <Layout addTopPadding>
      <LeftSidebarSkeleton />
      <RightSidebarSkeleton />
      <Controls>
        <div
          style={{
            height: 30,
            position: "relative",
            top: 8,
            width: "100%",
          }}
          className={SKELETON}
          data-testid="menubar-skeleton"
        />
      </Controls>
    </Layout>
  );
}

export default LayoutSkeleton;
