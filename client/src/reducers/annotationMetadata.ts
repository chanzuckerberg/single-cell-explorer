// Annotation metadata interface for tracking annotation operations
import type { AnyAction } from "redux";

export interface AnnotationMetadata {
  lastRenameOp?: {
    oldName: string;
    newName: string;
  };
}

const initialState: AnnotationMetadata = {};

const annotationMetadataReducer = (
  state: AnnotationMetadata = initialState,
  action: AnyAction
): AnnotationMetadata => {
  // Track rename operations so autosave can clean them up after undo
  if (action.__isRename) {
    return {
      lastRenameOp: {
        oldName: action.__renameFrom,
        newName: action.__renameTo,
      },
    };
  }

  // Clear rename metadata when autosave completes handling the inverse rename
  if (action.type === "annotation: clear rename metadata") {
    return {};
  }

  // Clear metadata on other annotation operations (create, delete, etc)
  // but NOT on undo/redo since metadata should persist across those
  if (
    action.type?.startsWith("annotation:") &&
    action.type !== "annotation: category edited"
  ) {
    return {};
  }

  return state;
};

export default annotationMetadataReducer;
