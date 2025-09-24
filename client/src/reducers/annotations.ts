import type { AnyAction } from "redux";

export interface AnnotationsState {
  dataCollectionNameIsReadOnly: boolean;
  dataCollectionName: string | null;
  isEditingCategoryName: boolean;
  isEditingLabelName: boolean;
  isAddingNewLabel?: boolean;
  categoryBeingEdited: string | null;
  categoryAddingNewLabel: string | null;
  labelEditable: {
    category: string | null;
    label: number | null;
  };
  promptForFilename: boolean;
}

const initialState: AnnotationsState = {
  dataCollectionNameIsReadOnly: true,
  dataCollectionName: null,
  isEditingCategoryName: false,
  isEditingLabelName: false,
  categoryBeingEdited: null,
  categoryAddingNewLabel: null,
  labelEditable: { category: null, label: null },
  promptForFilename: true,
};

const Annotations = (
  state: AnnotationsState = initialState,
  action: AnyAction
): AnnotationsState => {
  switch (action.type) {
    case "configuration load complete": {
      const dataCollectionName =
        action.config?.parameters?.["annotations-data-collection-name"] ?? null;
      const dataCollectionNameIsReadOnly =
        (action.config?.parameters?.[
          "annotations-data-collection-is-read-only"
        ] ??
          false) &&
        (action.config?.parameters?.annotations_genesets_name_is_read_only ??
          true);
      const promptForFilename =
        action.config?.parameters?.user_annotation_collection_name_enabled ??
        false;
      return {
        ...state,
        dataCollectionNameIsReadOnly,
        dataCollectionName,
        promptForFilename,
      };
    }
    case "set annotations collection name": {
      if (state.dataCollectionNameIsReadOnly) {
        throw new Error("data collection name is read only");
      }
      return {
        ...state,
        dataCollectionName: action.data,
      };
    }
    case "annotation: activate add new label mode": {
      return {
        ...state,
        isAddingNewLabel: true,
        categoryAddingNewLabel: action.data,
      };
    }
    case "annotation: disable add new label mode": {
      return {
        ...state,
        isAddingNewLabel: false,
        categoryAddingNewLabel: null,
      };
    }
    case "annotation: activate category edit mode": {
      return {
        ...state,
        isEditingCategoryName: true,
        categoryBeingEdited: action.data,
      };
    }
    case "annotation: disable category edit mode": {
      return {
        ...state,
        isEditingCategoryName: false,
        categoryBeingEdited: null,
      };
    }
    case "annotation: activate edit label mode": {
      return {
        ...state,
        isEditingLabelName: true,
        labelEditable: {
          category: action.metadataField,
          label: action.categoryIndex,
        },
      };
    }
    case "annotation: cancel edit label mode": {
      return {
        ...state,
        isEditingLabelName: false,
        labelEditable: { category: null, label: null },
      };
    }
    default:
      return state;
  }
};

export default Annotations;
