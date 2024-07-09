import React from "react";
import { connect } from "react-redux";
import { ButtonGroup, AnchorButton, Tooltip } from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";

import * as globals from "../../globals";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module './menubar.css' or its correspo... Remove this comment to see the full error message
import styles from "./menubar.css";
import actions from "../../actions";
import Clip from "./clip";

import Subset from "./subset";
import DiffexpButtons from "./diffexpButtons";
import { getEmbSubsetView } from "../../util/stateManager/viewStackHelpers";
import { track } from "../../analytics";
import { EVENTS } from "../../analytics/events";
import Embedding from "../embedding";
import { getFeatureFlag } from "../../util/featureFlags/featureFlags";
import { FEATURES } from "../../util/featureFlags/features";
import { shouldShowOpenseadragon } from "../../common/selectors";
import { GRAPH_AS_IMAGE_TEST_ID } from "../../util/constants";
import { AppDispatch, RootState } from "../../reducers";
import { AnnoMatrixClipView } from "../../annoMatrix/views";

interface StateProps {
  subsetPossible: boolean;
  subsetResetPossible: boolean;
  graphInteractionMode: RootState["controls"]["graphInteractionMode"];
  clipPercentileMin: number;
  clipPercentileMax: number;
  colorAccessor: RootState["colors"]["colorAccessor"];
  disableDiffexp: boolean;
  showCentroidLabels: RootState["centroidLabels"]["showLabels"];
  categoricalSelection: RootState["categoricalSelection"];
  screenCap: RootState["controls"]["screenCap"];
  imageUnderlay: RootState["controls"]["imageUnderlay"];
  // eslint-disable-next-line react/no-unused-prop-types -- used in shouldShowOpenseadragon
  layoutChoice: RootState["layoutChoice"];
  // eslint-disable-next-line react/no-unused-prop-types -- used in shouldShowOpenseadragon
  config: RootState["config"];
  // eslint-disable-next-line react/no-unused-prop-types -- used in shouldShowOpenseadragon
  panelEmbedding: RootState["panelEmbedding"];
}

const mapStateToProps = (state: RootState): StateProps => {
  const { annoMatrix } = state;
  const crossfilter = state.obsCrossfilter;
  const selectedCount = crossfilter?.countSelected?.() || 0;

  const subsetPossible =
    selectedCount !== 0 && selectedCount !== crossfilter?.size(); // ie, not all and not none are selected
  const embSubsetView = getEmbSubsetView(annoMatrix);
  const subsetResetPossible = !embSubsetView
    ? annoMatrix?.nObs !== annoMatrix?.schema.dataframe.nObs
    : annoMatrix?.nObs !== embSubsetView?.nObs;

  const [clipRangeMin, clipRangeMax] = (annoMatrix as AnnoMatrixClipView)
    ?.clipRange ?? [0, 1];

  return {
    subsetPossible,
    subsetResetPossible,
    config: state.config,
    graphInteractionMode: state.controls.graphInteractionMode,
    clipPercentileMin: Math.round(100 * clipRangeMin),
    clipPercentileMax: Math.round(100 * clipRangeMax),
    colorAccessor: state.colors.colorAccessor,
    disableDiffexp: state.config?.parameters?.["disable-diffexp"] ?? false,
    showCentroidLabels: state.centroidLabels.showLabels,
    categoricalSelection: state.categoricalSelection,
    screenCap: state.controls.screenCap,
    imageUnderlay: state.controls.imageUnderlay,
    layoutChoice: state.layoutChoice,
    panelEmbedding: state.panelEmbedding,
  };
};

interface DispatchProps {
  dispatch: AppDispatch;
}
export type MenuBarProps = StateProps & DispatchProps;
interface State {
  pendingClipPercentiles: {
    clipPercentileMin: number | undefined;
    clipPercentileMax: number | undefined;
  };
}
class MenuBar extends React.PureComponent<MenuBarProps, State> {
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  static isValidDigitKeyEvent(e: any) {
    /*
    Return true if this event is necessary to enter a percent number input.
    Return false if not.

    Returns true for events with keys: backspace, control, alt, meta, [0-9],
    or events that don't have a key.
    */
    if (e.key === null) return true;
    if (e.ctrlKey || e.altKey || e.metaKey) return true;

    // concept borrowed from blueprint's numericInputUtils:
    // keys that print a single character when pressed have a `key` name of
    // length 1. every other key has a longer `key` name (e.g. "Backspace",
    // "ArrowUp", "Shift"). since none of those keys can print a character
    // to the field--and since they may have important native behaviors
    // beyond printing a character--we don't want to disable their effects.
    const isSingleCharKey = e.key.length === 1;
    if (!isSingleCharKey) return true;

    const key = e.key.charCodeAt(0) - 48; /* "0" */
    return key >= 0 && key <= 9;
  }

