import { AnyAction } from "redux";
import type { RootState } from ".";
import { ControlsHelpers as CH } from "../util/stateManager";

/*
State is an object, with a key for each categorical annotation, and a
value which is a Map of label->t/f, reflecting selection state for the label.

Label state default (if missing) is up to the component, but typically true.

{
  "louvain": Map(),
  ...
}
*/
interface CategoricalSelectionState {
  [key: string]: Map<string, boolean>;
}
const CategoricalSelection = (
  state: CategoricalSelectionState,
  action: AnyAction,
  nextSharedState: RootState
): CategoricalSelectionState => {
  switch (action.type) {
    case "initial data load complete":
    case "subset to selection":
    case "reset subset":
    case "set clip quantiles": {
      const { annoMatrix } = nextSharedState;
      const newState = CH.createCategoricalSelection(
        CH.selectableCategoryNames(annoMatrix.schema)
      );
      return newState;
    }

    case "annotation: create category": {
      const name = action.data;
      return {
        ...state,
        ...CH.createCategoricalSelection([name]),
      };
    }

    case "annotation: category edited": {
      const name = action.metadataField;
      const newName = action.newCategoryText;
      const { [name]: selected, ...rest } = state;
      return {
        ...rest,
        [newName]: selected ?? new Map(),
      };
    }

    case "annotation: delete category": {
      const name = action.metadataField;
      const { [name]: _removed, ...rest } = state;
      return rest;
    }

    case "annotation: add new label to category":
    case "annotation: label edited":
    case "annotation: delete label":
    case "annotation: label current cell selection": {
      const name = action.metadataField;
      const { [name]: _removed, ...partial } = state;
      return {
        ...partial,
        ...CH.createCategoricalSelection([name]),
      };
    }

    case "categorical metadata filter select":
    case "categorical metadata filter deselect":
    case "categorical metadata filter none of these":
    case "categorical metadata filter all of these": {
      const { metadataField, labelSelectionState } = action;
      return {
        ...state,
        [metadataField]: labelSelectionState,
      };
    }

    default: {
      return state;
    }
  }
};

export default CategoricalSelection;
