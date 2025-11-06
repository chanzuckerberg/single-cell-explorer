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
    case "@@undoable/undo":
    case "@@undoable/redo":
    case "@@undoable/revert-to-action": {
      // When undoing/redoing, keep autosave state unchanged so that
      // autosave can detect differences and sync with backend.
      // Do NOT update lastSaved* - this allows autosave to see that
      // current state differs from the last saved checkpoint.
      return {
        ...state,
        obsAnnotationSaveInProgress: false,
        genesetSaveInProgress: false,
      };
    }
    default:
      return state;
  }
};

export default Autosave;