  constructor(props: MenuBarProps) {
    super(props);

    this.state = {
      pendingClipPercentiles: {
        clipPercentileMin: undefined,
        clipPercentileMax: undefined,
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
  isClipDisabled = () => {
    /*
    return true if clip button should be disabled.
    */
    const { pendingClipPercentiles } = this.state;
    const clipPercentileMin = pendingClipPercentiles?.clipPercentileMin;
    const clipPercentileMax = pendingClipPercentiles?.clipPercentileMax;
    const {
      clipPercentileMin: currentClipMin,
      clipPercentileMax: currentClipMax,
    } = this.props;

    // if you change this test, be careful with logic around
    // comparisons between undefined / NaN handling.
    const isDisabled =
      !clipPercentileMin ||
      !clipPercentileMax ||
      !(clipPercentileMin < clipPercentileMax) ||
      (clipPercentileMin === currentClipMin &&
        clipPercentileMax === currentClipMax);

    return isDisabled;
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  handleClipOnKeyPress = (e: any) => {
    /*
    allow only numbers, plus other critical keys which
    may be required to make a number
    */
    if (!MenuBar.isValidDigitKeyEvent(e)) {
      e.preventDefault();
    }
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  handleClipPercentileMinValueChange = (v: any) => {
    /*
    Ignore anything that isn't a legit number
    */
    if (!Number.isFinite(v)) return;

    const { pendingClipPercentiles } = this.state;
    const clipPercentileMax = pendingClipPercentiles?.clipPercentileMax;

    /*
    clamp to [0, currentClipPercentileMax]
    */
    if (v <= 0) v = 0;
    if (v > 100) v = 100;
    const clipPercentileMin = Math.round(v); // paranoia
    this.setState({
      pendingClipPercentiles: { clipPercentileMin, clipPercentileMax },
    });
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  handleClipPercentileMaxValueChange = (v: any) => {
    /*
    Ignore anything that isn't a legit number
    */
    if (!Number.isFinite(v)) return;

    const { pendingClipPercentiles } = this.state;
    const clipPercentileMin = pendingClipPercentiles?.clipPercentileMin;

    /*
    clamp to [0, 100]
    */
    if (v < 0) v = 0;
    if (v > 100) v = 100;
    const clipPercentileMax = Math.round(v); // paranoia

    this.setState({
      pendingClipPercentiles: { clipPercentileMin, clipPercentileMax },
    });
  };

  handleClipCommit = () => {
    const { dispatch } = this.props;
    const { pendingClipPercentiles } = this.state;
    const { clipPercentileMin, clipPercentileMax } = pendingClipPercentiles;
    const min = clipPercentileMin! / 100;
    const max = clipPercentileMax! / 100;
    dispatch(actions.clipAction(min, max));
  };

  handleClipOpening = () => {
    const { clipPercentileMin, clipPercentileMax } = this.props;
    this.setState({
      pendingClipPercentiles: { clipPercentileMin, clipPercentileMax },
    });
  };

  handleClipClosing = () => {
    this.setState({
      pendingClipPercentiles: {
        clipPercentileMax: undefined,
        clipPercentileMin: undefined,
      },
    });
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
  handleCentroidChange = () => {
    const { dispatch, showCentroidLabels } = this.props;

    track(EVENTS.EXPLORER_CENTROID_LABEL_TOGGLE_BUTTON_CLICKED);

    dispatch({
      type: "show centroid labels for category",
      showLabels: !showCentroidLabels,
    });
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
  handleSubset = () => {
    const { dispatch } = this.props;

    track(EVENTS.EXPLORER_SUBSET_BUTTON_CLICKED);

    dispatch(actions.subsetAction());
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
  handleSubsetReset = () => {
    const { dispatch } = this.props;

    track(EVENTS.EXPLORER_RESET_SUBSET_BUTTON_CLICKED);

    dispatch(actions.resetSubsetAction());
  };

  render() {
    const {
      dispatch,
      disableDiffexp,
      clipPercentileMin,
      clipPercentileMax,
      graphInteractionMode,
      showCentroidLabels,
      categoricalSelection,
      colorAccessor,
      subsetPossible,
      subsetResetPossible,
      screenCap,
      imageUnderlay,
    } = this.props;
    const { pendingClipPercentiles } = this.state;

    const isColoredByCategorical =
      !!categoricalSelection?.[colorAccessor || ""];

    const isTest = getFeatureFlag(FEATURES.TEST);
    const isDownload = getFeatureFlag(FEATURES.DOWNLOAD);

    // constants used to create selection tool button
    const [selectionTooltip, selectionButtonIcon] = [
      "select",
      "polygon-filter",
    ];

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          width: "100%",
        }}
        data-test-id="menubar"
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "left",
            marginTop: 8,
          }}
        >
          <Embedding isSidePanel={false} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row-reverse",
            flexWrap: "wrap",
            justifyContent: "right",
          }}
        >
          <ButtonGroup className={styles.menubarButton}>
            <AnchorButton
              type="button"
              icon={IconNames.INFO_SIGN}
              onClick={() => {
                dispatch({
                  type: "toggle active info panel",
                  activeTab: "Dataset",
                });
              }}
              style={{
                cursor: "pointer",
              }}
              data-testid="drawer"
            />
          </ButtonGroup>
          {isDownload && (
            <Tooltip
              content="Download the current graph view as a PNG"
              position="bottom"
              hoverOpenDelay={globals.tooltipHoverOpenDelay}
            >
              <AnchorButton
                className={styles.menubarButton}
                data-testid="download-graph-button"
                type="button"
                icon={IconNames.CAMERA}
                style={{
                  cursor: "pointer",
                }}
                loading={screenCap}
                onClick={() => dispatch({ type: "graph: screencap start" })}
              />
            </Tooltip>
          )}
          {isTest && (
            <AnchorButton
              className={styles.menubarButton}
              type="button"
              icon={IconNames.TORCH}
              style={{
                cursor: "pointer",
              }}
              data-testid={GRAPH_AS_IMAGE_TEST_ID}
              data-chromatic="ignore"
              loading={screenCap}
              onClick={() => dispatch({ type: "test: screencap start" })}
            />
          )}
          <Clip
            // @ts-expect-error ts-migrate(2322) FIXME: Type '{ pendingClipPercentiles: any; clipPercentil... Remove this comment to see the full error message
            pendingClipPercentiles={pendingClipPercentiles}
            clipPercentileMin={clipPercentileMin}
            clipPercentileMax={clipPercentileMax}
            handleClipOpening={this.handleClipOpening}
            handleClipClosing={this.handleClipClosing}
            handleClipCommit={this.handleClipCommit}
            isClipDisabled={this.isClipDisabled}
            handleClipOnKeyPress={this.handleClipOnKeyPress}
            handleClipPercentileMaxValueChange={
              this.handleClipPercentileMaxValueChange
            }
            handleClipPercentileMinValueChange={
              this.handleClipPercentileMinValueChange
            }
          />
          <Tooltip
            content="When a category is colored by, show labels on the graph"
            position="bottom"
            disabled={graphInteractionMode === "zoom"}
            hoverOpenDelay={globals.tooltipHoverOpenDelay}
          >
            <AnchorButton
              className={styles.menubarButton}
              type="button"
              data-testid="centroid-label-toggle"
              icon="property"
              onClick={this.handleCentroidChange}
              active={showCentroidLabels}
              intent={showCentroidLabels ? "primary" : "none"}
              disabled={!isColoredByCategorical}
            />
          </Tooltip>
          {shouldShowOpenseadragon(this.props) && (
            <ButtonGroup className={styles.menubarButton}>
              <Tooltip
                content="Toggle image"
                position="bottom"
                hoverOpenDelay={globals.tooltipHoverOpenDelay}
              >
                <AnchorButton
                  type="button"
                  data-testid="toggle-image-underlay"
                  icon="media"
                  intent={imageUnderlay ? "primary" : "none"}
                  active={imageUnderlay}
                  onClick={() => {
                    track(
                      /**
                       * (thuang): If `imageUnderlay` is currently `true`, then
                       * we're about to deselect it thus firing the deselection event.
                       */
                      imageUnderlay
                        ? EVENTS.EXPLORER_IMAGE_DESELECT
                        : EVENTS.EXPLORER_IMAGE_SELECT
                    );
                    dispatch({
                      type: "toggle image underlay",
                      toggle: !imageUnderlay,
                    });
                  }}
                />
              </Tooltip>
            </ButtonGroup>
          )}
          <ButtonGroup className={styles.menubarButton}>
            <Tooltip
              content={selectionTooltip}
              position="bottom"
              hoverOpenDelay={globals.tooltipHoverOpenDelay}
            >
              <AnchorButton
                type="button"
                data-testid="mode-lasso"
                // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'IconName ... Remove this comment to see the full error message
                icon={selectionButtonIcon}
                active={graphInteractionMode === "select"}
                onClick={() => {
                  track(EVENTS.EXPLORER_MODE_LASSO_BUTTON_CLICKED);

                  dispatch({
                    type: "change graph interaction mode",
                    data: "select",
                  });
                }}
              />
            </Tooltip>
            <Tooltip
              content="Drag to pan, scroll to zoom"
              position="bottom"
              hoverOpenDelay={globals.tooltipHoverOpenDelay}
            >
              <AnchorButton
                type="button"
                data-testid="mode-pan-zoom"
                icon="zoom-in"
                active={graphInteractionMode === "zoom"}
                onClick={() => {
                  track(EVENTS.EXPLORER_MODE_PAN_ZOOM_BUTTON_CLICKED);

                  dispatch({
                    type: "change graph interaction mode",
                    data: "zoom",
                  });
                }}
              />
            </Tooltip>
          </ButtonGroup>
          <Subset
            // @ts-expect-error ts-migrate(2322) FIXME: Type '{ subsetPossible: any; subsetResetPossible: ... Remove this comment to see the full error message
            subsetPossible={subsetPossible}
            subsetResetPossible={subsetResetPossible}
            handleSubset={this.handleSubset}
            handleSubsetReset={this.handleSubsetReset}
          />
          {disableDiffexp ? null : <DiffexpButtons />}
        </div>
      </div>
    );
  }
}

export default connect(mapStateToProps)(MenuBar);
