import { StatusTypes } from "react-async";
import { genesetAddGenes } from "../actions/geneset";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
const Controls = (
  state = {
    // data loading flag
    loading: true,
    error: null,

    // all of the data + selection state
    resettingInterface: false,
    graphInteractionMode: "select",
    opacityForDeselectedCells: 0.2,
    scatterplotXXaccessor: false, // just easier to read
    scatterplotYYaccessor: false,
    geneIsOpen: false,
    gene: null,
    graphRenderCounter: 0 /* integer as <Component key={graphRenderCounter} - a change in key forces a remount */,

    datasetDrawer: false,
  },
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  action: any
) => {
  /*
  For now, log anything looking like an error to the console.
  */
  if (action.error || /error/i.test(action.type)) {
    console.error(action.error);
  }

  switch (action.type) {
    case "initial data load start": {
      return { ...state, loading: true };
    }
    case "initial data load complete": {
      /* now fully loaded */
      return {
        ...state,
        loading: false,
        error: null,
        resettingInterface: false,
      };
    }
    case "reset subset": {
      return {
        ...state,
        resettingInterface: false,
      };
    }
    case "subset to selection": {
      return {
        ...state,
        loading: false,
        error: null,
      };
    }
    case "initial data load error": {
      return {
        ...state,
        loading: false,
        error: action.error,
      };
    }

    /*******************************
             User Events
     *******************************/
    case "change graph interaction mode":
      return {
        ...state,
        graphInteractionMode: action.data,
      };
    case "change opacity deselected cells in 2d graph background":
      return {
        ...state,
        opacityForDeselectedCells: action.data,
      };
    case "increment graph render counter": {
      const c = state.graphRenderCounter + 1;
      return {
        ...state,
        graphRenderCounter: c,
      };
    }

    /*******************************
              Gene Info
    *******************************/
    case "open gene info":
      // if scatterplot is open, close it
      if (state.scatterplotXXaccessor && state.scatterplotYYaccessor) {
        state.scatterplotXXaccessor = false;
        state.scatterplotYYaccessor = false;
      }
      // new gene clicked in the span of loading
      if (state.gene !== action.gene) {
        return {
          ...state,
          geneIsOpen: true,
          gene: state.gene,
          geneUrl: "",
          geneSummary: "",
          geneSynonyms: [""],
          geneName: "",
        };
      }
      return {
        ...state,
        geneIsOpen: true,
        gene: action.gene,
        geneUrl: action.url,
        geneSummary: action.summary,
        geneSynonyms: action.synonyms,
        geneName: action.name,
      };
    case "load gene info":
      // if scatterplot is open, close it
      if (state.scatterplotXXaccessor && state.scatterplotYYaccessor) {
        state.scatterplotXXaccessor = false;
        state.scatterplotYYaccessor = false;
      }
      state.gene = action.gene;
      return {
        ...state,
        geneIsOpen: true,
        gene: action.gene,
        geneUrl: "",
        geneSummary: "",
        geneSynonyms: [""],
        geneName: "",
      };
    case "clear gene info":
      console.log(action);
      return {
        ...state,
        geneIsOpen: false,
      };

    /*******************************
              Scatterplot
    *******************************/
    case "set scatterplot x":
      // if gene info card is open, close it
      if (state.geneIsOpen && state.scatterplotYYaccessor) {
        state.geneIsOpen = false;
      }
      return {
        ...state,
        scatterplotXXaccessor: action.data,
      };
    // if gene info card is open, close it
    case "set scatterplot y":
      if (state.geneIsOpen && state.scatterplotXXaccessor) {
        state.geneIsOpen = false;
      }
      return {
        ...state,
        scatterplotYYaccessor: action.data,
      };
    case "clear scatterplot":
      return {
        ...state,
        scatterplotXXaccessor: null,
        scatterplotYYaccessor: null,
      };

    /**************************
          Dataset Drawer
     **************************/
    case "toggle dataset drawer":
      return { ...state, datasetDrawer: !state.datasetDrawer };

    default:
      return state;
  }
};

export default Controls;
