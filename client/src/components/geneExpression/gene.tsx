import React from "react";

import { AnchorButton, Button, Icon } from "@blueprintjs/core";
import { connect } from "react-redux";
import { Icon as InfoCircle, IconButton } from "czifui";
import Truncate from "../util/truncate";
import HistogramBrush from "../brushableHistogram";
import { AppDispatch, RootState } from "../../reducers";

import actions from "../../actions";

import {
  track,
  thunkTrackColorByHistogramExpandCategoryFromColorByHistogram,
  thunkTrackColorByHistogramHighlightHistogramFromColorByHistogram,
} from "../../analytics";
import { EVENTS } from "../../analytics/events";
import { ActiveTab } from "../../reducers/controls";
import { DataframeValue } from "../../util/dataframe";

const MINI_HISTOGRAM_WIDTH = 110;

interface State {
  geneIsExpanded: boolean;
}

interface StateProps {
  isColorAccessor: boolean;
  isScatterplotXXaccessor: boolean;
  isScatterplotYYaccessor: boolean;
  isGeneInfo: boolean;
}

interface DispatchProps {
  dispatch: AppDispatch;
}

interface OwnProps {
  gene: string;
  quickGene?: boolean;
  removeGene?: (gene: string) => () => void;
  geneId: DataframeValue;
  isGeneExpressionComplete: boolean;
  onGeneExpressionComplete: () => void;
  geneDescription?: string;
  geneset?: string;
}

type Props = StateProps & OwnProps & DispatchProps;

class Gene extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      geneIsExpanded: false,
    };
  }

  onColorChangeClick = async () => {
    const { dispatch, gene } = this.props;
    track(EVENTS.EXPLORER_COLORBY_GENE);
    dispatch(actions.requestSingleGeneExpressionCountsForColoringPOST(gene));

    /**
     * (thuang): Must be dispatched AFTER the actions above, as the `colorMode`
     * only changes after the above actions are completed.
     */
    await dispatch(
      thunkTrackColorByHistogramExpandCategoryFromColorByHistogram()
    );
    await dispatch(
      thunkTrackColorByHistogramHighlightHistogramFromColorByHistogram()
    );
  };

  handleGeneExpandClick = (): void => {
    track(EVENTS.EXPLORER_GENE_VIEW_DISTRIBUTION);

    const { geneIsExpanded } = this.state;
    this.setState({ geneIsExpanded: !geneIsExpanded });
  };

  handleSetGeneAsScatterplotX = (): void => {
    track(EVENTS.EXPLORER_PLOT_X_BUTTON_CLICKED);
    const { dispatch, gene } = this.props;
    dispatch({
      type: "set scatterplot x",
      data: gene,
    });
  };

  handleSetGeneAsScatterplotY = (): void => {
    track(EVENTS.EXPLORER_PLOT_Y_BUTTON_CLICKED);
    const { dispatch, gene } = this.props;
    dispatch({
      type: "set scatterplot y",
      data: gene,
    });
  };

  handleDeleteGeneFromSet = (): void => {
    const { dispatch, gene, geneset } = this.props;
    dispatch(actions.genesetDeleteGenes(geneset, [gene]));
  };

  handleDisplayGeneInfo = async (): Promise<void> => {
    const { dispatch, gene, geneId } = this.props;
    track(EVENTS.EXPLORER_VIEW_GENE_INFO, {
      gene,
    });

    dispatch({
      type: "load gene info",
      gene,
    });

    dispatch({ type: "toggle active info panel", activeTab: ActiveTab.Gene });

    const info = await actions.fetchGeneInfo(geneId, gene);
    if (!info) {
      return;
    }
    dispatch({
      type: "open gene info",
      gene,
      url: info?.ncbi_url,
      name: info?.name,
      synonyms: info.synonyms,
      summary: info.summary,
      infoError: null,
      showWarningBanner: info.show_warning_banner,
    });
  };

  render(): JSX.Element {
    const {
      gene,
      geneDescription,
      isColorAccessor,
      isScatterplotXXaccessor,
      isScatterplotYYaccessor,
      quickGene,
      removeGene,
      onGeneExpressionComplete,
      isGeneExpressionComplete,
      isGeneInfo,
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
            <div style={{ display: "inline-block", marginLeft: "0" }}>
              <AnchorButton
                small
                minimal
                intent={isGeneInfo ? "primary" : "none"}
                data-testid={`get-info-${gene}`}
                active={isGeneInfo}
                onClick={this.handleDisplayGeneInfo}
                disabled={!isGeneExpressionComplete}
              >
                <IconButton
                  disabled={!isGeneExpressionComplete}
                  sdsSize="small"
                >
                  <div style={{ filter: "grayscale(100%)" }}>
                    <InfoCircle
                      sdsIcon="infoCircle"
                      sdsSize="s"
                      sdsType="iconButton"
                    />
                  </div>
                </IconButton>
              </AnchorButton>
            </div>
            {!geneIsExpanded ? (
              <div style={{ width: MINI_HISTOGRAM_WIDTH }}>
                <HistogramBrush
                  isUserDefined
                  field={gene}
                  mini
                  width={MINI_HISTOGRAM_WIDTH}
                  onGeneExpressionComplete={onGeneExpressionComplete}
                />
              </div>
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
                  removeGene?.(gene)();
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
              data-testid={`colorby-${gene}`}
              onClick={this.onColorChangeClick}
              active={isColorAccessor}
              intent={isColorAccessor ? "primary" : "none"}
              icon={<Icon icon="tint" iconSize={12} />}
            />
          </div>
        </div>
        {geneIsExpanded && (
          <HistogramBrush
            isUserDefined
            field={gene}
            onGeneExpressionComplete={() => {}}
          />
        )}
      </div>
    );
  }
}

export default connect(mapStateToProps)(Gene);

function mapStateToProps(state: RootState, ownProps: OwnProps): StateProps {
  const { gene } = ownProps;

  return {
    isColorAccessor:
      state.colors.colorAccessor === gene &&
      state.colors.colorMode !== "color by categorical metadata",
    isScatterplotXXaccessor: state.controls.scatterplotXXaccessor === gene,
    isScatterplotYYaccessor: state.controls.scatterplotYYaccessor === gene,
    isGeneInfo: state.controls.gene === gene,
  };
}
