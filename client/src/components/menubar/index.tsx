import React, { useState } from "react";
import { connect } from "react-redux";
import {
  ButtonGroup,
  AnchorButton,
  ResizeSensor,
  Tooltip,
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";

import * as globals from "../../globals";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module './menubar.css' or its correspo... Remove this comment to see the full error message
import styles from "./menubar.css";
import {
  ControlsWrapper,
  EmbeddingWrapper,
  MenuBarWrapper,
  ResponsiveMenuGroupOne,
  ResponsiveMenuGroupTwo,
  MAX_VERTICAL_THRESHOLD_WIDTH_PX,
} from "./style";
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
import { GRAPH_AS_IMAGE_TEST_ID } from "../../util/constants";
import { AppDispatch, RootState } from "../../reducers";
import { AnnoMatrixClipView } from "../../annoMatrix/views";

const INITIAL_PERCENTILES = {
  clipPercentileMin: 0,
  clipPercentileMax: 100,
};
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
    graphInteractionMode: state.controls.graphInteractionMode,
    clipPercentileMin: Math.round(100 * clipRangeMin),
    clipPercentileMax: Math.round(100 * clipRangeMax),
    colorAccessor: state.colors.colorAccessor,
    disableDiffexp: state.config?.parameters?.["disable-diffexp"] ?? false,
    showCentroidLabels: state.centroidLabels.showLabels,
    categoricalSelection: state.categoricalSelection,
    screenCap: state.controls.screenCap,
  };
};

interface DispatchProps {
  dispatch: AppDispatch;
}
export type MenuBarProps = StateProps & DispatchProps;

const isValidDigitKeyEvent = (e: KeyboardEvent) => {
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
};

