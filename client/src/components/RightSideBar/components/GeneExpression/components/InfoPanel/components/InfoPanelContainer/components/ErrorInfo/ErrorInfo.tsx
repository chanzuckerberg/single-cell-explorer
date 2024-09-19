import React from "react";
import { Content, InfoDiv, InfoSymbol, InfoTitle, Link } from "../../style";
import { BaseInfoProps } from "../../types";
import { ENTITY_NOT_FOUND, SEARCH_ON_GOOGLE } from "../../constants";

export function ErrorInfo(props: BaseInfoProps) {
  const { name, infoType } = props;
  return (
    <InfoDiv>
      <InfoTitle>
        <InfoSymbol>{name}</InfoSymbol>
      </InfoTitle>
      <Content style={{ paddingBottom: "10px" }}>
        {ENTITY_NOT_FOUND(infoType)}
      </Content>
      <Link
        href={`https://www.google.com/search?q=${name}`}
        target="_blank"
        rel="noreferrer noopener"
      >
        {SEARCH_ON_GOOGLE}
      </Link>
    </InfoDiv>
  );
}
