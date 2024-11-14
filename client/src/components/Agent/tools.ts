import { AppDispatch, GetState } from "../../reducers";
import {
  performSubset,
  performUnsubset,
  performCategoricalSelection,
  performHistogramSelection,
  // performPanning,
  // performZoomIn,
  // performZoomOut,
  performColorByGene,
  performExpandGene,
  performExpandCategory,
  performColorByGeneset,
  performColorByMetadata,
  performCreateGeneset,
  // performXYScatterplot,
  // performShowCellGuide,
  // performShowGeneCard,
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
      return `Performed categorical selection on ${args.category_value}.`;
    },
  },

  histogram_selection: {
    action: async (dispatch) => {
      dispatch(performHistogramSelection());
      return "Performed histogram selection. Only subset if users explicitly asked for it.";
    },
  },

  // panning: {
  //   action: async (dispatch) => {
  //     dispatch(performPanning());
  //     return "Performed panning";
  //   },
  // },

  // zoom_in: {
  //   action: async (dispatch) => {
  //     dispatch(performZoomIn());
  //     return "Performed zoom in";
  //   },
  // },

  // zoom_out: {
  //   action: async (dispatch) => {
  //     dispatch(performZoomOut());
  //     return "Performed zoom out";
  //   },
  // },

  color_by_gene: {
    action: async (dispatch, _getState, args) => {
      if (!args) throw new Error("Gene name is required");
      const returnMessage = await dispatch(performColorByGene(args));
      return returnMessage;
    },
  },

  expand_gene: {
    action: async (dispatch, _getState, args) => {
      if (!args) throw new Error("Gene name is required");
      await dispatch(performExpandGene(args));
      return `Expanded gene: ${args.gene}`;
    },
  },

  color_by_geneset: {
    action: async (dispatch, getState, args) => {
      if (!args || Object.keys(args).length === 0) {
        const { genesets } = getState();
        const genesetNames = Array.from(genesets.genesets.keys());
        if (genesetNames.length === 0) {
          return "There are no genesets available to color by. You must create the geneset first.";
        }
        return `I have decided to perform the color by geneset action. Here are the available geneset names: ${genesetNames}. I must select one of these genesets to color by.`;
      }

      await dispatch(performColorByGeneset(args));
      return `Colored by geneset: ${args.geneset}`;
    },
  },

  color_by_metadata: {
    action: async (dispatch, _getState, args) => {
      if (!args) throw new Error("Metadata name is required");
      await dispatch(performColorByMetadata(args));
      return `Colored by metadata: ${args.metadata_name}`;
    },
  },

  expand_category: {
    action: async (dispatch, _getState, args) => {
      if (!args) throw new Error("Category name is required");
      await dispatch(performExpandCategory(args));
      return `Expanded category: ${args.category_name}`;
    },
  },

  create_geneset: {
    action: async (dispatch, _getState, args) => {
      if (!args) throw new Error("Geneset args are required");
      await dispatch(performCreateGeneset(args));
      return "Created new geneset";
    },
  },

  // xy_scatterplot: {
  //   action: async (dispatch) => {
  //     dispatch(performXYScatterplot());
  //     return "Created XY scatterplot";
  //   },
  // },

  // show_cell_guide: {
  //   action: async (dispatch) => {
  //     dispatch(performShowCellGuide());
  //     return "Showed cell guide";
  //   },
  // },

  // show_gene_card: {
  //   action: async (dispatch) => {
  //     dispatch(performShowGeneCard());
  //     return "Showed gene card";
  //   },
  // },
};

export function createUITools(dispatch: AppDispatch, getState: GetState) {
  return Object.entries(TOOL_IMPLEMENTATIONS).map(
    ([name, implementation]) =>
      new UITool(name, (args?: Record<string, string>) =>
        implementation.action(dispatch, getState, args)
      )
  );
}
