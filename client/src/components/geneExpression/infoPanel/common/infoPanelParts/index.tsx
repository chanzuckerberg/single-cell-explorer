import React from "react";
import { kebabCase } from "lodash";
import { Icon, LoadingIndicator } from "czifui";

import {
  Content,
  ContentRow,
  CustomIcon,
  InfoDiv,
  InfoLabel,
  InfoOpenIn,
  InfoSymbol,
  InfoTitle,
  Link,
  MessageDiv,
  NoGeneSelectedDiv,
  Items,
  WarningBanner,
} from "../style";
import { BaseInfoProps, ExtendedInfoProps } from "../types";
import {
  ENTITY_NOT_FOUND,
  NCBI_WARNING,
  NO_ENTITY_SELECTED,
  OPEN_IN,
  SEARCH_ON_GOOGLE,
  SELECT_GENE_OR_CELL_TYPE,
  LABELS,
} from "../constants";

export function LoadingInfo(props: BaseInfoProps) {
  const { name } = props;
  return (
    <InfoDiv>
      <InfoTitle>
        <InfoSymbol>{name}</InfoSymbol>
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
          <p style={{ textAlign: "center" }}>
            <LoadingIndicator sdsStyle="minimal" />
          </p>
        </div>
      </div>
    </InfoDiv>
  );
}

export function NoneSelected({
  infoType,
}: {
  infoType: BaseInfoProps["infoType"];
}) {
  return (
    <InfoDiv>
      <NoGeneSelectedDiv>
        <CustomIcon icon="search" size={33} />
        <MessageDiv className="title">
          {NO_ENTITY_SELECTED(infoType)}
        </MessageDiv>
        <MessageDiv>{SELECT_GENE_OR_CELL_TYPE}</MessageDiv>
      </NoGeneSelectedDiv>
    </InfoDiv>
  );
}

export function ShowWarningBanner() {
  return (
    <WarningBanner>
      <Icon sdsIcon="exclamationMarkCircle" sdsSize="l" sdsType="static" />
      <span>{NCBI_WARNING}</span>
    </WarningBanner>
  );
}

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

export function ShowInfo(props: ExtendedInfoProps) {
  const {
    name,
    infoType,
    description,
    id,
    synonyms,
    references,
    url,
    symbol,
    showWarningBanner,
  } = props;
  const externalUrl = id ? url + id : url;
  const infoTypeTag = kebabCase(infoType);

  return (
    <InfoDiv>
      {showWarningBanner && <ShowWarningBanner />}
      <InfoTitle>
        <InfoSymbol>{symbol ?? name}</InfoSymbol>
        <InfoOpenIn>
          <Link href={externalUrl} target="_blank">
            {OPEN_IN(infoType === "Cell Type" ? "Cell Guide" : "NCBI")}
          </Link>
        </InfoOpenIn>
      </InfoTitle>
      {infoType === "Gene" && (
        <ContentRow data-testid={`${infoTypeTag}-info-name`}>{name}</ContentRow>
      )}
      <Content>
        <ContentRow>{description}</ContentRow>
        {infoType === "Cell Type" && (
          <ContentRow>
            <InfoLabel>{LABELS.ontologyID}</InfoLabel>
            <Link href={externalUrl} target="_blank">
              {id}
            </Link>
          </ContentRow>
        )}
        {synonyms.length > 0 && (
          <ContentRow>
            <InfoLabel>{LABELS.Synonyms}</InfoLabel>
            <Items data-testid={`"gene-info-synonyms`}>
              {synonyms.map((syn, index) => (
                <span key={`syn-${syn}`}>
                  {syn}
                  {index < synonyms.length - 1 && ", "}
                </span>
              ))}
            </Items>
          </ContentRow>
        )}
        {infoType === "Cell Type" && references && references?.length > 0 && (
          <ContentRow>
            <InfoLabel>{LABELS.References} </InfoLabel>
            {references.map((ref, index) => (
              <Link
                href={ref}
                target="_blank"
                rel="noopener noreferrer"
                style={{ paddingRight: "3px" }}
                key={`ref-${ref}`}
              >
                [{index + 1}]
              </Link>
            ))}
          </ContentRow>
        )}
      </Content>
    </InfoDiv>
  );
}
