import React from "react";
import { kebabCase } from "lodash";
import { Icon } from "czifui";

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
  LOADING_STRING,
  NCBI_WARNING,
  NO_ENTITY_SELECTED,
  OPEN_IN,
  SEARCH_ON_GOOGLE,
  SELECT_GENE_OR_CELL_TYPE,
  LABELS,
} from "../constants";

export function LoadingInfo(props: BaseInfoProps) {
  const { name, entity } = props;
  return (
    <InfoDiv>
      <InfoTitle>
        <InfoSymbol>{name}</InfoSymbol>
      </InfoTitle>
      <Content>{LOADING_STRING(entity)}</Content>
    </InfoDiv>
  );
}

export function NoneSelected({ entity }: { entity: BaseInfoProps["entity"] }) {
  return (
    <InfoDiv>
      <NoGeneSelectedDiv>
        <CustomIcon icon="search" size={33} />
        <MessageDiv className="title">{NO_ENTITY_SELECTED(entity)}</MessageDiv>
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
  const { name, entity } = props;
  return (
    <InfoDiv>
      <InfoTitle>
        <InfoSymbol>{name}</InfoSymbol>
      </InfoTitle>
      <Content style={{ paddingBottom: "10px" }}>
        {ENTITY_NOT_FOUND(entity)}
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
    entity,
    description,
    id,
    synonyms,
    references,
    url,
    symbol,
    showWarningBanner,
  } = props;
  const externalUrl = id ? url + id : url;
  const entityTag = kebabCase(entity);

  return (
    <InfoDiv>
      {showWarningBanner ?? <ShowWarningBanner />}
      <InfoTitle>
        <InfoSymbol>{symbol ?? name}</InfoSymbol>
        <InfoOpenIn>
          <Link href={externalUrl} target="_blank">
            {OPEN_IN(entity === "Cell Type" ? "Cell Guide" : "NCBI")}
          </Link>
        </InfoOpenIn>
      </InfoTitle>
      {entity === "Gene" && (
        <ContentRow data-testid={`${entityTag}-info-name`}>{name}</ContentRow>
      )}
      <Content>
        <ContentRow>{description}</ContentRow>
        {entity === "Cell Type" ?? (
          <ContentRow>
            {LABELS.ontologyID}
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
        {entity === "Cell Type" && references && references?.length > 0 && (
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
