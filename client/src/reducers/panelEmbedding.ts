import { type Action, type AnyAction } from "redux";
import { type RootState } from ".";
import { getCurrentLayout } from "../util/layout";
import { selectAvailableLayouts } from "../selectors/layoutChoice";

export interface PanelEmbeddingState {
  layoutChoice: {
    available: Array<string>;
    current: string;
    currentDimNames: Array<string>;
  };
  open: boolean;
  minimized: boolean;
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
    case "initial data load complete": {
      return {
        ...state,
        open: false,
        minimized: false,
      };
    }

    case "toggle panel embedding": {
      return {
        ...state,
        open: !state.open,
        layoutChoice: {
          available: selectAvailableLayouts(nextSharedState),
          ...getCurrentLayout(
            nextSharedState,
            nextSharedState.layoutChoice.current
          ),
        },
        minimized: false,
      };
    }

    case "toggle minimize panel embedding": {
      return {
        ...state,
        minimized: !state.minimized,
      };
    }

    case "set panel embedding layout choice": {
      const { layoutChoice } = action as LayoutChoiceAction;

      return {
        ...state,
        layoutChoice: {
          ...state.layoutChoice,
          ...getCurrentLayout(nextSharedState, layoutChoice),
        },
        minimized: false,
      };
    }

    default: {
      return state;
    }
  }
};

export default panelEmbedding;
