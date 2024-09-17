import React from "react";
import { SKELETON } from "@blueprintjs/core/lib/esnext/common/classes";

/**
 * We are still loading this category, so render a "busy" signal.
 */
export const CategoryLoading = (): JSX.Element => (
  <div style={{ paddingBottom: 2.7 }}>
    <div className={SKELETON} style={{ height: 30 }} />
  </div>
);
