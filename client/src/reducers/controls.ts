/* logic for minimizing and maximizing pop-ups */
const minimizeMaximizePopUps = (
  geneLevel: string,
  geneIsMinimized: boolean,
  geneIsOpen: boolean,
  scatterplotLevel: string,
  scatterplotIsMinimized: boolean,
  scatterplotIsOpen: boolean
) => {
  if (
    geneIsMinimized &&
    geneIsOpen &&
    scatterplotIsMinimized &&
    scatterplotIsOpen
  ) {
    return {
      geneLevel,
      scatterplotLevel,
    };
  }
  if (!geneIsMinimized) {
    return {
      geneLevel: scatterplotIsMinimized && scatterplotIsOpen ? "top" : "bottom",
      scatterplotLevel:
        scatterplotIsMinimized && scatterplotIsOpen ? "bottom" : "",
    };
  }
  if (!scatterplotIsMinimized) {
    return {
      scatterplotLevel: geneIsMinimized && geneIsOpen ? "top" : "bottom",
      geneLevel: geneIsMinimized && geneIsOpen ? "bottom" : "",
    };
  }
  return {
    geneLevel: geneIsMinimized ? "bottom" : "top",
    scatterplotLevel: scatterplotIsMinimized ? "bottom" : "top",
  };
};

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
    scatterplotIsMinimized: false,
    geneIsMinimized: false,
    scatterplotLevel: "",
    scatterplotIsOpen: false,
    geneLevel: "",
    gene: null,
    infoError: null,
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
    case "open gene info": {
      // if scatterplot is already open
      if (
        !state.scatterplotIsMinimized &&
        state.scatterplotXXaccessor &&
        state.scatterplotYYaccessor
      ) {
        state.scatterplotIsMinimized = true;
        state.geneIsMinimized = false;
      }
      state.geneIsOpen = true;

      const stackLevels = minimizeMaximizePopUps(
        state.geneLevel,
        state.geneIsMinimized,
        state.geneIsOpen,
        state.scatterplotLevel,
        state.scatterplotIsMinimized,
        state.scatterplotIsOpen
      );
      state.geneLevel = stackLevels.geneLevel;
      state.scatterplotLevel = stackLevels.scatterplotLevel;

      // new gene clicked in the span of loading
      if (state.gene !== action.gene) {
        return {
          ...state,
          geneIsOpen: state.geneIsOpen,
          gene: state.gene,
          geneUrl: "",
          geneSummary: "",
          geneSynonyms: [""],
          geneName: "",
          geneIsMinimized: state.geneIsMinimized,
          geneLevel: state.geneLevel,
          infoError: state.infoError,
          isEnsemblIdResult: action.isEnsemblIdResult,
        };
      }
      return {
        ...state,
        geneIsOpen: state.geneIsOpen,
        gene: action.gene,
        geneUrl: action.url,
        geneSummary: action.summary,
        geneSynonyms: action.synonyms,
        geneName: action.name,
        geneIsMinimized: false,
        geneLevel: state.geneLevel,
        infoError: action.infoError,
        isEnsemblIdResult: action.isEnsemblIdResult,
      };
    }

    case "load gene info": {
      // if scatterplot is already open
      if (
        !state.scatterplotIsMinimized &&
        state.scatterplotXXaccessor &&
        state.scatterplotYYaccessor
      ) {
        state.scatterplotIsMinimized = true;
        state.geneIsMinimized = false;
      }
      state.geneIsOpen = true;

      const stackLevels = minimizeMaximizePopUps(
        state.geneLevel,
        state.geneIsMinimized,
        state.geneIsOpen,
        state.scatterplotLevel,
        state.scatterplotIsMinimized,
        state.scatterplotIsOpen
      );
      state.geneLevel = stackLevels.geneLevel;
      state.scatterplotLevel = stackLevels.scatterplotLevel;
      state.gene = action.gene;

      return {
        ...state,
        geneIsOpen: state.geneIsOpen,
        gene: action.gene,
        geneUrl: "",
        geneSummary: "",
        geneSynonyms: [""],
        geneName: "",
        geneIsMinimized: false,
        geneLevel: state.geneLevel,
        infoError: null,
      };
    }

    case "minimize/maximize gene info": {
      state.geneIsMinimized = !state.geneIsMinimized;
      if (!state.geneIsMinimized) {
        state.scatterplotIsMinimized = true;
      }
      const stackLevels = minimizeMaximizePopUps(
        state.geneLevel,
        state.geneIsMinimized,
        state.geneIsOpen,
        state.scatterplotLevel,
        state.scatterplotIsMinimized,
        state.scatterplotIsOpen
      );
      state.geneLevel = stackLevels.geneLevel;
      state.scatterplotLevel = stackLevels.scatterplotLevel;
      return {
        ...state,
        geneIsMinimized: state.geneIsMinimized,
        geneLevel: state.geneLevel,
        scatterplotIsMinimized: state.scatterplotIsMinimized,
        infoError: action.infoError,
      };
    }

    case "clear gene info": {
      state.geneIsOpen = false;
      const stackLevels = minimizeMaximizePopUps(
        state.geneLevel,
        state.geneIsMinimized,
        state.geneIsOpen,
        state.scatterplotLevel,
        state.scatterplotIsMinimized,
        state.scatterplotIsOpen
      );
      state.geneLevel = stackLevels.geneLevel;
      state.scatterplotLevel = stackLevels.scatterplotLevel;

      return {
        ...state,
        geneIsOpen: state.geneIsOpen,
        geneIsMinimized: null,
        geneLevel: state.geneLevel,
        infoError: action.infoError,
      };
    }

    /*******************************
              Scatterplot
    *******************************/
    case "set scatterplot x": {
      // gene info is already open
      if (
        !state.geneIsMinimized &&
        state.geneIsOpen &&
        state.scatterplotYYaccessor
      ) {
        state.geneIsMinimized = true;
        state.scatterplotIsMinimized = false;
        state.scatterplotIsOpen = true;
      }

      const stackLevels = minimizeMaximizePopUps(
        state.geneLevel,
        state.geneIsMinimized,
        state.geneIsOpen,
        state.scatterplotLevel,
        state.scatterplotIsMinimized,
        state.scatterplotIsOpen
      );
      state.geneLevel = stackLevels.geneLevel;
      state.scatterplotLevel = stackLevels.scatterplotLevel;

      return {
        ...state,
        scatterplotXXaccessor: action.data,
        scatterplotIsMinimized: false,
        scatterplotLevel: state.scatterplotLevel,
      };
    }

    case "set scatterplot y": {
      // gene info is already open
      if (
        !state.geneIsMinimized &&
        state.geneIsOpen &&
        state.scatterplotXXaccessor
      ) {
        state.geneIsMinimized = true;
        state.scatterplotIsMinimized = false;
        state.scatterplotIsOpen = true;
      }

      const stackLevels = minimizeMaximizePopUps(
        state.geneLevel,
        state.geneIsMinimized,
        state.geneIsOpen,
        state.scatterplotLevel,
        state.scatterplotIsMinimized,
        state.scatterplotIsOpen
      );
      state.geneLevel = stackLevels.geneLevel;
      state.scatterplotLevel = stackLevels.scatterplotLevel;

      return {
        ...state,
        scatterplotYYaccessor: action.data,
        scatterplotIsMinimized: false,
        scatterplotLevel: state.scatterplotLevel,
      };
    }

    case "minimize/maximize scatterplot": {
      state.scatterplotIsMinimized = !state.scatterplotIsMinimized;
      if (!state.scatterplotIsMinimized) {
        state.geneIsMinimized = true;
      }
      const stackLevels = minimizeMaximizePopUps(
        state.geneLevel,
        state.geneIsMinimized,
        state.geneIsOpen,
        state.scatterplotLevel,
        state.scatterplotIsMinimized,
        state.scatterplotIsOpen
      );
      state.geneLevel = stackLevels.geneLevel;
      state.scatterplotLevel = stackLevels.scatterplotLevel;

      return {
        ...state,
        scatterplotIsMinimized: state.scatterplotIsMinimized,
        scatterplotLevel: state.scatterplotLevel,
        geneIsMinimized: state.geneIsMinimized,
      };
    }

    case "clear scatterplot": {
      state.scatterplotIsOpen = false;
      const stackLevels = minimizeMaximizePopUps(
        state.geneLevel,
        state.geneIsMinimized,
        state.geneIsOpen,
        state.scatterplotLevel,
        state.scatterplotIsMinimized,
        state.scatterplotIsOpen
      );
      state.geneLevel = stackLevels.geneLevel;
      state.scatterplotLevel = stackLevels.scatterplotLevel;

      return {
        ...state,
        scatterplotXXaccessor: null,
        scatterplotYYaccessor: null,
        scatterplotIsMinimized: null,
        scatterplotLevel: state.scatterplotLevel,
      };
    }

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
