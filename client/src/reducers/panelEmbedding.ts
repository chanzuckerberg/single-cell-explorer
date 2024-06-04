import { type Action, type AnyAction } from "redux";
import { type RootState } from ".";
import { selectAvailableLayouts } from "../selectors/layoutChoice";
import { getCurrentLayout } from "../util/layout";

export interface PanelEmbeddingState {
  layoutChoice: {
    available: Array<string>;
    current: string;
    currentDimNames: Array<string>;
  };
}

export interface LayoutChoiceAction extends Action<string> {
  layoutChoice: string;
}

const panelEmbedding = (
  state: PanelEmbeddingState,
  action: AnyAction,
  nextSharedState: RootState
): PanelEmbeddingState => {
  switch (action.type) {
    // TODO(#923): connect this to new button in the embedding selector
    case "open embedding side panel":
    case "initial data load complete": {
      const { layoutChoice } = action;

      return {
        ...state,
        layoutChoice: {
          available: selectAvailableLayouts(nextSharedState),
          ...getCurrentLayout(nextSharedState, layoutChoice),
        },
      };
    }

    case "set panel embedding layout choice": {
      const { layoutChoice } = action as LayoutChoiceAction;
      console.log(action);

      return {
        ...state,
        layoutChoice: {
          ...state.layoutChoice,
          ...getCurrentLayout(nextSharedState, layoutChoice),
        },
      };
    }

    default: {
      return state;
    }
  }
};

export default panelEmbedding;
