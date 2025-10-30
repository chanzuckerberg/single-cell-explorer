/**
 * Reembedding reducers with TypeScript
 * Converted from excellxgene/client/src/reducers/reembed.js
 */

import {
  ReembeddingController,
  PreprocessingController,
  ReembeddingParameters,
  ReembeddingAction,
  PreprocessingAction,
  DEFAULT_REEMBEDDING_PARAMS,
  DEFAULT_PREPROCESSING_PARAMS,
} from "../common/types/reembed";
import {
  PollingState,
  WorkflowAction,
  WorkflowStatus,
  DEFAULT_POLLING_STATE,
} from "../common/types/workflow";

// Reembedding controller state (not part of undo/redo history)
export const reembedController = (
  state: ReembeddingController = { pendingFetch: null },
  action: ReembeddingAction
): ReembeddingController => {
  switch (action.type) {
    case "reembed: request start":
      return {
        ...state,
        pendingFetch: true,
      };
    case "reembed: request aborted":
    case "reembed: request cancel":
    case "reembed: request completed":
      return {
        ...state,
        pendingFetch: null,
      };
    default:
      return state;
  }
};

// Preprocessing controller state (not part of undo/redo history)
export const preprocessController = (
  state: PreprocessingController = { pendingFetch: null },
  action: PreprocessingAction
): PreprocessingController => {
  switch (action.type) {
    case "preprocess: request start":
      return {
        ...state,
        pendingFetch: true,
      };
    case "preprocess: request aborted":
    case "preprocess: request cancel":
    case "preprocess: request completed":
      return {
        ...state,
        pendingFetch: null,
      };
    default:
      return state;
  }
};

// Reembedding parameters state
// Workflow polling state (not part of undo/redo history)
export const workflowPolling = (
  state: PollingState & { 
    reembeddingWorkflow?: { 
      workflowId: string; 
      status: WorkflowStatus; 
      embName: string; 
    } | null;
    preprocessingWorkflow?: { 
      workflowId: string; 
      status: WorkflowStatus; 
    } | null;
  } = { 
    ...DEFAULT_POLLING_STATE, 
    reembeddingWorkflow: null,
    preprocessingWorkflow: null 
  },
  action: WorkflowAction | ReembeddingAction | PreprocessingAction
): typeof state => {
  switch (action.type) {
    case "workflow: submission success":
      const workflowType = action.response ? 
        (action.response as any).workflowType || "reembedding" : 
        "reembedding";
      
      if (workflowType === "reembedding") {
        return {
          ...state,
          reembeddingWorkflow: {
            workflowId: action.workflowId,
            status: action.response.status,
            embName: (action.response as any).embName || "unknown_embedding"
          }
        };
      } else {
        return {
          ...state,
          preprocessingWorkflow: {
            workflowId: action.workflowId,
            status: action.response.status,
          }
        };
      }
      
    case "workflow: start polling":
      return {
        ...state,
        isPolling: true,
        workflowId: action.workflowId,
        lastPolled: new Date().toISOString(),
        retryCount: 0,
      };
      
    case "workflow: store interval":
      return {
        ...state,
        intervalId: action.intervalId,
      };
      
    case "workflow: stop polling":
      // Clear interval if it exists
      if (state.intervalId) {
        clearInterval(state.intervalId);
      }
      return {
        ...state,
        isPolling: false,
        workflowId: null,
        intervalId: null,
        retryCount: 0,
      };
      
    case "workflow: status update":
      return {
        ...state,
        lastPolled: new Date().toISOString(),
        retryCount: 0, // Reset retry count on successful poll
        reembeddingWorkflow: state.reembeddingWorkflow?.workflowId === action.workflowId ? {
          ...state.reembeddingWorkflow,
          status: action.status
        } : state.reembeddingWorkflow,
        preprocessingWorkflow: state.preprocessingWorkflow?.workflowId === action.workflowId ? {
          ...state.preprocessingWorkflow,
          status: action.status
        } : state.preprocessingWorkflow,
      };
      
    case "workflow: completed":
    case "workflow: failed":
    case "workflow: cancelled":
      // Clear interval if it exists
      if (state.intervalId) {
        clearInterval(state.intervalId);
      }
      return {
        ...state,
        isPolling: false,
        intervalId: null,
      };
      
    case "workflow: polling error":
      return {
        ...state,
        retryCount: state.retryCount + 1,
        lastPolled: new Date().toISOString(),
      };
      
    default:
      return state;
  }
};

