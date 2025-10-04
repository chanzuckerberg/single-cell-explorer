import type { AnyAction } from "redux";

import type AnnoMatrix from "../annoMatrix/annoMatrix";
import type { RootState } from ".";
import type { Genesets } from "./genesets";

export interface AutosaveState {
  obsAnnotationSaveInProgress: boolean;
  lastSavedAnnoMatrix: AnnoMatrix | null;
  genesetSaveInProgress: boolean;
  lastSavedGenesets: Genesets | null;
  error: string | false;
}

const initialState: AutosaveState = {
  obsAnnotationSaveInProgress: false,
  lastSavedAnnoMatrix: null,
  genesetSaveInProgress: false,
  lastSavedGenesets: null,
  error: false,
};

const Autosave = (
  state: AutosaveState = initialState,
  action: AnyAction,
  nextSharedState?: RootState
): AutosaveState => {
  switch (action.type) {
    case "annoMatrix: init complete": {
      return {
        ...state,
        error: false,
        obsAnnotationSaveInProgress: false,
        lastSavedAnnoMatrix: action.annoMatrix ?? null,
      };
    }
    case "writable obs annotations - save started": {
      return {
        ...state,
        obsAnnotationSaveInProgress: true,
      };
    }
    case "writable obs annotations - save error": {
      return {
        ...state,
        obsAnnotationSaveInProgress: false,
        error: action.message ?? "Unknown error",
      };
    }
    case "writable obs annotations - save complete": {
      return {
        ...state,
        obsAnnotationSaveInProgress: false,
        error: false,
        lastSavedAnnoMatrix: action.lastSavedAnnoMatrix ?? null,
      };
    }
    case "geneset: initial load": {
      const sharedGenesets = nextSharedState?.genesets?.genesets ?? null;
      return {
        ...state,
        genesetSaveInProgress: false,
        lastSavedGenesets: sharedGenesets,
      };
    }
    case "autosave: genesets started": {
      return {
        ...state,
        genesetSaveInProgress: true,
      };
    }
    case "autosave: genesets error": {
      return {
        ...state,
        genesetSaveInProgress: false,
        error: action.message ?? "Unknown error",
      };
    }
    case "autosave: genesets complete": {
      return {
        ...state,
        genesetSaveInProgress: false,
        error: false,
        lastSavedGenesets: action.lastSavedGenesets ?? null,
      };
    }
    default:
      return state;
  }
};

export default Autosave;
