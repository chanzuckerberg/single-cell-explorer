/**
 * TypeScript interfaces for reembedding functionality
 * Based on excellxgene reembedding feature
 */

// Preprocessing Parameters
export interface PreprocessingParameters {
  doPreprocess: boolean;
  minCountsCF: number;
  minGenesCF: number;
  minCellsGF: number;
  maxCellsGF: number;
  minCountsGF: number;
  nTopGenesHVG: number;
  nBinsHVG: number;
  doBatchPrep: boolean;
  batchPrepKey: string;
  batchPrepLabel: string;
  dataLayer: string;
  logTransform: boolean;
  sumNormalizeCells: boolean;
}

// Batch Correction Parameters
export interface BatchParameters {
  doBatch: boolean;
  batchMethod: "Scanorama" | "BBKNN";
  batchKey: string;
  scanoramaKnn: number;
  scanoramaSigma: number;
  scanoramaAlpha: number;
  scanoramaBatchSize: number;
  bbknnNeighborsWithinBatch: number;
}

// Dimensionality Reduction Parameters
export interface DimensionalityReductionParameters {
  numPCs: number;
  kernelPca: boolean;
  cellScaler: number;
  knnCross: number;
  geneScaler: number;
  pcaSolver: "randomized" | "full" | "arpack";
  neighborsKnn: number;
  neighborsMethod: "umap" | "gauss";
  distanceMetric: "cosine" | "euclidean" | "manhattan";
  doSAM: boolean;
  samHVG: boolean;
  jointHVG: boolean;
  nnaSAM: number;
  scaleData: boolean;
  weightModeSAM: "rms" | "uniform";
  umapMinDist: number;
  dataLayerExpr: string;
  logScaleExpr: boolean;
  scaleExpr: boolean;
  embeddingMode: "Preprocess and run" | "Run UMAP" | "Skip";
  dsampleKey: "None" | string;
  latentSpace: string;
  calculateSamWeights: boolean;
}

// Complete Reembedding Parameters
export interface ReembeddingParameters extends 
  PreprocessingParameters, 
  BatchParameters, 
  DimensionalityReductionParameters {
  batchPrepParams: Record<string, Record<string, PreprocessingParameters>>;
}

// Controller States
export interface ReembeddingController {
  pendingFetch: boolean | null;
}

export interface PreprocessingController {
  pendingFetch: boolean | null;
}

// WebSocket Message Types
export interface ReembeddingWebSocketMessage {
  method: string;
  filter: {
    obs: {
      index: number[] | ArrayLike<number>;
    };
  };
  params: ReembeddingParameters;
  parentName: string;
  currentLayout: string;
  embName: string;
  otherSelector?: number[];
}

export interface PreprocessingWebSocketMessage {
  params: ReembeddingParameters;
  filter: {
    obs: {
      index: number[] | ArrayLike<number>;
    };
  };
}

// API Request/Response Types
export interface ReembeddingApiRequest {
  method: "umap";
  filter: {
    obs: {
      index: number[];
    };
  };
  params: ReembeddingParameters;
  parentName: string;
  embName: string;
}

export interface ReembeddingApiResponse {
  layoutSchema: any;
  schema: any;
}

export interface PreprocessingApiRequest {
  params: ReembeddingParameters;
  filter: {
    obs: {
      index: number[];
    };
  };
}

export interface PreprocessingApiResponse {
  schema: any;
}

// Redux Action Types
export type ReembeddingActionType =
  | "reembed: request start"
  | "reembed: request aborted"
  | "reembed: request cancel"
  | "reembed: request completed"
  | "reembed: load"
  | "reembed: set parameter"
  | "reembed: set parameters";

export type PreprocessingActionType =
  | "preprocess: request start"
  | "preprocess: request aborted" 
  | "preprocess: request cancel"
  | "preprocess: request completed";

// Redux Action Interfaces
export interface ReembeddingRequestStartAction {
  type: "reembed: request start";
  abortableFetch?: any;
}

