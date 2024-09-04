import React from "react";

import { Button, Icon } from "@blueprintjs/core";
import { connect } from "react-redux";
import Truncate from "../../util/truncate";
import HistogramBrush from "../../brushableHistogram";

import actions from "../../../actions";

import {
  track,
  thunkTrackColorByHistogramExpandCategoryFromColorByHistogram,
  thunkTrackColorByHistogramHighlightHistogramFromColorByHistogram,
} from "../../../analytics";
import { EVENTS } from "../../../analytics/events";
import { ActiveTab } from "../../../common/types/entities";
import { State, Props, mapStateToProps, mapDispatchToProps } from "./types";
import { MINI_HISTOGRAM_WIDTH } from "../constants";
import { InfoButton, InfoButtonWrapper } from "../../../common/style";

class Gene extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      geneIsExpanded: false,
    };
  }

  onColorChangeClick = async () => {
    const { dispatch, gene, isColorAccessor } = this.props;
    if (!isColorAccessor) {
      // only track color change when turned on
      track(EVENTS.EXPLORER_COLORBY_GENE);
    }
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
    const { geneIsExpanded } = this.state;
    if (!geneIsExpanded) {
      // only track gene view distribution on expand
      track(EVENTS.EXPLORER_GENE_VIEW_DISTRIBUTION);
    }

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

    dispatch({ type: "request gene info start", gene });
    dispatch({ type: "toggle active info panel", activeTab: ActiveTab.Gene });

    const info = await actions.fetchGeneInfo(gene, geneId, dispatch);

    if (!info) {
      return;
    }

    dispatch({
      type: "open gene info",
      gene,
      info,
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
            tabIndex={0}
            data-testid={`${gene}:gene-expand`}
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
            <InfoButtonWrapper>
              <InfoButton
                data-testid={`get-info-${gene}`}
                onClick={this.handleDisplayGeneInfo}
                disabled={!isGeneExpressionComplete}
                sdsType="tertiary"
                sdsStyle="icon"
                icon="InfoCircle"
                sdsSize="small"
                data-chromatic="ignore"
              />
            </InfoButtonWrapper>
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
              icon={<Icon icon="trash" size={10} />}
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
              icon={<Icon icon="maximize" size={10} />}
              style={{ marginRight: 2 }}
            />
            <Button
              minimal
              small
              data-testid={`colorby-${gene}`}
              onClick={this.onColorChangeClick}
              active={isColorAccessor}
              intent={isColorAccessor ? "primary" : "none"}
              icon={<Icon icon="tint" size={12} />}
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

export default connect(mapStateToProps, mapDispatchToProps)(Gene);
