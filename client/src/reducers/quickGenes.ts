import uniq from "lodash.uniq";
import filter from "lodash.filter";
import type { RootState } from ".";
import { track } from "../analytics";
import { EVENTS } from "../analytics/events";

interface QuickGenesActions {
  type: string;
  gene: string;
  selection: string;
  data: string;
}
const quickGenes = (
  state: { userDefinedGenes: string[]; userDefinedGenesLoading: boolean } = {
    userDefinedGenes: [],
    userDefinedGenesLoading: false,
  },
  action: QuickGenesActions,
  nextSharedState: RootState
) => {
  switch (action.type) {
    case "request user defined gene started": {
      return {
        ...state,
        userDefinedGenesLoading: true,
      };
    }
    case "request user defined gene error": {
      return {
        ...state,
        userDefinedGenesLoading: false,
      };
    }
    case "request user defined gene success": {
      const { userDefinedGenes } = state;
      const _userDefinedGenes = uniq([...userDefinedGenes, action.gene]);
      return {
        ...state,
        userDefinedGenes: _userDefinedGenes,
        userDefinedGenesLoading: false,
      };
    }
    case "clear user defined gene": {
      const { userDefinedGenes } = state;
      const newUserDefinedGenes = filter(
        userDefinedGenes,
        (d) => d !== action.gene
      );
      return {
        ...state,
        userDefinedGenes: newUserDefinedGenes,
      };
    }

    case "continuous metadata histogram end":
    case "color by expression":
    case "set scatterplot x":
    case "set scatterplot y": {
      const { selection, gene } = action;
      const { controls } = nextSharedState;
      const { scatterplotXXaccessor, scatterplotYYaccessor } = controls;

      const { userDefinedGenes } = state;
      const isQuickGene =
        userDefinedGenes.includes(selection) ||
        userDefinedGenes.includes(gene) ||
        userDefinedGenes.includes(scatterplotXXaccessor) ||
        userDefinedGenes.includes(scatterplotYYaccessor);

      switch (action.type) {
        case "continuous metadata histogram end": {
          if (isQuickGene) track(EVENTS.EXPLORER_ADD_GENE_AND_SELECT_HISTOGRAM);
          break;
        }
        case "color by expression": {
          if (isQuickGene) track(EVENTS.EXPLORER_ADD_GENE_AND_COLORBY);
          break;
        }
        case "set scatterplot x":
        case "set scatterplot y": {
          if (scatterplotXXaccessor && scatterplotYYaccessor) {
            track(EVENTS.EXPLORER_DISPLAY_SCATTERPLOT);
            if (isQuickGene)
              track(EVENTS.EXPLORER_ADD_GENE_AND_DISPLAY_SCATTERPLOT);
          }
          break;
        }
        default:
          break;
      }
      return state;
    }
    default:
      return state;
  }
};

export default quickGenes;