export const reembedParameters = (
  state: ReembeddingParameters = DEFAULT_REEMBEDDING_PARAMS,
  action: ReembeddingAction
): ReembeddingParameters => {
  switch (action.type) {
    case "reembed: load": {
      const { dataLayerExpr: layerExpr, logScaleExpr: logExpr, scaleExpr: scExpr } = state;
      const { params } = action;
      
      // Extract these specific parameters and preserve them
      const { dataLayerExpr, logScaleExpr, scaleExpr, ...newParams } = params;
      
      return {
        ...state,
        ...newParams,
        dataLayerExpr: layerExpr,
        logScaleExpr: logExpr,
        scaleExpr: scExpr,
      };
    }
    
    case "reembed: set parameter": {
      const { batchPrepParams, batchPrepKey, batchPrepLabel } = state;
      const { key, value } = action;
      
      // Handle batch preparation parameter logic
      if (key === "doBatchPrep" && !value) {
        return {
          ...state,
          batchPrepParams: {},
          [key]: value,
          batchPrepKey: "",
          batchPrepLabel: "",
        };
      }
      
      if (key === "batchPrepKey" && value !== "") {
        // Create new param dict for batch key
        const newBatchPrepParams = { ...batchPrepParams };
        newBatchPrepParams[value] = {};
        
        return {
          ...state,
          [key]: value,
          batchPrepParams: newBatchPrepParams,
        };
      }
      
      if (key === "batchPrepLabel" && value !== "") {
        const newBatchPrepParams = { ...batchPrepParams };
        const valueStr = value.toString();
        
        if (valueStr in newBatchPrepParams[batchPrepKey]) {
          newBatchPrepParams[batchPrepKey][valueStr] = {
            ...newBatchPrepParams[batchPrepKey][valueStr],
            batchPrepKey,
            doBatchPrep: true,
            batchPrepLabel: valueStr,
          };
        } else {
          newBatchPrepParams[batchPrepKey][valueStr] = {
            ...DEFAULT_PREPROCESSING_PARAMS,
            batchPrepKey,
            doBatchPrep: true,
            batchPrepLabel: valueStr,
          };
        }
        
        return {
          ...state,
          [key]: valueStr,
          batchPrepParams: newBatchPrepParams,
        };
      }
      
      // Handle other preprocessing parameters when batch prep is active
      if (
        key !== "batchPrepLabel" && 
        key !== "batchPrepKey" && 
        key in DEFAULT_PREPROCESSING_PARAMS && 
        batchPrepLabel !== ""
      ) {
        const newBatchPrepParams = { ...batchPrepParams };
        newBatchPrepParams[batchPrepKey][batchPrepLabel] = {
          ...newBatchPrepParams[batchPrepKey][batchPrepLabel],
          [key]: value,
        };
        
        return {
          ...state,
          batchPrepParams: newBatchPrepParams,
        };
      }
      
      // Handle batch parameter reset
      if (key === "doBatch" && !value) {
        return {
          ...state,
          [key]: value,
          batchKey: "",
        };
      }
      
      // Default parameter update
      return {
        ...state,
        [key]: value,
      };
    }
    
    case "reembed: set parameters": {
      const { params } = action;
      return {
        ...state,
        ...params,
      };
    }
    
    default:
      return state;
  }
};