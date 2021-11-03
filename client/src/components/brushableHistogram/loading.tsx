import { SKELETON } from "@blueprintjs/core/lib/esnext/common/classes";
import React from "react";

/**
 * Render a loading indicator for the field.
 */
const StillLoading = (): JSX.Element => (
  <div style={{ height: 211 }} className={SKELETON} />
);
export default StillLoading;
