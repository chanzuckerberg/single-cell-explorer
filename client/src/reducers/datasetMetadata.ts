/*
 Dataset metadata reducer, modifies Portal collections-related state. 
 */

// Core dependencies
import { Action } from "redux";

// App dependencies
import { DatasetMetadata as IDatasetMetadata } from "../common/types/entities";

/*
 Action dispatched on successful response from dataset-metadata endpoint.
 */
export interface DatasetMetdataAction extends Action<string> {
  datasetMetadata: IDatasetMetadata;
  error: string;
  portalUrl: string;
}

/*
 Dataset metdata state; selected dataset ID and corresponding collection information.
 */
export interface DatasetMetadataState {
  datasetMetadata: IDatasetMetadata | null;
  error: string | null;
  loading: boolean;
  portalUrl: string | null;
}

const DatasetMetadata = (
  state: DatasetMetadataState = {
    // data loading flag
    loading: true,
    error: null,

    datasetMetadata: null,
    portalUrl: null,
  },
  action: DatasetMetdataAction
): DatasetMetadataState => {
  switch (action.type) {
    case "initial data load start":
      return {
        ...state,
        loading: true,
        error: null,
      };
    case "dataset metadata load complete":
      return {
        ...state,
        loading: false,
        error: null,
        datasetMetadata: action.datasetMetadata,
        portalUrl: action.portalUrl,
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

export default DatasetMetadata;
