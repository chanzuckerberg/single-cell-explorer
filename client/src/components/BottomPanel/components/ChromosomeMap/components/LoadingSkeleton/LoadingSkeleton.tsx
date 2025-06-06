import React from "react";
import { SKELETON } from "@blueprintjs/core/lib/esnext/common/classes";

export const LoadingSkeleton = ({
  height,
  marginBottom,
  marginTop,
}: {
  height: string;
  marginBottom?: string;
  marginTop?: string;
}) => (
  <div
    className={SKELETON}
    style={{
      height,
      display: "flex",
      marginBottom: marginBottom ?? "10px",
      marginTop: marginTop ?? "0px",
    }}
  />
);
