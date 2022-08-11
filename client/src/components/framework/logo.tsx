import React from "react";
import * as globals from "../../globals";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
const Logo = (props: any) => {
  const { size } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" fill="white" />
      <rect x="19" y="19" width="22" height="22" fill={globals.logoColor} />
      <rect x="26" y="26" width="8" height="8" fill="white" />
      <rect x="7" y="19" width="7" height="22" fill={globals.logoColor} />
      <rect
        x="19"
        y="7"
        width="22"
        height="7"
        fill={globals.logoIconAccentColor}
      />
    </svg>
  );
};

export default Logo;
