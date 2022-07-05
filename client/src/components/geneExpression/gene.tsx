import React from "react";

import { Button, Icon } from "@blueprintjs/core";
import { Icon as InfoCircle } from "czifui";
import { connect } from "react-redux";
import Truncate from "../util/truncate";
import HistogramBrush from "../brushableHistogram";
import { RootState } from "../../reducers";

import actions from "../../actions";

import { track } from "../../analytics";
import { EVENTS } from "../../analytics/events";
import { DataframeValue } from "../../util/dataframe";

const MINI_HISTOGRAM_WIDTH = 110;

type State = RootState;

interface Props {
  gene: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- FIXME
  quickGene: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- FIXME
  removeGene: any;
  geneId: DataframeValue;
}

// @ts-expect-error ts-migrate(1238) FIXME: Unable to resolve signature of class decorator whe... Remove this comment to see the full error message
@connect((state: RootState, ownProps: Props) => {
  const { gene } = ownProps;

  return {
    isColorAccessor:
      state.colors.colorAccessor === gene &&
      state.colors.colorMode !== "color by categorical metadata",
    isScatterplotXXaccessor: state.controls.scatterplotXXaccessor === gene,
    isScatterplotYYaccessor: state.controls.scatterplotYYaccessor === gene,
  };
})
class Gene extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      geneIsExpanded: false,
    };
  }

  onColorChangeClick = (): void => {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'dispatch' does not exist on type 'Readon... Remove this comment to see the full error message
    const { dispatch, gene } = this.props;
    track(EVENTS.EXPLORER_COLORBY_GENE_BUTTON_CLICKED);
    dispatch(actions.requestSingleGeneExpressionCountsForColoringPOST(gene));
  };

  handleGeneExpandClick = (): void => {
    track(EVENTS.EXPLORER_MAXIMIZE_GENE_BUTTON_CLICKED);

    const { geneIsExpanded } = this.state;
    this.setState({ geneIsExpanded: !geneIsExpanded });
  };

  handleSetGeneAsScatterplotX = (): void => {
    track(EVENTS.EXPLORER_PLOT_X_BUTTON_CLICKED);
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'dispatch' does not exist on type 'Readon... Remove this comment to see the full error message
    const { dispatch, gene } = this.props;
    dispatch({
      type: "set scatterplot x",
      data: gene,
    });
  };

  handleSetGeneAsScatterplotY = (): void => {
    track(EVENTS.EXPLORER_PLOT_Y_BUTTON_CLICKED);
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'dispatch' does not exist on type 'Readon... Remove this comment to see the full error message
    const { dispatch, gene } = this.props;
    dispatch({
      type: "set scatterplot y",
      data: gene,
    });
  };

  handleDeleteGeneFromSet = (): void => {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'dispatch' does not exist on type 'Readon... Remove this comment to see the full error message
    const { dispatch, gene, geneset } = this.props;
    dispatch(actions.genesetDeleteGenes(geneset, [gene]));
  };

  handleDisplayGeneInfo = (): void => {
    /* Request information about selected gene and trigger the gene info card to display */
    track(EVENTS.EXPLORER_GENE_INFO_BUTTON_CLICKED); // tracking?
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'dispatch' does not exist on type 'Readon... Remove this comment to see the full error message
    const { dispatch, gene, geneId } = this.props; // why are these errors happening?

    // Trigger loading gene info card
    dispatch({
      type: "load gene info",
      gene,
    });

    // const { geneIds, geneNames } = this.state;
    // const geneId = geneIds[geneNames.indexOf(gene)];
    // console.log("gene id:", String(geneId));

    // if (geneId === null) {
    //   // error ??
    //   console.log("here");
    //   return;
    // }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- FIXME: disabled temporarily
    // const response: any = doJsonRequest(
    //   `https://rdev-siena-geneinfo-backend.rdev.single-cell.czi.technology/geneinfo/v1/geneinfo?geneID=${geneId}`
    // );

    // fetch(
    //   `https://rdev-siena-geneinfo-backend.rdev.single-cell.czi.technology/geneinfo/v1/geneinfo?geneID=${geneId}`, {
    //     method: 'GET',
    //     mode: 'no-cors',
    //     headers: {
    //       'Content-Type': 'application/json'
    //     },
    //   }).then((r) => {
    //     const response = r.json();
    //     console.log(response);
    //     dispatch({
    //       type: "open gene info",
    //       gene,
    //       url: response.ncbi_url,
    //       name: response.name,
    //       synonyms: response.synonyms,
    //       summary: response.summary,
    //     });
    //   })

    // dispatch({
    //   type: "open gene info",
    //   gene,
    //   url: response.ncbi_url,
    //   name: response.name,
    //   synonyms: response.synonyms,
    //   summary: response.summary
    // });

    let geneUID: number;

    fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=gene&term=${geneId}&retmode=json`
    )
      .then((response) => {
        console.log(response);
        return response.json();
      })
      .then((data) => {
        geneUID = data.esearchresult.idlist[0];
        console.log(geneUID);

        fetch(
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=gene&id=${geneUID}&retmode=xml`
        )
          .then((resp) => resp.text())
          .then((str) =>
            new window.DOMParser().parseFromString(str, "text/xml")
          )
          .then((info) => {
            console.log(info);
            if (!info) {
              return;
            }

            const contents = {
              url: `https://www.ncbi.nlm.nih.gov/gene/${geneUID}`,
              name: info.getElementsByTagName("Gene-ref_desc")[0].childNodes[0]
                .nodeValue,
              summary:
                info.getElementsByTagName("Entrezgene_summary")[0].childNodes[0]
                  .nodeValue,
              synonyms: ["TEST1", "TEST2", "TEST3"],
            };
            console.log(contents);

            dispatch({
              type: "open gene info",
              gene,
              url: contents.url,
              name: contents.name,
              synonyms: contents.synonyms,
              summary: contents.summary,
            });
          });
      });
  };

  render(): JSX.Element {
    const {
      gene,
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'geneDescription' does not exist on type ... Remove this comment to see the full error message
      geneDescription,
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'isColorAccessor' does not exist on type ... Remove this comment to see the full error message
      isColorAccessor,
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'isScatterplotXXaccessor' does not exist on type ... Remove this comment to see the full error message
      isScatterplotXXaccessor,
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'isScatterplotYYaccessor' does not exist on type ... Remove this comment to see the full error message
      isScatterplotYYaccessor,
      quickGene,
      removeGene,
    } = this.props;
    const { geneIsExpanded } = this.state;
    const geneSymbolWidth = 60 + (geneIsExpanded ? MINI_HISTOGRAM_WIDTH : 0);

    return (
      <div>
        <div
          style={{
            marginLeft: 5,
            marginRight: 0,
            marginTop: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            role="menuitem"
            // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'number | ... Remove this comment to see the full error message
            tabIndex="0"
            data-testclass="gene-expand"
            data-testid={`${gene}:gene-expand`}
            onKeyPress={() => {}}
            style={{
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <div>
              {!quickGene && (
                <Icon
                  icon="drag-handle-horizontal"
                  iconSize={12}
                  style={{
                    marginRight: 7,
                    cursor: "grab",
                    position: "relative",
                    top: -1,
                  }}
                />
              )}
              <Truncate
                tooltipAddendum={geneDescription && `: ${geneDescription}`}
              >
                <span
                  style={{
                    width: geneSymbolWidth,
                    display: "inline-block",
                  }}
                  data-testid={`${gene}:gene-label`}
                >
                  {gene}
                </span>
              </Truncate>
            </div>
            <div>
              <Button
                minimal
                small
                data-testid={`get-info-${gene}`}
                onClick={this.handleDisplayGeneInfo}
                style={{
                  filter: "grayscale(100%)",
                }}
              >
                <InfoCircle sdsIcon="infoCircle" sdsSize="s" sdsType="static" />
              </Button>
            </div>
            {!geneIsExpanded ? (
              <HistogramBrush
                // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
                isUserDefined
                field={gene}
                mini
                width={MINI_HISTOGRAM_WIDTH}
              />
            ) : null}
          </div>
          <div style={{ flexShrink: 0, marginLeft: 2 }}>
            <Button
              minimal
              small
              data-testid={`delete-from-geneset:${gene}`}
              onClick={() => {
                track(EVENTS.EXPLORER_DELETE_FROM_GENESET_BUTTON_CLICKED);

                if (quickGene) {
                  removeGene(gene)();
                } else {
                  this.handleDeleteGeneFromSet();
                }
              }}
              intent="none"
              style={{ fontWeight: 700, marginRight: 2 }}
              icon={<Icon icon="trash" iconSize={10} />}
            />
            <Button
              minimal
              small
              data-testid={`plot-x-${gene}`}
              onClick={this.handleSetGeneAsScatterplotX}
              active={isScatterplotXXaccessor}
              intent={isScatterplotXXaccessor ? "primary" : "none"}
              style={{ fontWeight: 700, marginRight: 2 }}
            >
              x
            </Button>
            <Button
              minimal
              small
              data-testid={`plot-y-${gene}`}
              onClick={this.handleSetGeneAsScatterplotY}
              active={isScatterplotYYaccessor}
              intent={isScatterplotYYaccessor ? "primary" : "none"}
              style={{ fontWeight: 700, marginRight: 2 }}
            >
              y
            </Button>
            <Button
              minimal
              small
              data-testclass="maximize"
              data-testid={`maximize-${gene}`}
              onClick={this.handleGeneExpandClick}
              active={geneIsExpanded}
              intent="none"
              icon={<Icon icon="maximize" iconSize={10} />}
              style={{ marginRight: 2 }}
            />
            <Button
              minimal
              small
              data-testclass="colorby"
              data-testid={`colorby-${gene}`}
              onClick={this.onColorChangeClick}
              active={isColorAccessor}
              intent={isColorAccessor ? "primary" : "none"}
              icon={<Icon icon="tint" iconSize={12} />}
            />
          </div>
        </div>
        {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
        {geneIsExpanded && <HistogramBrush isUserDefined field={gene} />}
      </div>
    );
  }
}

export default Gene;
