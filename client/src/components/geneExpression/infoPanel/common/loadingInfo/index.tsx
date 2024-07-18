import React from "react";
import { kebabCase } from "lodash";
import { Icon } from "czifui";

import {
  Content,
  CustomIcon,
  InfoDiv,
  InfoSymbol,
  Link,
  MessageDiv,
  NoGeneSelectedDiv,
  SynHeader,
  Synonyms,
  WarningBanner,
} from "../style";
import { BaseInfoProps, ExtendedInfoProps } from "../types";

export function LoadingInfo(props: BaseInfoProps) {
  const { name, entity } = props;
  return (
    <InfoDiv>
      <InfoSymbol>{name}</InfoSymbol>
      <Content>Loading {entity}...</Content>
    </InfoDiv>
  );
}

export function NoneSelected({ entity }: { entity: BaseInfoProps["entity"] }) {
  return (
    <InfoDiv>
      <NoGeneSelectedDiv>
        <CustomIcon icon="search" size={33} />
        <MessageDiv className="title">No {entity} Selected</MessageDiv>
        <MessageDiv>
          Choose a gene above or search the Cell Guide database.
        </MessageDiv>
      </NoGeneSelectedDiv>
    </InfoDiv>
  );
}

export function ShowWarningBanner() {
  return (
    <WarningBanner>
      <Icon sdsIcon="exclamationMarkCircle" sdsSize="l" sdsType="static" />
      <span>NCBI didn&apos;t return an exact match for this gene.</span>
    </WarningBanner>
  );
}

export function ErrorInfo(props: BaseInfoProps) {
  const { name, entity } = props;
  return (
    <InfoDiv>
      <InfoSymbol>{name}</InfoSymbol>
      <Content>Sorry, this {entity} could not be found.</Content>
      <Link
        href={`https://www.google.com/search?q=${name}`}
        target="_blank"
        rel="noreferrer noopener"
      >
        Search on Google
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
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <InfoSymbol>{symbol ?? name}</InfoSymbol>
        <div style={{ paddingTop: "1px" }}>
          <a href={externalUrl} target="_blank">
            Open in Cell Guide
          </a>
        </div>
      </div>
      {entity === "Gene" && (
        <Content data-testid={`${entityTag}-info-name`}>{name}</Content>
      )}
      <Content>
        <p>{description}</p>
        {entity === "Cell Type" ?? (
          <p>
            Ontology ID:
            <Link href={externalUrl} target="_blank">
              {id}
            </Link>
          </p>
        )}
        {synonyms.length > 0 && (
          <p>
            <SynHeader>Synonyms</SynHeader>
            <Synonyms data-testid={`"gene-info-synonyms`}>
              {synonyms.map((syn) => (
                <span key={`syn-${syn}`}>{syn}, </span>
              ))}
            </Synonyms>
          </p>
        )}
        {entity === "Cell Type" && references && references?.length > 0 && (
          <p>
            <SynHeader>References</SynHeader>
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
          </p>
        )}
      </Content>
    </InfoDiv>
  );
}
