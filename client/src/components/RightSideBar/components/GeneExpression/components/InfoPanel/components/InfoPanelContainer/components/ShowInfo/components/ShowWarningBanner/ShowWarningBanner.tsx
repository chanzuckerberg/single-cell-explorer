import React from "react";
import { Icon } from "@czi-sds/components";
import { WarningBanner } from "../../../../style";
import { NCBI_WARNING } from "../../../../constants";

export function ShowWarningBanner() {
  return (
    <WarningBanner>
      <Icon sdsIcon="ExclamationMarkCircle" sdsSize="l" sdsType="static" />
      <span>{NCBI_WARNING}</span>
    </WarningBanner>
  );
}
