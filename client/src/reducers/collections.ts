/*
 Collections reducer, modifies Portal collections-related state. 
 */

// Core dependencies
import { Action } from "redux";

// App dependencies
import { Collection } from "../common/types/entities";

/*
 Action dispatched on successful response from Portal collections endpoint.
 */
export interface CollectionAction extends Action<string> {
  collection: Collection;
  error: string;
  selectedDatasetId: string;
}

/*
 Collections state; selected dataset ID and corresponding collection information.
 */
export interface CollectionState {
  collection: Collection | null;
  error: string | null;
  loading: boolean;
  selectedDatasetId: string | null;
}

/*
 Shape of response from Portal meta endpoint.
 */
export interface MetaPayload {
  collection_id: string;
  dataset_id: string;
}

const Collections = (
  state: CollectionState = {
    // data loading flag
    loading: true,
    error: null,

    collection: null,
    selectedDatasetId: null,
  },
  action: CollectionAction
): CollectionState => {
  switch (action.type) {
    case "initial data load start":
      return {
        ...state,
        loading: true,
        error: null,
      };
    case "collection load complete":
      return {
        ...state,
        loading: false,
        error: null,
        collection: action.collection,
        selectedDatasetId: action.selectedDatasetId,
      };
    case "initial data load error":
      return {
        ...state,
        error: action.error,
      };
    default:
      return state;
  }
};

export default Collections;
