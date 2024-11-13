import { AppDispatch, GetState } from "../../reducers";
import {
  performSubset,
  performUnsubset,
  performCategoricalSelection,
  performHistogramSelection,
  performPanning,
  performZoomIn,
  performZoomOut,
  performColorByGene,
  performColorByGeneset,
  performColorByCategory,
  performColorByContinuous,
  performCreateGeneset,
  performXYScatterplot,
  performShowCellGuide,
  performShowGeneCard,
} from "./actions";
import { UITool } from "./UITool";

type ToolImplementation = {
  action: (
    dispatch: AppDispatch,
    getState: GetState,
    args?: Record<string, string>
  ) => Promise<string>;
};

// This maps the tool names (defined in the backend) to their frontend implementations
const TOOL_IMPLEMENTATIONS: Record<string, ToolImplementation> = {
  subset: {
    action: async (dispatch) => {
      dispatch(performSubset());
      return "Created subset from selection";
    },
  },

  unsubset: {
    action: async (dispatch) => {
      dispatch(performUnsubset());
      return "I reset the subset back to full dataset";
    },
  },

  categorical_selection: {
    action: async (dispatch, _getState, args) => {
      if (!args) throw new Error("Categorical selection args are required");
      await dispatch(performCategoricalSelection(args));
      return "Performed categorical selection";
    },
  },

  histogram_selection: {
    action: async (dispatch) => {
      dispatch(performHistogramSelection());
      return "Performed histogram selection";
    },
  },

  panning: {
    action: async (dispatch) => {
      dispatch(performPanning());
      return "Performed panning";
    },
  },

  zoom_in: {
    action: async (dispatch) => {
      dispatch(performZoomIn());
      return "Performed zoom in";
    },
  },

  zoom_out: {
    action: async (dispatch) => {
      dispatch(performZoomOut());
      return "Performed zoom out";
    },
  },

  color_by_gene: {
    action: async (dispatch, _getState, args) => {
      const gene = args?.gene;
      if (!gene) throw new Error("Gene name is required");
      dispatch(performColorByGene());
      return `Colored by gene: ${gene}`;
    },
  },

  color_by_geneset: {
    action: async (dispatch) => {
      dispatch(performColorByGeneset());
      return "Performed color by geneset";
    },
  },

  color_by_category: {
    action: async (dispatch) => {
      dispatch(performColorByCategory());
      return "Performed color by category";
    },
  },

  color_by_continuous: {
    action: async (dispatch) => {
      dispatch(performColorByContinuous());
      return "Performed color by continuous variable";
    },
  },

  create_geneset: {
    action: async (dispatch) => {
      dispatch(performCreateGeneset());
      return "Created new geneset";
    },
  },

  xy_scatterplot: {
    action: async (dispatch) => {
      dispatch(performXYScatterplot());
      return "Created XY scatterplot";
    },
  },

  show_cell_guide: {
    action: async (dispatch) => {
      dispatch(performShowCellGuide());
      return "Showed cell guide";
    },
  },

  show_gene_card: {
    action: async (dispatch) => {
      dispatch(performShowGeneCard());
      return "Showed gene card";
    },
  },
};

export function createUITools(dispatch: AppDispatch, getState: GetState) {
  return Object.entries(TOOL_IMPLEMENTATIONS).map(
    ([name, implementation]) =>
      new UITool(name, (args?: Record<string, string>) =>
        implementation.action(dispatch, getState, args)
      )
  );
}
