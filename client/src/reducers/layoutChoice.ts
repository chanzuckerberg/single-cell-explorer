/*
we have a UI heuristic to pick the default layout, based on assumptions
about commonly used names.  Preferentially, pick in the following order:

  1. "umap"
  2. "tsne"
  3. "pca"
  4. give up, use the first available
*/

import { type Action, type AnyAction } from "redux";
import { type RootState } from ".";
import { selectAvailableLayouts } from "../selectors/layoutChoice";
import { getCurrentLayout } from "../util/layout";

export interface LayoutChoiceState {
  available: Array<string>;
  current: string;
  currentDimNames: Array<string>;
}

export interface LayoutChoiceAction extends Action<string> {
  layoutChoice: string;
}

const LayoutChoice = (
  state: LayoutChoiceState,
  action: AnyAction,
  nextSharedState: RootState
): LayoutChoiceState => {
  switch (action.type) {
    case "initial data load complete": {
      const { layoutChoice } = action;

      return {
        ...state,
        available: selectAvailableLayouts(nextSharedState),
        ...getCurrentLayout(nextSharedState, layoutChoice),
      };
    }

    case "set layout choice": {
      const { layoutChoice } = action as LayoutChoiceAction;

      return { ...state, ...getCurrentLayout(nextSharedState, layoutChoice) };
    }

    default: {
      return state;
    }
  }
};

export default LayoutChoice;
