import React from "react";
import { connect } from "react-redux";
import { Button, ButtonGroup } from "@blueprintjs/core";
import * as styles from "./util";
import { RootState } from "../../reducers";
import * as globals from "../../globals";
import { Dataframe, DataframeValue } from "../../util/dataframe";

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
type State = any;

// @ts-expect-error ts-migrate(1238) FIXME: Unable to resolve signature of class decorator whe... Remove this comment to see the full error message
@connect((state: RootState) => {
  const { geneSummary, geneName, gene, geneSynonyms, geneUrl, loading } =
    state.controls;

  return {
    geneSummary,
    geneName,
    gene,
    geneSynonyms,
    geneUrl,
    loading,
  };
})

// eslint-disable-next-line @typescript-eslint/ban-types --- FIXME: disabled temporarily on migrate to TS.
class GeneInfo extends React.PureComponent<{}, State> {
  // eslint-disable-next-line @typescript-eslint/ban-types --- FIXME: disabled temporarily on commit
  constructor(props: {}) {
    super(props);
    this.state = {
      minimized: false,
    };
  }

  // // eslint-disable-next-line @typescript-eslint/ban-types -- FIXME: to fix later
  // componentDidUpdate(prevProps: {}): void {
  //   const {
  //     gene,
  //   } = this.props;
  //   const { minimized } = this.state;
  //   if (gene !== null && prevProps.gene !== gene && minimized) {
  //     // eslint-disable-next-line react/no-did-update-set-state -- alternative?
  //     this.setState({ minimized: false });
  //   }
  //   // TODO: able to click info button of same gene to open up the gene info box
  // }

  render(): JSX.Element {
    const {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'dispatch' does not exist on type 'Readon... Remove this comment to see the full error message
      dispatch,
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'geneSummary' does not exist on type 'Readon... Remove this comment to see the full error message
      geneSummary,
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'geneName' does not exist on type 'Readon... Remove this comment to see the full error message
      geneName,
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'gene' does not exist on type 'Readon... Remove this comment to see the full error message
      gene,
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'geneUrl' does not exist on type 'Readon... Remove this comment to see the full error message
      geneUrl,
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'geneSynonyms' does not exist on type 'Readon... Remove this comment to see the full error message
      geneSynonyms,
    } = this.props;

    const { minimized } = this.state;

    // hack: if loading, that means that an info button was just recently clicked, so pop-up should reappear
    if (geneName === "") {
      this.setState({ minimized: false });
    }

    const bottomToolbarGutter = 48; // gutter for bottom tool bar
    let synonymList;
    if (geneSynonyms.length > 1) {
      synonymList = geneSynonyms.join(", ");
    } else {
      synonymList = geneSynonyms[0];
    }

    return (
      <div
        style={{
          position: "fixed",
          bottom: bottomToolbarGutter,
          borderRadius: "3px 3px 0px 0px",
          left: globals.leftSidebarWidth + globals.scatterplotMarginLeft,
          padding: "0px 20px 20px 0px",
          background: "white",
          boxShadow: "0px 0px 3px 2px rgba(153,153,153,0.2)",
          zIndex: 2,
        }}
        id="geneinfo_wrapper"
      >
        <p
          style={{
            position: "absolute",
            marginLeft: styles.margin.left,
            top: styles.margin.bottom / 2,
            fontSize: styles.mediumText,
            color: globals.darkGrey,
          }}
        >
          Gene Info
        </p>
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
              this.setState({ minimized: !minimized });
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
          {geneName === "" ? (
            <div
              style={{
                marginTop: styles.margin.top,
                marginLeft: styles.margin.left,
                marginRight: styles.margin.right,
                marginBottom: styles.margin.bottom,
              }}
            >
              <p
                style={{
                  fontSize: styles.largeText,
                  fontWeight: globals.bolder,
                }}
              >
                {gene}
              </p>
              <p style={{ fontSize: styles.smallText, fontWeight: 500 }}>
                loading...
              </p>
            </div>
          ) : null}
          {!minimized && geneName !== "" ? (
            <div
              style={{
                marginTop: styles.margin.top,
                marginLeft: styles.margin.left,
                marginRight: styles.margin.right,
                marginBottom: styles.margin.bottom,
              }}
            >
              <p
                style={{
                  fontSize: styles.largeText,
                  fontWeight: globals.bolder,
                }}
              >
                {gene}
              </p>
              <p style={{ fontSize: styles.smallText, fontWeight: 500 }}>
                {geneName}
              </p>
              <p
                style={{
                  fontSize: styles.smallText,
                  display: "-webkit-box",
                  WebkitLineClamp: 7,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {geneSummary}
              </p>
              <p>
                <span style={{ color: globals.mediumGrey }}>Synonyms</span>
                <span style={{ fontSize: styles.smallText, padding: "5px" }}>
                  {synonymList}
                </span>
              </p>
              <a
                href={geneUrl}
                target="_blank"
                rel="noreferrer noopener"
                style={{
                  fontSize: styles.mediumText,
                  color: globals.linkBlue,
                  fontWeight: 500,
                }}
              >
                View on NCBI
              </a>
            </div>
          ) : null}
        </div>
      </div>
    );
  }
}

export default GeneInfo;
