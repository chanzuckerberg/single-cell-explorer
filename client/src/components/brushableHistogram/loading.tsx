import { SKELETON } from "@blueprintjs/core/lib/esnext/common/classes";
import React from "react";

interface StillLoadingProps {
  height?: number;
}
/**
 * Render a loading indicator for the field.
 */
function StillLoading({ height = 211 }: StillLoadingProps) {
  return <div style={{ height }} className={SKELETON} />;
}

export default StillLoading;
