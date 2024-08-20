import { AnyAction } from "redux";
import {
  ActiveTab,
  CellInfo,
  CellType,
  DatasetUnsMetadata,
  GeneInfo,
} from "../common/types/entities";

interface ControlsState {
  loading: boolean;
  error: Error | string | null;
  resettingInterface: boolean;
  graphInteractionMode: "zoom" | "select";
  scatterplotXXaccessor: string | false;
  scatterplotYYaccessor: string | false;
  scatterplotIsMinimized: boolean;
  scatterplotIsOpen: boolean;
  graphRenderCounter: number;
  colorLoading: boolean;
  datasetDrawer: boolean;
  isCellGuideCxg: boolean;
  screenCap: boolean;
  mountCapture: boolean;
  imageUnderlay: boolean;
  activeTab: ActiveTab;
  infoPanelHidden: boolean;
  infoPanelMinimized: boolean;
  imageOpacity: number;
  dotOpacity: number;
  geneInfo: GeneInfo;
  unsMetadata: DatasetUnsMetadata;
  cellInfo: CellInfo;
  cellTypes: CellType[];
  geneList: string[];
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
    scatterplotIsOpen: false,
    graphRenderCounter: 0 /* integer as <Component key={graphRenderCounter} - a change in key forces a remount */,
    colorLoading: false,
    datasetDrawer: false,
    isCellGuideCxg: false,
    screenCap: false,
    mountCapture: false,
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
    cellInfo: {
      cellId: "",
      cellName: "",
      cellDescription: "",
      synonyms: [""],
      references: [""],
      error: null,
      loading: false,
    },
    cellTypes: [],
    geneList: [],
    geneInfo: {
      gene: null,
      geneName: "",
      geneSummary: "",
      geneSynonyms: [""],
      geneUrl: "",
      showWarningBanner: false,
      infoError: null,
      loading: false,
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
        infoPanelMinimized: false,
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
          Cell Info
    **************************/
    case "request cell info start": {
      return {
        ...state,
        cellInfo: {
          ...state.cellInfo,
          cellName: action.cellName,
          loading: true,
        },
      };
    }
    case "open cell info": {
      return {
        ...state,
        cellInfo: {
          ...state.cellInfo,
          cellId: action.cellInfo.cell_id,
          cellDescription: action.cellInfo.description,
          synonyms: action.cellInfo.synonyms,
          references: action.cellInfo.references,
          error: action.cellInfo.error,
          loading: false,
        },
      };
    }
    case "request cell info error": {
      return {
        ...state,
        cellInfo: {
          ...state.cellInfo,
          error: action.error,
          loading: false,
        },
      };
    }
    case "request cell types list success": {
      return {
        ...state,
        cellTypes: (
          action.data as { cell_id: string; cell_name: string }[]
        ).map((item) => ({
          cellTypeId: item.cell_id,
          cellTypeName: item.cell_name,
        })),
      };
    }
    /*******************************
              Gene Info
    *******************************/
    case "request gene info start": {
      return {
        ...state,
        geneInfo: {
          ...state.geneInfo,
          gene: action.gene,
          geneName: action.gene,
          loading: true,
        },
      };
    }
    case "open gene info": {
      return {
        ...state,
        geneInfo: {
          ...state.geneInfo,
          gene: action.gene,
          geneName: action.info.name,
          geneSummary: action.info.summary,
          geneSynonyms: action.info.synonyms,
          geneUrl: action.info.ncbi_url,
          showWarningBanner: action.info.show_warning_banner,
          loading: false,
        },
      };
    }
    case "request gene info error": {
      return {
        ...state,
        geneInfo: {
          ...state.geneInfo,
          infoError: action.error,
          loading: false,
        },
      };
    }
    case "request gene list success": {
      return {
        ...state,
        geneList: action.geneNames,
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
