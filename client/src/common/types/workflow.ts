/**
 * TypeScript interfaces for async workflow operations
 * Based on Argo Workflows API patterns
 */

// Workflow Status Types
export type WorkflowPhase = 
  | "Pending" 
  | "Running" 
  | "Succeeded" 
  | "Failed" 
  | "Error" 
  | "Cancelled";

export interface WorkflowStatus {
  phase: WorkflowPhase;
  startedAt?: string;
  finishedAt?: string;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
  message?: string;
  nodes?: Record<string, WorkflowNodeStatus>;
}

export interface WorkflowNodeStatus {
  id: string;
  name: string;
  displayName: string;
  type: string;
  phase: WorkflowPhase;
  startedAt?: string;
  finishedAt?: string;
  message?: string;
  progress?: string;
}

// Workflow Request/Response Types
export interface WorkflowSubmissionRequest {
  workflowType: "reembedding" | "preprocessing";
  parameters: {
    filter: {
      obs: {
        index: number[];
      };
    };
    params: any; // Reembedding or preprocessing parameters
    parentName?: string;
    embName?: string;
    otherSelector?: number[];
  };
  metadata?: {
    userId?: string;
    datasetId?: string;
    sessionId?: string;
  };
}

export interface WorkflowSubmissionResponse {
  workflowId: string;
  status: WorkflowStatus;
  createdAt: string;
  estimatedDurationMinutes?: number;
}

export interface WorkflowStatusResponse {
  workflowId: string;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
  result?: {
    layoutSchema?: any;
    schema?: any;
    embeddingData?: any;
  };
}

// Frontend Polling State
export interface PollingState {
  isPolling: boolean;
  workflowId: string | null;
  lastPolled: string | null;
  intervalId: NodeJS.Timeout | null;
  retryCount: number;
  maxRetries: number;
}

// Redux Action Types for Workflow Operations
export type WorkflowActionType =
  | "workflow: submit"
  | "workflow: submission success"  
  | "workflow: submission failed"
  | "workflow: status update"
  | "workflow: completed"
  | "workflow: failed"
  | "workflow: cancelled"
  | "workflow: start polling"
  | "workflow: store interval"
  | "workflow: stop polling"
  | "workflow: polling error";

// Redux Actions
export interface WorkflowSubmitAction {
  type: "workflow: submit";
  workflowType: "reembedding" | "preprocessing";
  request: WorkflowSubmissionRequest;
}

export interface WorkflowSubmissionSuccessAction {
  type: "workflow: submission success";
  workflowId: string;
  response: WorkflowSubmissionResponse;
}

export interface WorkflowSubmissionFailedAction {
  type: "workflow: submission failed";
  error: string;
}

export interface WorkflowStatusUpdateAction {
  type: "workflow: status update";
  workflowId: string;
  status: WorkflowStatus;
}

export interface WorkflowCompletedAction {
  type: "workflow: completed";
  workflowId: string;
  result: WorkflowStatusResponse["result"];
}

export interface WorkflowFailedAction {
  type: "workflow: failed";
  workflowId: string;
  error: string;
}

export interface WorkflowCancelledAction {
  type: "workflow: cancelled";
  workflowId: string;
}

export interface WorkflowStartPollingAction {
  type: "workflow: start polling";
  workflowId: string;
}

export interface WorkflowStopPollingAction {
  type: "workflow: stop polling";
}

export interface WorkflowStoreIntervalAction {
  type: "workflow: store interval";
  intervalId: NodeJS.Timeout;
}

export interface WorkflowPollingErrorAction {
  type: "workflow: polling error";
  error: string;
}

export type WorkflowAction =
  | WorkflowSubmitAction
  | WorkflowSubmissionSuccessAction
  | WorkflowSubmissionFailedAction
  | WorkflowStatusUpdateAction
  | WorkflowCompletedAction
  | WorkflowFailedAction
  | WorkflowCancelledAction
  | WorkflowStartPollingAction
  | WorkflowStopPollingAction
  | WorkflowStoreIntervalAction
  | WorkflowPollingErrorAction;

// Default Values
export const DEFAULT_POLLING_STATE: PollingState = {
  isPolling: false,
  workflowId: null,
  lastPolled: null,
  intervalId: null,
  retryCount: 0,
  maxRetries: 10,
};

export const POLLING_INTERVAL_MS = 2000; // Poll every 2 seconds
export const POLLING_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes max