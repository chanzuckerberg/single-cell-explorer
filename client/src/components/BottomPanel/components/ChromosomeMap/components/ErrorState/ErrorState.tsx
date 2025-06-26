import React, { ReactNode } from "react";

export const ErrorState = ({ children }: { children: ReactNode }) => (
  <div style={{ display: "flex", margin: "16px", height: "50px" }}>
    {children}
  </div>
);
