/**
 * Reembedding actions with TypeScript
 * Converted from excellxgene/client/src/actions/reembed.js to use async workflows
 * Uses polling-based async workflows instead of WebSocket connections
 */

import { Action, ActionCreator } from "redux";
import { ThunkAction } from "redux-thunk";
import type { AppDispatch, GetState, RootState } from "../reducers";
import { 
  postNetworkErrorToast,
  postAsyncFailureToast,
} from "../components/framework/toasters";
import {
  ReembeddingParameters,
  ReembeddingAction,
  PreprocessingAction,
} from "../common/types/reembed";
import { 
  submitWorkflow,
  handleReembeddingComplete as workflowHandleReembeddingComplete 
} from "./workflow";

// Legacy actions that are no longer needed with async workflows
// These are kept for backward compatibility if other parts of the codebase reference them

// Request reembedding action - now uses async workflow system
export const requestReembed: ActionCreator<
  ThunkAction<Promise<void>, RootState, never, Action<string>>
> = (
  reembedParams: ReembeddingParameters,
  parentName: string,
  embName: string,
  otherSelector?: number[]
) => 
async (dispatch: AppDispatch): Promise<void> => {
  try {
    // Use the new async workflow submission system
    await dispatch(submitWorkflow("reembedding", reembedParams, parentName, embName, otherSelector));
  } catch (error: any) {
    dispatch({
      type: "reembed: request aborted",
    } as ReembeddingAction);

    if (error.name === "AbortError") {
      postAsyncFailureToast("Re-embedding calculation was aborted.");
    } else {
      postNetworkErrorToast(`Re-embedding: ${error.message}`);
    }
    console.log("Reembed exception:", error, error.name, error.message);
  }
};

// Request preprocessing action - now uses async workflow system
export const requestPreprocessing: ActionCreator<
  ThunkAction<Promise<void>, RootState, never, Action<string>>
> = (reembedParams: ReembeddingParameters) =>
async (dispatch: AppDispatch): Promise<void> => {
  try {
    // Use the new async workflow submission system
    await dispatch(submitWorkflow("preprocessing", reembedParams));
  } catch (error: any) {
    dispatch({
      type: "preprocess: request aborted",
    } as PreprocessingAction);

    if (error.name === "AbortError") {
      postAsyncFailureToast("Preprocessing calculation was aborted.");
    } else {
      postNetworkErrorToast(`Preprocessing: ${error.message}`);
    }
    console.log("Preprocess exception:", error, error.name, error.message);
  }
};

// Load reembedding parameters
export const loadReembeddingParameters: ActionCreator<
  Action<"reembed: load">
> = (params: Partial<ReembeddingParameters>) => ({
  type: "reembed: load",
  params,
});

// Set single reembedding parameter
export const setReembeddingParameter: ActionCreator<
  Action<"reembed: set parameter">
> = (key: keyof ReembeddingParameters, value: any) => ({
  type: "reembed: set parameter",
  key,
  value,
});

// Set multiple reembedding parameters
export const setReembeddingParameters: ActionCreator<
  Action<"reembed: set parameters">
> = (params: Partial<ReembeddingParameters>) => ({
  type: "reembed: set parameters",
  params,
});

// Complete reembedding request
export const completeReembedding: ActionCreator<
  Action<"reembed: request completed">
> = () => ({
  type: "reembed: request completed",
});

// Complete preprocessing request  
export const completePreprocessing: ActionCreator<
  Action<"preprocess: request completed">
> = () => ({
  type: "preprocess: request completed",
});

// Cancel reembedding request
export const cancelReembedding: ActionCreator<
  Action<"reembed: request cancel">
> = () => ({
  type: "reembed: request cancel",
});

// Cancel preprocessing request
export const cancelPreprocessing: ActionCreator<
  Action<"preprocess: request cancel">
> = () => ({
  type: "preprocess: request cancel",
});

// Handle reembedding completion and switch to new embedding
// This is now a wrapper around the workflow-based completion handler
export const handleReembeddingComplete: ActionCreator<
  ThunkAction<Promise<void>, RootState, never, Action<string>>
> = (embName: string, data: any) =>
async (dispatch: AppDispatch): Promise<void> => {
  try {
    // Mark reembedding as completed
    dispatch({
      type: "reembed: request completed",
    } as ReembeddingAction);

    // Use the workflow-based completion handler
    await dispatch(workflowHandleReembeddingComplete(embName, data));

  } catch (error: any) {
    console.error("Error handling reembedding completion:", error);
    postNetworkErrorToast(`Failed to load new embedding: ${error.message}`);
  }
};