const MenuBar = ({
  dispatch,
  disableDiffexp,
  clipPercentileMin: currentClipMin,
  clipPercentileMax: currentClipMax,
  graphInteractionMode,
  showCentroidLabels,
  categoricalSelection,
  colorAccessor,
  subsetPossible,
  subsetResetPossible,
  screenCap,
}: MenuBarProps) => {
  const [pendingClipPercentiles, setPendingClipPercentiles] =
    useState(INITIAL_PERCENTILES);
  const [isVertical, setIsVertical] = useState(false);

  const isClipDisabled = () => {
    /*
    return true if clip button should be disabled.
    */

    const { clipPercentileMin, clipPercentileMax } = pendingClipPercentiles;

    // if you change this test, be careful with logic around
    // comparisons between undefined / NaN handling.
    const isDisabled =
      !(clipPercentileMin < clipPercentileMax) ||
      (clipPercentileMin === currentClipMin &&
        clipPercentileMax === currentClipMax);

    return isDisabled;
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  const handleClipOnKeyPress = (e: KeyboardEvent) => {
    /*
    allow only numbers, plus other critical keys which
    may be required to make a number
    */
    if (!isValidDigitKeyEvent(e)) {
      e.preventDefault();
    }
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  const handleClipPercentileMinValueChange = (v: any) => {
    /*
    Ignore anything that isn't a legit number
    */
    if (!Number.isFinite(v)) return;

    const clipPercentileMax = pendingClipPercentiles?.clipPercentileMax;

    /*
    clamp to [0, currentClipPercentileMax]
    */
    if (v <= 0) v = 0;
    if (v > 100) v = 100;
    const clipPercentileMin = Math.round(v); // paranoia

    setPendingClipPercentiles({ clipPercentileMin, clipPercentileMax });
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  const handleClipPercentileMaxValueChange = (v: any) => {
    /*
    Ignore anything that isn't a legit number
    */
    if (!Number.isFinite(v)) return;

    const clipPercentileMin = pendingClipPercentiles?.clipPercentileMin;

    /*
    clamp to [0, 100]
    */
    if (v < 0) v = 0;
    if (v > 100) v = 100;
    const clipPercentileMax = Math.round(v); // paranoia

    setPendingClipPercentiles({ clipPercentileMin, clipPercentileMax });
  };

  const handleClipCommit = () => {
    const { clipPercentileMin, clipPercentileMax } = pendingClipPercentiles;
    const min = clipPercentileMin / 100;
    const max = clipPercentileMax / 100;

    track(EVENTS.EXPLORER_CLIP_SELECTED);

    dispatch(actions.clipAction(min, max));
  };

  const handleClipOpening = () => {
    track(EVENTS.EXPLORER_CLIP_CLICKED);
    setPendingClipPercentiles({
      clipPercentileMin: currentClipMin,
      clipPercentileMax: currentClipMax,
    });
  };

  const handleClipClosing = () => {
    setPendingClipPercentiles(INITIAL_PERCENTILES);
  };

  const handleCentroidChange = () => {
    if (!showCentroidLabels) {
      // only track when turning on
      track(EVENTS.EXPLORER_SHOW_LABELS);
    }

    dispatch({
      type: "show centroid labels for category",
      showLabels: !showCentroidLabels,
    });
  };

  const handleSubset = () => {
    track(EVENTS.EXPLORER_SUBSET_BUTTON_CLICKED);

    dispatch(actions.subsetAction());
  };

  const handleSubsetReset = () => {
    track(EVENTS.EXPLORER_RESET_SUBSET_BUTTON_CLICKED);

    dispatch(actions.resetSubsetAction());
  };

  const onResize = (e: ResizeObserverEntry[]) => {
    if (e[0].contentRect.width <= MAX_VERTICAL_THRESHOLD_WIDTH_PX) {
      setIsVertical(true);
    } else {
      setIsVertical(false);
    }
  };

  const isColoredByCategorical = !!categoricalSelection?.[colorAccessor || ""];

  const isTest = getFeatureFlag(FEATURES.TEST);

  // constants used to create selection tool button
  const selectionTooltip = "select";

  return (
    <ResizeSensor onResize={onResize}>
      <MenuBarWrapper data-test-id="menubar">
        <EmbeddingWrapper>
          <Embedding isSidePanel={false} />
        </EmbeddingWrapper>
        <ControlsWrapper>
          <ResponsiveMenuGroupTwo>
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

            <Tooltip
              content={
                <span data-chromatic="ignore">
                  Download the current graph view as a PNG
                </span>
              }
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
              pendingClipPercentiles={pendingClipPercentiles}
              clipPercentileMin={currentClipMin}
              clipPercentileMax={currentClipMax}
              handleClipOpening={handleClipOpening}
              handleClipClosing={handleClipClosing}
              handleClipCommit={handleClipCommit}
              isClipDisabled={isClipDisabled}
              handleClipOnKeyPress={handleClipOnKeyPress}
              handleClipPercentileMaxValueChange={
                handleClipPercentileMaxValueChange
              }
              handleClipPercentileMinValueChange={
                handleClipPercentileMinValueChange
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
                onClick={handleCentroidChange}
                active={showCentroidLabels}
                intent={showCentroidLabels ? "primary" : "none"}
                disabled={!isColoredByCategorical}
              />
            </Tooltip>
          </ResponsiveMenuGroupTwo>
          <ResponsiveMenuGroupOne>
            <ButtonGroup className={styles.menubarButton} vertical={isVertical}>
              <Tooltip
                content={selectionTooltip}
                position="bottom"
                hoverOpenDelay={globals.tooltipHoverOpenDelay}
              >
                <AnchorButton
                  type="button"
                  data-testid="mode-lasso"
                  icon={IconNames.POLYGON_FILTER}
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
                  icon={IconNames.ZOOM_IN}
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
              subsetPossible={subsetPossible}
              subsetResetPossible={subsetResetPossible}
              handleSubset={handleSubset}
              handleSubsetReset={handleSubsetReset}
              isVertical={isVertical}
            />
          </ResponsiveMenuGroupOne>
          {disableDiffexp ? null : <DiffexpButtons />}
        </ControlsWrapper>
      </MenuBarWrapper>
    </ResizeSensor>
  );
};

export default connect(mapStateToProps)(MenuBar);
