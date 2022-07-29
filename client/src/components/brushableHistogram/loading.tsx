import { SKELETON } from "@blueprintjs/core/lib/esnext/common/classes";
import React from "react";
import { Int32 } from "../../common/types/arraytypes";

interface StillLoadingProps {
  height: Int32;
}
/**
 * Render a loading indicator for the field.
 */
const StillLoading = ({ height }: StillLoadingProps): JSX.Element => (
  <div style={{ height }} className={SKELETON} />
);
export default StillLoading;
