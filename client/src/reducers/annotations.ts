import type { AnyAction } from "redux";

export interface AnnotationsState {
  isEditingCategoryName: boolean;
  isEditingLabelName: boolean;
  isAddingNewLabel?: boolean;
  categoryBeingEdited: string | null;
  categoryAddingNewLabel: string | null;
  labelEditable: {
    category: string | null;
    label: number | null;
  };
}

const initialState: AnnotationsState = {
  isEditingCategoryName: false,
  isEditingLabelName: false,
  categoryBeingEdited: null,
  categoryAddingNewLabel: null,
  labelEditable: { category: null, label: null },
};

const Annotations = (
  state: AnnotationsState = initialState,
  action: AnyAction
): AnnotationsState => {
  switch (action.type) {
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
    case "initial data load start":
    case "reset": {
      return { ...initialState };
    }
    default:
      return state;
  }
};

export default Annotations;
