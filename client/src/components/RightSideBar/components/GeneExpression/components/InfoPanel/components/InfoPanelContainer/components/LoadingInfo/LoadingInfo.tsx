import React from "react";
import { LoadingIndicator } from "@czi-sds/components";

import { InfoDiv, InfoSymbol, InfoTitle } from "../../style";
import { BaseInfoProps } from "../../types";

export function LoadingInfo(props: BaseInfoProps) {
  const { name } = props;
  return (
    <InfoDiv>
      <InfoTitle>
        <InfoSymbol data-testid="info-type-loading">{name}</InfoSymbol>
      </InfoTitle>
      <div
        style={{
          margin: 0,
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <span style={{ textAlign: "center" }}>
            <LoadingIndicator sdsStyle="minimal" />
          </span>
        </div>
      </div>
    </InfoDiv>
  );
}
