import { useHotkeys, InputGroup } from "@blueprintjs/core";
import React, { FC, useMemo } from "react";
import { connect } from "react-redux";
import { AppDispatch, GetState } from "../../reducers";
import { track } from "../../analytics";
import { subsetAction, resetSubsetAction } from "../../actions/viewStack";
import { EVENTS } from "../../analytics/events";
import * as globals from "../../globals";

interface DispatchProps {
  undo: () => void;
  redo: () => void;
  subset: () => void;
  unsubset: () => void;
}
type Props = DispatchProps;

// Define a thunk action
const performSubset = () => (dispatch: AppDispatch, getState: GetState) => {
  const state = getState();
  const crossfilter = state.obsCrossfilter;
  const selectedCount = crossfilter.countSelected();
  const subsetPossible =
    selectedCount !== 0 && selectedCount !== crossfilter.size();

  if (subsetPossible) {
    track(EVENTS.EXPLORER_SUBSET_BUTTON_CLICKED);
    dispatch(subsetAction());
  }
};

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
  undo: () => {
    track(EVENTS.EXPLORER_UNDO_BUTTON_CLICKED);
    dispatch({ type: "@@undoable/undo" });
  },
  redo: () => {
    track(EVENTS.EXPLORER_REDO_BUTTON_CLICKED);
    dispatch({ type: "@@undoable/redo" });
  },
  subset: () => dispatch(performSubset()),
  unsubset: () => {
    track(EVENTS.EXPLORER_RESET_SUBSET_BUTTON_CLICKED);
    dispatch(resetSubsetAction());
  },
});

const GlobalHotkeys: FC<Props> = ({ undo, redo, subset, unsubset }) => {
  const hotkeys = useMemo(
    () => [
      {
        combo: globals.isMac ? "CMD+Z" : "CTRL+Z",
        global: true,
        label: "Undo.",
        onKeyDown: () => {
          undo();
        },
      },
      {
        combo: globals.isMac ? "CMD+SHIFT+Z" : "CTRL+SHIFT+Z",
        global: true,
        label: "Redo.",
        onKeyDown: () => {
          redo();
        },
      },
      {
        combo: "SHIFT+W",
        global: true,
        label: "Subset to selection.",
        onKeyDown: () => {
          subset();
        },
      },
      {
        combo: "SHIFT+E",
        global: true,
        label: "Unsubset selection.",
        onKeyDown: () => {
          unsubset();
        },
      },
    ],
    []
  );
  const { handleKeyDown, handleKeyUp } = useHotkeys(hotkeys);

  return (
    <div
      data-testid="hotkey-input-group"
      role="tab"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      style={{
        display: "none",
      }}
    >
      <InputGroup />
    </div>
  );
};

export default connect(null, mapDispatchToProps)(GlobalHotkeys);
