import { AnyAction } from "redux";
import { CrossfilterSelector } from "../util/typedCrossfilter";

interface GraphSelectionState {
  tool: "lasso" | "brush";
  selection: CrossfilterSelector;
}
const GraphSelection = (
  state: GraphSelectionState = {
    tool: "lasso", // what selection tool mode (lasso, brush, ...)
    selection: { mode: "all" }, // current selection, which is tool specific
  },
  action: AnyAction
) => {
  switch (action.type) {
    case "set clip quantiles":
    case "subset to selection":
    case "reset subset":
    case "set layout choice": {
      return {
        ...state,
        selection: {
          mode: "all",
        },
      };
    }

    case "graph brush end":
    case "graph brush change": {
      const { brushCoords } = action;
      return {
        ...state,
        selection: {
          mode: "within-rect",
          brushCoords,
        },
      };
    }

    case "graph lasso end": {
      const { polygon, graphId } = action;
      return {
        ...state,
        selection: {
          mode: "within-polygon",
          polygon,
          graphId,
        },
      };
    }

    case "graph lasso cancel":
    case "graph brush cancel":
    case "graph lasso deselect":
    case "graph brush deselect": {
      return {
        ...state,
        selection: {
          mode: "all",
        },
      };
    }

    default: {
      return state;
    }
  }
};

export default GraphSelection;
