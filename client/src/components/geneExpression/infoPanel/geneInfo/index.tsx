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
import { RootState } from "../../../../reducers";

interface Props {
  geneSummary: string;
  geneName: string;
  gene: string;
  geneUrl: string;
  geneSynonyms: string[];
  showWarningBanner: boolean;
  infoError: string;
}

const mapStateToProps = (state: RootState): Props => ({
  geneSummary: state.controls.geneSummary,
  geneName: state.controls.geneName,
  gene: state.controls.gene,
  geneUrl: state.controls.geneUrl,
  geneSynonyms: state.controls.geneSynonyms,
  showWarningBanner: state.controls.showWarningBanner,
  infoError: state.controls.infoError,
});

const GeneInfo = (props: Props) => {
  const {
    geneSummary,
    geneName,
    gene,
    geneUrl,
    geneSynonyms,
    infoError,
    showWarningBanner,
  } = props;

  let synonymList;
  if (geneSynonyms.length > 1) {
    synonymList = geneSynonyms.join(", ");
  } else if (geneSynonyms.length === 1) {
    synonymList = geneSynonyms[0];
  } else {
    synonymList = null;
  }

  console.log(gene);

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
              <Content
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: "7",
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                This gene does not currently have a summary in NCBI.
              </Content>
            ) : (
              <Content
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: "7",
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
                data-testid="gene-info-summary"
              >
                {geneSummary}
              </Content>
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
};

export default connect(mapStateToProps)(GeneInfo);
