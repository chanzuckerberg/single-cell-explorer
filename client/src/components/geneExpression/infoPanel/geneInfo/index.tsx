import React from "react";
import { connect } from "react-redux";
import { Icon } from "czifui";
import {
  SynHeader,
  Synonyms,
  Link,
  Content,
  GeneSymbol,
  GeneInfoContainer,
  GeneInfoEmpty,
  GeneInfoWrapper,
  WarningBanner,
  NoGeneSelectedDiv,
  MessageDiv,
  CustomIcon,
} from "./style";
import { Props, mapStateToProps } from "./types";
import { useConnect } from "./connect";

function GeneInfo(props: Props) {
  const {
    geneSummary,
    geneName,
    gene,
    geneUrl,
    geneSynonyms,
    infoError,
    showWarningBanner,
  } = props;

  const { synonymList } = useConnect({ geneSynonyms });

  return (
    <GeneInfoWrapper id="geneinfo_wrapper" data-testid={`${gene}:gene-info`}>
      <GeneInfoContainer id="gene-info">
        {geneName === "" && infoError === null && gene !== null ? (
          <GeneInfoEmpty>
            <GeneSymbol>{gene}</GeneSymbol>
            <Content>loading...</Content>
          </GeneInfoEmpty>
        ) : null}
        {gene === null && infoError === null ? (
          <GeneInfoEmpty>
            <NoGeneSelectedDiv>
              <CustomIcon icon="search" size={33} />

              <MessageDiv className="title">No Gene Selected</MessageDiv>
              <MessageDiv>
                Choose a gene above or search the NCBI database.
              </MessageDiv>
            </NoGeneSelectedDiv>
          </GeneInfoEmpty>
        ) : null}
        {infoError !== null ? (
          <GeneInfoEmpty>
            <GeneSymbol>{gene}</GeneSymbol>
            <Content>Sorry, this gene could not be found on NCBI.</Content>
            <Link
              href={`https://www.google.com/search?q=${gene}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              Search on Google
            </Link>
          </GeneInfoEmpty>
        ) : null}
        {geneName !== "" && infoError === null ? (
          <GeneInfoEmpty>
            {showWarningBanner ? (
              <WarningBanner>
                <Icon
                  sdsIcon="exclamationMarkCircle"
                  sdsSize="l"
                  sdsType="static"
                />
                <span>
                  NCBI didn&apos;t return an exact match for this gene.
                </span>
              </WarningBanner>
            ) : null}
            <GeneSymbol data-testid="gene-info-symbol">{gene}</GeneSymbol>
            <Content data-testid="gene-info-name">{geneName}</Content>
            {geneSummary === "" ? (
              <Content>
                This gene does not currently have a summary in NCBI.
              </Content>
            ) : (
              <Content data-testid="gene-info-summary">{geneSummary}</Content>
            )}
            {synonymList ? (
              <p>
                <SynHeader>Synonyms</SynHeader>
                <Synonyms data-testid="gene-info-synonyms">
                  {synonymList}
                </Synonyms>
              </p>
            ) : null}
            {geneUrl !== "" ? (
              <Link
                href={geneUrl}
                target="_blank"
                rel="noreferrer noopener"
                data-testid="gene-info-link"
              >
                View on NCBI
              </Link>
            ) : null}
          </GeneInfoEmpty>
        ) : null}
      </GeneInfoContainer>
    </GeneInfoWrapper>
  );
}

export default connect(mapStateToProps)(GeneInfo);
