import React from "react";
import { kebabCase } from "lodash";

import {
  Content,
  ContentRow,
  InfoDiv,
  InfoLabel,
  InfoOpenIn,
  InfoSymbol,
  InfoTitle,
  Link,
  Items,
} from "../../style";
import { ExtendedInfoProps } from "../../types";
import { OPEN_IN, LABELS } from "../../constants";
import { ShowWarningBanner } from "./components/ShowWarningBanner/ShowWarningBanner";

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
        <InfoSymbol data-testid="info-type-title">{symbol ?? name}</InfoSymbol>
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
