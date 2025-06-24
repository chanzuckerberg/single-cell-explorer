import React from "react";
import { Button, Icon, MenuItem } from "@blueprintjs/core";
import { Select, ItemRenderer } from "@blueprintjs/select";
import { connect } from "react-redux";
import BrushableHistogram from "common/components/BrushableHistogram/BrushableHistogram";
import actions from "actions";
import {
  track,
  thunkTrackColorByHistogramExpandCategoryFromColorByHistogram,
  thunkTrackColorByHistogramHighlightHistogramFromColorByHistogram,
} from "analytics";
import { EVENTS } from "analytics/events";
import { ActiveTab } from "common/types/entities";
import { InfoButton, InfoButtonWrapper } from "common/style";
import Truncate from "common/components/Truncate/Truncate";

import { State, Props, mapStateToProps, mapDispatchToProps } from "./types";
import { MINI_HISTOGRAM_WIDTH } from "../../constants";

interface ActionOption {
  id: string;
  label: string;
  disabled?: boolean;
  active?: boolean;
}

class Gene extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      geneIsExpanded: false,
    };
  }

  // Define the action options
  getActionOptions = (): ActionOption[] => {
    const { isScatterplotYYaccessor, isScatterplotXXaccessor, quickGene } =
      this.props;

    return [
      {
        id: "delete",
        label: quickGene ? "Remove Gene" : "Delete from Gene Set",
      },
      {
        id: "plot-x",
        label: "Set Gene on X axis",
        active: isScatterplotXXaccessor,
      },
      {
        id: "plot-y",
        label: "Set Gene on Y axis",
        active: isScatterplotYYaccessor,
      },
      {
        id: "multiome-viz",
        label: "Open Multiome Viz",
      },
    ];
  };

  // Handle action selection
  handleActionSelect = (action: ActionOption): void => {
    switch (action.id) {
      case "delete":
        this.handleDeleteAction();
        break;
      case "plot-x":
        this.handleSetGeneAsScatterplotX();
        break;
      case "plot-y":
        this.handleSetGeneAsScatterplotY();
        break;
      case "multiome-viz":
        this.handleOpenMultiomeViz();
        break;
      default:
        console.warn(`Unhandled action: ${action.id}`);
        break;
    }
  };

  // Action handlers
  handleDeleteAction = (): void => {
    const { quickGene, removeGene, gene } = this.props;
    track(EVENTS.EXPLORER_DELETE_FROM_GENESET_BUTTON_CLICKED);

    if (quickGene) {
      removeGene?.(gene.name)();
    } else {
      this.handleDeleteGeneFromSet();
    }
  };

  // Render function for action items
  renderActionItem: ItemRenderer<ActionOption> = (
    action,
    { handleClick, modifiers }
  ) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }

    return (
      <MenuItem
        key={action.id}
        text={action.label}
        onClick={handleClick}
        disabled={action.disabled}
        active={action.active}
      />
    );
  };

  onColorChangeClick = async () => {
    const { dispatch, gene, isColorAccessor } = this.props;
    const { id } = gene;

    if (!isColorAccessor) {
      // only track color change when turned on
      track(EVENTS.EXPLORER_COLORBY_GENE);
    }
    dispatch(actions.requestSingleGeneExpressionCountsForColoringPOST(id));

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
    const { id } = gene;
    dispatch({
      type: "set scatterplot x",
      data: id,
    });
  };

  handleSetGeneAsScatterplotY = (): void => {
    track(EVENTS.EXPLORER_PLOT_Y_BUTTON_CLICKED);
    const { dispatch, gene } = this.props;
    const { id } = gene;
    dispatch({
      type: "set scatterplot y",
      data: id,
    });
  };

  handleDeleteGeneFromSet = (): void => {
    const { dispatch, gene, geneset } = this.props;
    dispatch(actions.genesetDeleteGenes(geneset, [gene.name]));
  };

  handleOpenMultiomeViz = (): void => {
    const { dispatch } = this.props;

    dispatch({ type: "open multiome viz panel" });
  };

  handleDisplayGeneInfo = async (): Promise<void> => {
    const { dispatch, gene } = this.props;
    const { name, id } = gene;

    track(EVENTS.EXPLORER_VIEW_GENE_INFO, {
      gene: name,
    });

    dispatch({ type: "request gene info start", gene: name });
    dispatch({ type: "toggle active info panel", activeTab: ActiveTab.Gene });

    const info = await actions.fetchGeneInfo(name, id, dispatch);

    if (!info) {
      return;
    }

    dispatch({
      type: "open gene info",
      gene: name,
      info,
    });
  };

  render(): JSX.Element {
    const {
      gene,
      geneDescription,
      isColorAccessor,
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
            data-testid={`${gene.name}:gene-expand`}
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
                preferBeginning
              >
                <span
                  style={{
                    width: geneSymbolWidth,
                    display: "inline-block",
                  }}
                  data-testid={`${gene.name}:gene-label`}
                >
                  {gene.name}
                </span>
              </Truncate>
            </div>
            <InfoButtonWrapper>
              <InfoButton
                data-testid={`get-info-${gene.name}`}
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
                <BrushableHistogram
                  isUserDefined
                  field={gene.id}
                  mini
                  width={MINI_HISTOGRAM_WIDTH}
                  onGeneExpressionComplete={onGeneExpressionComplete}
                />
              </div>
            ) : null}
          </div>
          <div style={{ flexShrink: 0, marginLeft: 2, display: "flex" }}>
            <Button
              minimal
              small
              data-testid={`maximize-${gene.id}`}
              onClick={this.handleGeneExpandClick}
              active={geneIsExpanded}
              intent="none"
              icon={<Icon icon="maximize" size={10} />}
              style={{ marginRight: 2 }}
            />
            <Select<ActionOption>
              items={this.getActionOptions()}
              itemRenderer={this.renderActionItem}
              onItemSelect={this.handleActionSelect}
              filterable={false}
              popoverProps={{
                minimal: true,
                position: "bottom-right",
              }}
            >
              <Button
                minimal
                small
                data-testid={`more-actions:${gene.name}`}
                intent="none"
                icon={<Icon icon="more" size={10} />}
                style={{ marginRight: 2 }}
              />
            </Select>
            <Button
              minimal
              small
              data-testid={`colorby-${gene.id}`}
              onClick={this.onColorChangeClick}
              active={isColorAccessor}
              intent={isColorAccessor ? "primary" : "none"}
              icon={<Icon icon="tint" size={12} />}
            />
          </div>
        </div>
        {geneIsExpanded && (
          <BrushableHistogram
            isUserDefined
            field={gene.id}
            onGeneExpressionComplete={() => {}}
          />
        )}
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Gene);
