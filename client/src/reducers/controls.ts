import { AnyAction } from "redux";
import { DatasetUnsMetadata } from "../common/types/entities";

export enum ActiveTab {
  Gene = "Gene",
  Dataset = "Dataset",
}
interface ControlsState {
  loading: boolean;
  error: Error | string | null;
  resettingInterface: boolean;
  graphInteractionMode: "zoom" | "select";
  scatterplotXXaccessor: string | false;
  scatterplotYYaccessor: string | false;
  scatterplotIsMinimized: boolean;
  scatterplotIsOpen: boolean;
  gene: string | null;
  infoError: string | null;
  graphRenderCounter: number;
  colorLoading: boolean;
  datasetDrawer: boolean;
  geneUrl: string;
  geneSummary: string;
  geneName: string;
  geneSynonyms: string[];
  isCellGuideCxg: boolean;
  screenCap: boolean;
  mountCapture: boolean;
  showWarningBanner: boolean;
  imageUnderlay: boolean;
  activeTab: ActiveTab;
  infoPanelHidden: boolean;
  infoPanelMinimized: boolean;
  unsMetadata: DatasetUnsMetadata;
  imageOpacity: number;
  dotOpacity: number;
  expandedCategories: string[];
}
const Controls = (
  state: ControlsState = {
    // data loading flag
    loading: true,
    error: null,
    // all of the data + selection state
    resettingInterface: false,
    graphInteractionMode: "select",
    scatterplotXXaccessor: false, // just easier to read
    scatterplotYYaccessor: false,
    scatterplotIsMinimized: false,
    geneUrl: "",
    geneSummary: "",
    geneSynonyms: [""],
    geneName: "",
    scatterplotIsOpen: false,
    gene: null,
    infoError: null,
    graphRenderCounter: 0 /* integer as <Component key={graphRenderCounter} - a change in key forces a remount */,
    colorLoading: false,
    datasetDrawer: false,
    isCellGuideCxg: false,
    screenCap: false,
    mountCapture: false,
    showWarningBanner: false,
    imageUnderlay: true,
    activeTab: ActiveTab.Dataset,
    infoPanelHidden: true,
    infoPanelMinimized: false,
    unsMetadata: {
      imageWidth: 1955,
      imageHeight: 1955,
      resolution: "",
      scaleref: 0.1868635,
      spotDiameterFullres: 86.06629150338271,
    },
    imageOpacity: 100,
    dotOpacity: 100,
    expandedCategories: [],
  },
  action: AnyAction
): ControlsState => {
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
        isCellGuideCxg: action.isCellGuideCxg,
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
    case "color by geneset mean expression": {
      return {
        ...state,
        colorLoading: true,
      };
    }
    case "color by geneset mean expression success": {
      return {
        ...state,
        colorLoading: false,
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
      return {
        ...state,
        gene: action.gene,
        geneUrl: action.url,
        geneSummary: action.summary,
        geneSynonyms: action.synonyms,
        geneName: action.name,
        infoError: action.infoError,
        showWarningBanner: action.showWarningBanner,
      };
    }
    case "load gene info": {
      return {
        ...state,
        gene: action.gene,
        geneUrl: "",
        geneSummary: "",
        geneSynonyms: [""],
        geneName: "",
        infoError: null,
      };
    }
    /*******************************
              Scatterplot
    *******************************/
    case "set scatterplot x": {
      if (state.scatterplotYYaccessor) {
        state.scatterplotIsMinimized = false;
        state.scatterplotIsOpen = true;
      }

      return {
        ...state,
        scatterplotXXaccessor: action.data,
        scatterplotIsMinimized: false,
      };
    }

    case "set scatterplot y": {
      if (state.scatterplotXXaccessor) {
        state.scatterplotIsMinimized = false;
        state.scatterplotIsOpen = true;
      }
      return {
        ...state,
        scatterplotYYaccessor: action.data,
        scatterplotIsMinimized: false,
      };
    }

    case "minimize/maximize scatterplot": {
      state.scatterplotIsMinimized = !state.scatterplotIsMinimized;

      return {
        ...state,
        scatterplotIsMinimized: state.scatterplotIsMinimized,
      };
    }

    case "clear scatterplot": {
      state.scatterplotIsOpen = false;

      return {
        ...state,
        scatterplotXXaccessor: false,
        scatterplotYYaccessor: false,
        scatterplotIsMinimized: false,
      };
    }
    /**************************
          Info Panel
    **************************/
    case "toggle active info panel": {
      return {
        ...state,
        activeTab: action.activeTab,
        infoPanelHidden: false,
      };
    }
    case "close info panel": {
      return {
        ...state,
        infoPanelHidden: true,
      };
    }
    case "minimize/maximize info panel": {
      return {
        ...state,
        infoPanelMinimized: !state.infoPanelMinimized,
      };
    }
    /**************************
         Screen Capture
    **************************/
    case "graph: screencap start": {
      return {
        ...state,
        screenCap: true,
      };
    }
    case "graph: screencap end": {
      return {
        ...state,
        screenCap: false,
      };
    }

    case "test: screencap start": {
      return {
        ...state,
        screenCap: true,
        mountCapture: true,
      };
    }
    case "test: screencap end": {
      return {
        ...state,
        screenCap: false,
        mountCapture: false,
      };
    }
    /**************************
         Uns/Spatial
    **************************/
    case "toggle image underlay": {
      if (state.imageUnderlay === action.toggle) return state;
      return {
        ...state,
        imageUnderlay: action.toggle,
      };
    }
    case "request uns metadata success": {
      return {
        ...state,
        unsMetadata: {
          imageHeight:
            action.data.image_height ?? state.unsMetadata.imageHeight,
          imageWidth: action.data.image_width ?? state.unsMetadata.imageWidth,
          resolution: action.data.resolution ?? state.unsMetadata.resolution,
          scaleref: action.data.scaleref ?? state.unsMetadata.scaleref,
          spotDiameterFullres:
            action.data.spot_diameter_fullres ??
            state.unsMetadata.spotDiameterFullres,
        },
      };
    }
    case "request uns metadata error": {
      return {
        ...state,
        loading: false,
        error: action.error,
      };
    }
    /**************************
         Opacities
    **************************/
    case "set image opacity": {
      return {
        ...state,
        imageOpacity: action.data,
      };
    }
    case "set dot opacity": {
      return {
        ...state,
        dotOpacity: action.data,
      };
    }
    /**************************
         Categories
    **************************/
    case "controls category expansion change": {
      const { category } = action;
      const { expandedCategories } = state;

      if (expandedCategories.includes(category)) {
        const newExpandedCategories = expandedCategories.filter(
          (expandedCategory) => expandedCategory !== category
        );

        return {
          ...state,
          expandedCategories: newExpandedCategories,
        };
      }

      return {
        ...state,
        expandedCategories: [...expandedCategories, category],
      };
    }
    default:
      return state;
  }
};

export default Controls;
