/* Core dependencies */
import { SKELETON } from "@blueprintjs/core/lib/esnext/common/classes";
import React from "react";

/* App dependencies */
import Controls from "../controls";
import Layout from "./layout";
import LeftSidebarSkeleton from "../leftSidebar/leftSidebarSkeleton";
import RightSidebarSkeleton from "../rightSidebar/rightSidebarSkeleton";

/*
 Skeleton layout component displayed when in loading state.
 @returns Markup displaying skeleton.
 */
function LayoutSkeleton(): JSX.Element {
  return (
    <Layout>
      <LeftSidebarSkeleton />
      {() => (
        <Controls>
          <div
            style={{
              height: 30,
              position: "relative",
              top: 8,
              width: "calc(100% - 482px - 10px)",
            }}
            className={SKELETON}
          />
          <div
            style={{
              height: 30,
              position: "relative",
              top: 8,
              width: 482,
            }}
            className={SKELETON}
          />
        </Controls>
      )}
      <RightSidebarSkeleton />
    </Layout>
  );
}

export default LayoutSkeleton;
