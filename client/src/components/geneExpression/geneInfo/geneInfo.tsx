import React from "react";
import { connect } from "react-redux";
import { Button, ButtonGroup } from "@blueprintjs/core";
import { Icon } from "czifui";
import {
  SynHeader,
  Synonyms,
  Link,
  Content,
  GeneSymbol,
  GeneHeader,
  GeneInfoWrapper,
  WarningBanner,
} from "./style";
import * as styles from "../util";
import { RootState } from "../../../reducers";
import * as globals from "../../../globals";

type State = RootState;

interface Props {
  geneSummary: string;
  geneName: string;
  gene: string;
  geneUrl: string;
  geneSynonyms: string[];
  isEnsemblIdResult: boolean;
}

// @ts-expect-error ts-migrate(1238) FIXME: Unable to resolve signature of class decorator whe... Remove this comment to see the full error message
@connect((state: RootState) => {
  const {
    geneSummary,
    geneName,
    gene,
    geneSynonyms,
    geneUrl,
    loading,
    geneIsMinimized,
    geneLevel,
    infoError,
    isEnsemblIdResult,
  } = state.controls;

  return {
    geneSummary,
    geneName,
    gene,
    geneSynonyms,
    geneUrl,
    loading,
    geneIsMinimized,
    geneLevel,
    infoError,
    isEnsemblIdResult,
  };
})
class GeneInfo extends React.PureComponent<Props, State> {
  render(): JSX.Element {
    const {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'dispatch' does not exist on type '{ chi... Remove this comment to see the full error message
      dispatch,
      geneSummary,
      geneName,
      gene,
      geneUrl,
      geneSynonyms,
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'geneIsMinimized' does not exist on type '{ chi... Remove this comment to see the full error message
      geneIsMinimized,
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'geneLevel' does not exist on type '{ chi... Remove this comment to see the full error message
      geneLevel,
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'infoError' does not exist on type '{ chi... Remove this comment to see the full error message
      infoError,
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'isEnsemblIdResult' does not exist on type '{ chi... Remove this comment to see the full error message
      isEnsemblIdResult,
    } = this.props;

    const minimized = geneIsMinimized;
    const level = geneLevel;

    let synonymList;
    if (geneSynonyms.length > 1) {
      synonymList = geneSynonyms.join(", ");
    } else if (geneSynonyms.length === 1) {
      synonymList = geneSynonyms[0];
    } else {
      synonymList = null;
    }

    return (
      <GeneInfoWrapper
        style={{
          bottom:
            level === "top"
              ? globals.bottomToolbarGutter * 2
              : globals.bottomToolbarGutter,
          left: globals.leftSidebarWidth + globals.scatterplotMarginLeft,
        }}
        id="geneinfo_wrapper"
      >
        <GeneHeader
          style={{
            position: "absolute",
            marginLeft: styles.margin.left,
            top: styles.margin.bottom / 2,
          }}
        >
          Gene Info
        </GeneHeader>
        <ButtonGroup
          style={{
            position: "absolute",
            right: 5,
            top: 5,
          }}
        >
          <Button
            type="button"
            minimal
            onClick={() => {
              dispatch({ type: "minimize/maximize gene info" });
            }}
          >
            {minimized ? "show gene info" : "hide"}
          </Button>
          <Button
            type="button"
            minimal
            data-testid="clear-gene-info"
            onClick={() =>
              dispatch({
                type: "clear gene info",
              })
            }
          >
            remove
          </Button>
        </ButtonGroup>
        <div
          id="gene-info"
          style={{
            width: `${
              styles.width + styles.margin.left + styles.margin.right
            }px`,
            height: minimized ? 0 + styles.margin.bottom : "auto",
          }}
        >
          {/* loading tab */}
          {!minimized && geneName === "" && infoError === null ? (
            <div
              style={{
                marginTop: styles.margin.top,
                marginLeft: styles.margin.left,
                marginRight: styles.margin.right,
                marginBottom: styles.margin.bottom,
              }}
            >
              <GeneSymbol>{gene}</GeneSymbol>
              <Content>loading...</Content>
            </div>
          ) : null}
          {/* failed gene search */}
          {!minimized && infoError !== null ? (
            <div
              style={{
                marginTop: styles.margin.top,
                marginLeft: styles.margin.left,
                marginRight: styles.margin.right,
                marginBottom: styles.margin.bottom,
              }}
            >
              <GeneSymbol>{gene}</GeneSymbol>
              <Content>Sorry, this gene could not be found on NCBI.</Content>
              <Link
                href={`https://www.google.com/search?q=${gene}`}
                target="_blank"
                rel="noreferrer noopener"
              >
                Search on Google
              </Link>
            </div>
          ) : null}
          {!minimized && geneName !== "" && infoError === null ? (
            <div
              style={{
                marginTop: styles.margin.top,
                marginLeft: styles.margin.left,
                marginRight: styles.margin.right,
                marginBottom: styles.margin.bottom,
              }}
            >
              <WarningBanner>
                <Icon
                  sdsIcon="exclamationMarkCircle"
                  sdsSize="l"
                  sdsType="static"
                />
                <text>
                  NCBI didn&apos;t return an exact match for this gene.
                </text>
              </WarningBanner>
              <GeneSymbol>{gene}</GeneSymbol>
              <Content>{geneName}</Content>
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
                >
                  {geneSummary}
                </Content>
              )}
              {synonymList ? (
                <p>
                  <SynHeader>Synonyms</SynHeader>
                  <Synonyms>{synonymList}</Synonyms>
                </p>
              ) : null}
              {geneUrl !== "" ? (
                <Link href={geneUrl} target="_blank" rel="noreferrer noopener">
                  View on NCBI
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </GeneInfoWrapper>
    );
  }
}

export default GeneInfo;
