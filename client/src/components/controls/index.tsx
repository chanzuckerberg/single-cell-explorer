/* Core dependencies */
import React from "react";

interface Props {
  children: React.ReactNode;
}

/*
 Controls component for positioning graph controls.
 @returns Markup displaying children positioned within the graph grid template area.
 */
function Controls(props: Props): JSX.Element {
  const { children } = props;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        left: 8,
        position: "absolute",
        right: 8,
        top: 0,
        zIndex: 3,
      }}
    >
      {children}
    </div>
  );
}

export default Controls;
