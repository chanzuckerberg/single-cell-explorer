import React from "react";
import { connect } from "react-redux";
import { Button, ButtonGroup } from "@blueprintjs/core";
import * as styles from "./util";
import { RootState } from "../../reducers";
import * as globals from "../../globals";

type State = RootState;

interface Props {
  geneSummary: string;
  geneName: string;
  gene: string;
  geneUrl: string;
  geneSynonyms: string[];
}

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
class GeneInfo extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      minimized: false,
    };
  }

  render(): JSX.Element {
    const {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'dispatch' does not exist on type '{ chi... Remove this comment to see the full error message
      dispatch,
      geneSummary,
      geneName,
      gene,
      geneUrl,
      geneSynonyms,
    } = this.props;

    const { minimized } = this.state;

    // if loading, that means that an info button was just recently clicked, so pop-up should reappear
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
              <p>{geneName}</p>
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
