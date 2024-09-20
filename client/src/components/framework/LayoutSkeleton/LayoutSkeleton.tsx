/* Core dependencies */
import { SKELETON } from "@blueprintjs/core/lib/esnext/common/classes";
import React from "react";

/* App dependencies */
import Controls from "common/components/Controls/Controls";
import LeftSidebarSkeleton from "components/LeftSidebar/LeftSidebarSkeleton";
import Layout from "../layout";
import { RightSidebarSkeleton } from "./components/RightSidebarSkeleton/RightSidebarSkeleton";

/**
 * Skeleton layout component displayed when in loading state.
 * @returns Markup displaying skeleton.
 */
export function LayoutSkeleton(): JSX.Element {
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
