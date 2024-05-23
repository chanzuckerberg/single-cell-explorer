/*
we have a UI heuristic to pick the default layout, based on assumptions
about commonly used names.  Preferentially, pick in the following order:

  1. "umap"
  2. "tsne"
  3. "pca"
  4. give up, use the first available
*/

import type { Action, AnyAction } from "redux";
import type { RootState } from ".";
import { selectAvailableLayouts } from "../selectors/layoutChoice";
import { selectSchema } from "../selectors/annoMatrix";

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

function getCurrentLayout(
  state: RootState,
  layoutChoice: string
): {
  current: string;
  currentDimNames: Array<string>;
} {
  const schema = selectSchema(state);
  const currentDimNames = schema.layout.obsByName[layoutChoice].dims;

  return { current: layoutChoice, currentDimNames };
}

export function getBestDefaultLayout(layouts: Array<string>): string {
  const preferredNames = ["umap", "tsne", "pca"];
  const idx = preferredNames.findIndex((name) => layouts.indexOf(name) !== -1);
  if (idx !== -1) return preferredNames[idx];
  return layouts[0];
}