export interface ReembeddingRequestAbortedAction {
  type: "reembed: request aborted";
}

export interface ReembeddingRequestCancelAction {
  type: "reembed: request cancel";
}

export interface ReembeddingRequestCompletedAction {
  type: "reembed: request completed";
}

export interface ReembeddingLoadAction {
  type: "reembed: load";
  params: Partial<ReembeddingParameters>;
}

export interface ReembeddingSetParameterAction {
  type: "reembed: set parameter";
  key: keyof ReembeddingParameters;
  value: any;
}

export interface ReembeddingSetParametersAction {
  type: "reembed: set parameters";
  params: Partial<ReembeddingParameters>;
}

export interface PreprocessingRequestStartAction {
  type: "preprocess: request start";
  abortableFetch?: any;
}

export interface PreprocessingRequestAbortedAction {
  type: "preprocess: request aborted";
}

export interface PreprocessingRequestCancelAction {
  type: "preprocess: request cancel";
}

export interface PreprocessingRequestCompletedAction {
  type: "preprocess: request completed";
}

export type ReembeddingAction =
  | ReembeddingRequestStartAction
  | ReembeddingRequestAbortedAction
  | ReembeddingRequestCancelAction
  | ReembeddingRequestCompletedAction
  | ReembeddingLoadAction
  | ReembeddingSetParameterAction
  | ReembeddingSetParametersAction;

export type PreprocessingAction =
  | PreprocessingRequestStartAction
  | PreprocessingRequestAbortedAction
  | PreprocessingRequestCancelAction
  | PreprocessingRequestCompletedAction;

// Component Props Types
export interface ReembeddingDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface PreprocessingPanelProps {
  idhash: string | null;
}

export interface DimensionalityReductionPanelProps {
  embName: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  idhash: string | null;
}

export interface DefaultsIOProps {
  dispatch: any;
}

// Utility Types
export interface AbortableFetch {
  abort: () => void;
  isAborted: () => boolean;
  ready: () => Promise<Response>;
}

// Default Parameters
export const DEFAULT_PREPROCESSING_PARAMS: PreprocessingParameters = {
  doPreprocess: false,
  minCountsCF: 0,
  minGenesCF: 0,
  minCellsGF: 0,
  maxCellsGF: 100,
  minCountsGF: 0,
  nTopGenesHVG: 3000,
  nBinsHVG: 20,
  doBatchPrep: false,
  batchPrepKey: "",
  batchPrepLabel: "",
  dataLayer: "X",
  logTransform: false,
  sumNormalizeCells: false,
};

export const DEFAULT_BATCH_PARAMS: BatchParameters = {
  doBatch: false,
  batchMethod: "Scanorama",
  batchKey: "",
  scanoramaKnn: 20,
  scanoramaSigma: 15,
  scanoramaAlpha: 0.1,
  scanoramaBatchSize: 5000,
  bbknnNeighborsWithinBatch: 3,
};

export const DEFAULT_DIMRED_PARAMS: DimensionalityReductionParameters = {
  numPCs: 50,
  kernelPca: false,
  cellScaler: 1.0,
  knnCross: 40,
  geneScaler: 1.0,
  pcaSolver: "randomized",
  neighborsKnn: 20,
  neighborsMethod: "umap",
  distanceMetric: "cosine",
  doSAM: false,
  samHVG: false,
  jointHVG: true,
  nnaSAM: 50,
  scaleData: false,
  weightModeSAM: "rms",
  umapMinDist: 0.1,
  dataLayerExpr: "X",
  logScaleExpr: false,
  scaleExpr: false,
  embeddingMode: "Preprocess and run",
  dsampleKey: "None",
  latentSpace: "",
  calculateSamWeights: false,
};

export const DEFAULT_REEMBEDDING_PARAMS: ReembeddingParameters = {
  ...DEFAULT_PREPROCESSING_PARAMS,
  ...DEFAULT_BATCH_PARAMS,
  ...DEFAULT_DIMRED_PARAMS,
  batchPrepParams: {},
};