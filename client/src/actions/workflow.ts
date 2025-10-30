/**
 * Workflow actions for async reembedding and preprocessing
 * Replaces WebSocket-based approach with polling-based async workflows
 */

import { Action, ActionCreator } from "redux";
import { ThunkAction } from "redux-thunk";
import type { AppDispatch, GetState, RootState } from "../reducers";
import * as globals from "../globals";
import {
  postNetworkErrorToast,
  postAsyncSuccessToast,
  postAsyncFailureToast,
} from "../components/framework/toasters";
import { subsetAction } from "./viewStack";
// import { layoutChoiceAction } from "./embedding";
import {
  WorkflowSubmissionRequest,
  WorkflowSubmissionResponse,
  WorkflowStatusResponse,
  WorkflowAction,
  POLLING_INTERVAL_MS,
  POLLING_TIMEOUT_MS,
} from "../common/types/workflow";
import { ReembeddingParameters } from "../common/types/reembed";

// Submit workflow for async execution
export const submitWorkflow: ActionCreator<
  ThunkAction<Promise<void>, RootState, never, Action<string>>
> =
  (
    workflowType: "reembedding" | "preprocessing",
    reembedParams: ReembeddingParameters,
    parentName?: string,
    embName?: string,
    otherSelector?: number[]
  ) =>
  async (dispatch: AppDispatch, getState: GetState): Promise<void> => {
    try {
      // Ensure we have a proper subset first
      await dispatch(subsetAction());

      const state = getState();
      const cells = state.annoMatrix.rowIndex.labels();
      const cellsArray = Array.isArray(cells) ? cells : Array.from(cells);

      // Prepare workflow submission request
      const request: WorkflowSubmissionRequest = {
        workflowType,
        parameters: {
          filter: { obs: { index: cellsArray } },
          params: reembedParams,
          parentName: parentName || state.layoutChoice.current,
          embName: embName || `${workflowType}_${Date.now()}`,
          otherSelector,
        },
        metadata: {
          sessionId: `session_${Date.now()}`,
          // Add user ID and dataset ID if available from state
        },
      };

      // Submit workflow
      const response = await fetch(
        `${globals.API?.prefix || ""}${
          globals.API?.version || ""
        }workflows/submit`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Workflow submission failed: ${response.status} ${response.statusText}`
        );
      }

      const data: WorkflowSubmissionResponse = await response.json();

      // Dispatch success action
      dispatch({
        type: "workflow: submission success",
        workflowId: data.workflowId,
        response: { ...data, workflowType, embName },
      } as WorkflowAction);

      // Start polling for workflow status
      dispatch(startPollingWorkflow(data.workflowId, workflowType, embName));

      postAsyncSuccessToast(
        `${
          workflowType === "reembedding" ? "Reembedding" : "Preprocessing"
        } workflow submitted. ` +
          `Estimated completion: ${Math.round(
            data.estimatedDurationMinutes || 2
          )} minutes.`
      );
    } catch (error: any) {
      dispatch({
        type: "workflow: submission failed",
        error: error.message,
      } as WorkflowAction);

      postNetworkErrorToast(
        `${workflowType} workflow submission failed: ${error.message}`
      );
      console.error("Workflow submission error:", error);
    }
  };

// Start polling for workflow status
export const startPollingWorkflow: ActionCreator<
  ThunkAction<void, RootState, never, Action<string>>
> =
  (workflowId: string, workflowType?: string, embName?: string) =>
  async (dispatch: AppDispatch, getState: GetState): Promise<void> => {
    const startTime = Date.now();

    dispatch({
      type: "workflow: start polling",
      workflowId,
    } as WorkflowAction);

    const pollStatus = async () => {
      try {
        const response = await fetch(
          `${globals.API?.prefix || ""}${
            globals.API?.version || ""
          }workflows/status?workflow_id=${workflowId}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(
            `Status request failed: ${response.status} ${response.statusText}`
          );
        }

        const data: WorkflowStatusResponse = await response.json();

        // Update workflow status
        dispatch({
          type: "workflow: status update",
          workflowId,
          status: data.status,
        } as WorkflowAction);

        // Check if workflow completed
        if (data.status.phase === "Succeeded") {
          dispatch({
            type: "workflow: completed",
            workflowId,
            result: data.result,
          } as WorkflowAction);

          dispatch(stopPollingWorkflow());

          // Handle completion based on workflow type
          if (workflowType === "reembedding" && data.result && embName) {
            await dispatch(handleReembeddingComplete(embName, data.result));
          }

          postAsyncSuccessToast(
            `${workflowType || "Workflow"} completed successfully!`
          );
        } else if (
          data.status.phase === "Failed" ||
          data.status.phase === "Error"
        ) {
          dispatch({
            type: "workflow: failed",
            workflowId,
            error: data.status.message || "Workflow failed",
          } as WorkflowAction);

          dispatch(stopPollingWorkflow());
          postAsyncFailureToast(
            `${workflowType || "Workflow"} failed: ${
              data.status.message || "Unknown error"
            }`
          );
        } else if (data.status.phase === "Running") {
          // Continue polling - workflow is still running
          const { progress } = data.status;
          if (progress) {
            // Could show progress toast or update UI
            console.log(
              `Workflow ${workflowId} progress: ${progress.percentage}% (Running)`
            );
          }
        }
      } catch (error: any) {
        console.error("Polling error:", error);

        const state = getState();
        const { retryCount } = state.workflowPolling;

        dispatch({
          type: "workflow: polling error",
          error: error.message,
        } as WorkflowAction);

        // Stop polling after max retries or timeout
        if (
          retryCount >= state.workflowPolling.maxRetries ||
          Date.now() - startTime > POLLING_TIMEOUT_MS
        ) {
          dispatch(stopPollingWorkflow());
          postAsyncFailureToast(
            "Workflow polling failed. Please check workflow status manually."
          );
        }
      }
    };

    // Start polling immediately, then at intervals
    await pollStatus();
    const intervalId = setInterval(pollStatus, POLLING_INTERVAL_MS);

    // Store interval ID in Redux for cleanup
    dispatch({
      type: "workflow: store interval",
      intervalId: intervalId as NodeJS.Timeout,
    } as WorkflowAction);
  };

// Stop polling workflow
export const stopPollingWorkflow: ActionCreator<
  Action<"workflow: stop polling">
> = () => ({
  type: "workflow: stop polling",
});

// Handle reembedding workflow completion
export const handleReembeddingComplete: ActionCreator<
  ThunkAction<Promise<void>, RootState, never, Action<string>>
> = (embName: string, result: any) => async (dispatch: AppDispatch): Promise<void> => {
  try {
    // Add the new embedding to the available list and switch to it
    if (result.layoutSchema && embName) {
      console.log(`Reembedding completed: ${embName}`, result);
      console.log(`Dispatching reembed: add reembedding action for: ${embName}`);
      
      // Dispatch action to add the new embedding to the layout choice
      dispatch({
        type: "reembed: add reembedding",
        name: embName,
        schema: result.layoutSchema,
      });
      
      console.log(`Action dispatched for embedding: ${embName}`);
    } else {
      console.warn(`Missing layoutSchema or embName:`, { embName, result });
    }
  } catch (error: any) {
    console.error("Error handling reembedding completion:", error);
    postNetworkErrorToast(`Failed to load new embedding: ${error.message}`);
  }
};

// Convenience actions for specific workflow types
export const requestReembed: ActionCreator<
  ThunkAction<Promise<void>, RootState, never, Action<string>>
> =
  (
    reembedParams: ReembeddingParameters,
    parentName: string,
    embName: string,
    otherSelector?: number[]
  ) =>
  async (dispatch: AppDispatch): Promise<void> =>
    dispatch(
      submitWorkflow(
        "reembedding",
        reembedParams,
        parentName,
        embName,
        otherSelector
      )
    );

export const requestPreprocessing: ActionCreator<
  ThunkAction<Promise<void>, RootState, never, Action<string>>
> =
  (reembedParams: ReembeddingParameters) =>
  async (dispatch: AppDispatch): Promise<void> =>
    dispatch(submitWorkflow("preprocessing", reembedParams));
