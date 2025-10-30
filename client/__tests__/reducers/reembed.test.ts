/**
 * Unit tests for reembedding reducers
 */

import {
  reembedController,
  preprocessController,
  reembedParameters,
} from "../../src/reducers/reembed";
import {
  DEFAULT_REEMBEDDING_PARAMS,
  ReembeddingAction,
  PreprocessingAction,
  ReembeddingParameters,
} from "../../src/common/types/reembed";

describe("reembedController", () => {
  const initialState = { pendingFetch: null };

  test("should return initial state", () => {
    expect(reembedController(undefined, {} as ReembeddingAction)).toEqual(initialState);
  });

  test("should handle reembed request start", () => {
    const action: ReembeddingAction = {
      type: "reembed: request start",
    };
    
    expect(reembedController(initialState, action)).toEqual({
      pendingFetch: true,
    });
  });

  test("should handle reembed request completed", () => {
    const startingState = { pendingFetch: true };
    const action: ReembeddingAction = {
      type: "reembed: request completed",
    };
    
    expect(reembedController(startingState, action)).toEqual({
      pendingFetch: null,
    });
  });

  test("should handle reembed request aborted", () => {
    const startingState = { pendingFetch: true };
    const action: ReembeddingAction = {
      type: "reembed: request aborted",
    };
    
    expect(reembedController(startingState, action)).toEqual({
      pendingFetch: null,
    });
  });
});

describe("preprocessController", () => {
  const initialState = { pendingFetch: null };

  test("should return initial state", () => {
    expect(preprocessController(undefined, {} as PreprocessingAction)).toEqual(initialState);
  });

  test("should handle preprocess request start", () => {
    const action: PreprocessingAction = {
      type: "preprocess: request start",
    };
    
    expect(preprocessController(initialState, action)).toEqual({
      pendingFetch: true,
    });
  });

  test("should handle preprocess request completed", () => {
    const startingState = { pendingFetch: true };
    const action: PreprocessingAction = {
      type: "preprocess: request completed",
    };
    
    expect(preprocessController(startingState, action)).toEqual({
      pendingFetch: null,
    });
  });
});

describe("reembedParameters", () => {
  test("should return initial state", () => {
    expect(reembedParameters(undefined, {} as ReembeddingAction)).toEqual(DEFAULT_REEMBEDDING_PARAMS);
  });

  test("should handle set parameter action", () => {
    const action: ReembeddingAction = {
      type: "reembed: set parameter",
      key: "numPCs",
      value: 30,
    };
    
    const result = reembedParameters(DEFAULT_REEMBEDDING_PARAMS, action);
    expect(result.numPCs).toBe(30);
    expect(result.minCountsCF).toBe(DEFAULT_REEMBEDDING_PARAMS.minCountsCF); // Other params unchanged
  });

  test("should handle set parameters action", () => {
    const newParams: Partial<ReembeddingParameters> = {
      numPCs: 40,
      umapMinDist: 0.2,
      neighborsKnn: 30,
    };
    
    const action: ReembeddingAction = {
      type: "reembed: set parameters",
      params: newParams,
    };
    
    const result = reembedParameters(DEFAULT_REEMBEDDING_PARAMS, action);
    expect(result.numPCs).toBe(40);
    expect(result.umapMinDist).toBe(0.2);
    expect(result.neighborsKnn).toBe(30);
    expect(result.minCountsCF).toBe(DEFAULT_REEMBEDDING_PARAMS.minCountsCF); // Unchanged params preserved
  });

  test("should handle doBatch parameter change", () => {
    const initialState = { ...DEFAULT_REEMBEDDING_PARAMS, batchKey: "some_key" };
    
    const action: ReembeddingAction = {
      type: "reembed: set parameter",
      key: "doBatch",
      value: false,
    };
    
    const result = reembedParameters(initialState, action);
    expect(result.doBatch).toBe(false);
    expect(result.batchKey).toBe(""); // Should reset batch key when disabling
  });

  test("should handle doBatchPrep parameter change", () => {
    const initialState = { 
      ...DEFAULT_REEMBEDDING_PARAMS, 
      batchPrepKey: "some_key",
      batchPrepLabel: "some_label",
      batchPrepParams: { someKey: { someLabel: DEFAULT_REEMBEDDING_PARAMS } }
    };
    
    const action: ReembeddingAction = {
      type: "reembed: set parameter",
      key: "doBatchPrep",
      value: false,
    };
    
    const result = reembedParameters(initialState, action);
    expect(result.doBatchPrep).toBe(false);
    expect(result.batchPrepKey).toBe("");
    expect(result.batchPrepLabel).toBe("");
    expect(result.batchPrepParams).toEqual({});
  });

  test("should handle load action preserving certain parameters", () => {
    const currentState: ReembeddingParameters = {
      ...DEFAULT_REEMBEDDING_PARAMS,
      dataLayerExpr: "current_layer",
      logScaleExpr: true,
      scaleExpr: true,
    };

    const loadedParams: Partial<ReembeddingParameters> = {
      numPCs: 60,
      umapMinDist: 0.3,
      dataLayerExpr: "loaded_layer", // Should be ignored
      logScaleExpr: false, // Should be ignored
      scaleExpr: false, // Should be ignored
    };

    const action: ReembeddingAction = {
      type: "reembed: load",
      params: loadedParams,
    };

    const result = reembedParameters(currentState, action);
    expect(result.numPCs).toBe(60); // Loaded
    expect(result.umapMinDist).toBe(0.3); // Loaded
    expect(result.dataLayerExpr).toBe("current_layer"); // Preserved
    expect(result.logScaleExpr).toBe(true); // Preserved
    expect(result.scaleExpr).toBe(true); // Preserved
  });
});