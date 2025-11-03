import { deflate } from "pako";

import type { ThunkAction } from "redux-thunk";
import type { AnyAction } from "redux";

import * as globals from "~/globals";
import { MatrixFBS, AnnotationsHelpers } from "../util/stateManager";
import type AnnoMatrix from "../annoMatrix/annoMatrix";
import type { RootState, AppDispatch, GetState } from "../reducers";
import type { Genesets } from "../reducers/genesets";
import {
  AnnotationColumnSchema,
  Category,
  Field,
} from "../common/types/schema";
import { AnyArray } from "../common/types/arraytypes";

type ThunkResult<R = void> = ThunkAction<R, RootState, never, AnyAction>;

type ColumnValueCtor = new (length: number) => AnyArray;

const { isUserAnnotation } = AnnotationsHelpers;

/**
 * Helper function to call annotation backend operations with consistent error handling.
 * Logs errors but doesn't revert local state, allowing optimistic UI updates.
 */
async function callAnnotationBackendOperation(
  url: string,
  options: RequestInit,
  operationName: string
): Promise<void> {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: "include",
    });

    if (!response.ok) {
      // TODO: Surface error to user once we have design input on how to display it
      console.error(
        `Failed to ${operationName} on backend: ${response.status} - ${response.statusText}`
      );
    }
  } catch (error) {
    // TODO: Surface error to user once we have design input on how to display it
    console.error(`Failed to ${operationName} on backend:`, error);
  }
}

export const annotationCreateCategoryAction =
  (newCategoryName: string, categoryToDuplicate?: string | null): ThunkResult =>
  async (dispatch: AppDispatch, getState: GetState) => {
    const state = getState();
    const { annoMatrix: prevAnnoMatrix, obsCrossfilter: prevObsCrossfilter } =
      state;
    if (!prevAnnoMatrix || !prevObsCrossfilter) return;

    const trimmedName = newCategoryName.trim();
    if (!trimmedName) return;

    const { schema } = prevAnnoMatrix;
    if (schema.annotations.obsByName[trimmedName]) {
      throw new Error("name collision on annotation category create");
    }

    let initialValue: AnyArray | Category;
    let ctor: ColumnValueCtor;
    let newSchema: AnnotationColumnSchema;

    if (categoryToDuplicate) {
      const sourceSchema = schema.annotations.obsByName[categoryToDuplicate];
      if (!sourceSchema) {
        throw new Error("categoryToDuplicate does not exist");
      }
      if (
        sourceSchema.type !== "string" &&
        sourceSchema.type !== "categorical"
      ) {
        throw new Error(
          "categoryToDuplicate does not exist or has invalid type"
        );
      }

      const catDf = await prevAnnoMatrix
        .base()
        .fetch(Field.obs, categoryToDuplicate);
      const column = catDf.col(categoryToDuplicate);
      const categories = column.summarizeCategorical().categories.slice();
      if (!categories.includes(globals.unassignedCategoryLabel)) {
        categories.push(globals.unassignedCategoryLabel);
      }

      initialValue = column.getLabelArray();
      ctor = Array as ColumnValueCtor;
      newSchema = {
        ...sourceSchema,
        name: trimmedName,
        categories,
        writable: true,
      };
    } else {
      initialValue = globals.unassignedCategoryLabel;
      ctor = Array as ColumnValueCtor;
      newSchema = {
        name: trimmedName,
        type: "categorical",
        categories: [globals.unassignedCategoryLabel],
        writable: true,
      };
    }

    const obsCrossfilter = prevObsCrossfilter.addObsColumn(
      newSchema,
      ctor,
      initialValue
    );

    dispatch({
      type: "annotation: create category",
      data: trimmedName,
      categoryToDuplicate: categoryToDuplicate ?? null,
      annoMatrix: obsCrossfilter.annoMatrix,
      obsCrossfilter,
    });
  };

export const annotationRenameCategoryAction =
  (oldCategoryName: string, newCategoryName: string): ThunkResult =>
  async (dispatch: AppDispatch, getState: GetState) => {
    const state = getState();
    const {
      annoMatrix: prevAnnoMatrix,
      obsCrossfilter: prevObsCrossfilter,
      annotations: { writableCategoriesEnabled },
    } = state;
    if (!prevAnnoMatrix || !prevObsCrossfilter) return;
    if (!isUserAnnotation(prevAnnoMatrix, oldCategoryName)) {
      throw new Error("not a user annotation");
    }

    const trimmedName = newCategoryName.trim();
    if (!trimmedName || trimmedName === oldCategoryName) return;

    // Update in-memory state IMMEDIATELY for optimistic UI update
    const obsCrossfilter = prevObsCrossfilter.renameObsColumn(
      oldCategoryName,
      trimmedName
    );

    dispatch({
      type: "annotation: category edited",
      annoMatrix: obsCrossfilter.annoMatrix,
      obsCrossfilter,
      metadataField: oldCategoryName,
      newCategoryText: trimmedName,
      data: trimmedName,
    });

    // Only make backend request if annotations are enabled (not in no-auth mode)
    if (!writableCategoriesEnabled) {
      // In no-auth mode, immediately reset autosave state since there's no backend to wait for
      dispatch({
        type: "writable obs annotations - save complete",
        lastSavedAnnoMatrix: obsCrossfilter.annoMatrix,
      });
      return;
    }

    // Mark save as started to prevent autosave timer from interfering during rename
    dispatch({
      type: "writable obs annotations - save started",
    });

    // Persist to backend and WAIT for completion
    await callAnnotationBackendOperation(
      `${globals.API?.prefix ?? ""}${
        globals.API?.version ?? ""
      }annotations/obs?rename=true&category_name=${encodeURIComponent(
        oldCategoryName
      )}`,
      {
        method: "PUT",
        body: JSON.stringify({ new_name: trimmedName }),
        headers: new Headers({
          "Content-Type": "application/json",
        }),
      },
      "rename category"
    );

    // Reset autosave state AFTER backend completes to prevent autosave from trying
    // to save to the old category name while the backend file is being renamed
    // NOTE: We MUST dispatch "save complete" even on backend failure to reset the
    // autosave state machine. Without this, autosave would remain in "saving" state
    // and block future saves.
    dispatch({
      type: "writable obs annotations - save complete",
      lastSavedAnnoMatrix: obsCrossfilter.annoMatrix,
    });
  };

export const annotationDeleteCategoryAction =
  (categoryName: string): ThunkResult =>
  async (dispatch: AppDispatch, getState: GetState) => {
    const state = getState();
    const {
      annoMatrix: prevAnnoMatrix,
      obsCrossfilter: prevObsCrossfilter,
      annotations: { writableCategoriesEnabled },
    } = state;
    if (!prevAnnoMatrix || !prevObsCrossfilter) return;
    if (!isUserAnnotation(prevAnnoMatrix, categoryName)) {
      throw new Error("not a user annotation");
    }

    // Update in-memory state IMMEDIATELY for optimistic UI update
    const obsCrossfilter = prevObsCrossfilter.dropObsColumn(categoryName);
    dispatch({
      type: "annotation: delete category",
      annoMatrix: obsCrossfilter.annoMatrix,
      obsCrossfilter,
      metadataField: categoryName,
    });

    // Only make backend request if annotations are enabled (not in no-auth mode)
    if (!writableCategoriesEnabled) {
      // In no-auth mode, immediately reset autosave state since there's no backend to wait for
      dispatch({
        type: "writable obs annotations - save complete",
        lastSavedAnnoMatrix: obsCrossfilter.annoMatrix,
      });
      return;
    }

    // Mark save as started to prevent autosave timer from interfering during delete
    dispatch({
      type: "writable obs annotations - save started",
    });

    // Persist to backend and WAIT for completion
    await callAnnotationBackendOperation(
      `${globals.API?.prefix ?? ""}${
        globals.API?.version ?? ""
      }annotations/obs?category_name=${encodeURIComponent(categoryName)}`,
      {
        method: "DELETE",
      },
      "delete category"
    );

    // Reset autosave state AFTER backend completes to prevent autosave from trying
    // to save the deleted category while the backend file is being deleted
    // NOTE: We MUST dispatch "save complete" even on backend failure to reset the
    // autosave state machine. Without this, autosave would remain in "saving" state
    // and block future saves.
    dispatch({
      type: "writable obs annotations - save complete",
      lastSavedAnnoMatrix: obsCrossfilter.annoMatrix,
    });
  };

export const annotationCreateLabelInCategory =
  (
    categoryName: string,
    labelName: string,
    assignSelected: boolean
  ): ThunkResult =>
  async (dispatch: AppDispatch, getState: GetState) => {
    const state = getState();
    const { annoMatrix: prevAnnoMatrix, obsCrossfilter: prevObsCrossfilter } =
      state;
    if (!prevAnnoMatrix || !prevObsCrossfilter) return;

    if (!isUserAnnotation(prevAnnoMatrix, categoryName)) {
      throw new Error("not a user annotation");
    }

    const trimmedLabel = labelName.trim();
    if (!trimmedLabel) return;

    let obsCrossfilter = prevObsCrossfilter.addObsAnnoCategory(
      categoryName,
      trimmedLabel
    );
    if (assignSelected) {
      obsCrossfilter = await obsCrossfilter.setObsColumnValues(
        categoryName,
        prevObsCrossfilter.allSelectedLabels(),
        trimmedLabel
      );
    }

    dispatch({
      type: "annotation: add new label to category",
      metadataField: categoryName,
      newLabelText: trimmedLabel,
      assignSelectedCells: assignSelected,
      annoMatrix: obsCrossfilter.annoMatrix,
      obsCrossfilter,
    });
    dispatch({ type: "annotation: disable add new label mode" });
  };

export const annotationDeleteLabelFromCategory =
  (categoryName: string, labelName: string): ThunkResult =>
  async (dispatch: AppDispatch, getState: GetState) => {
    const { annoMatrix: prevAnnoMatrix, obsCrossfilter: prevObsCrossfilter } =
      getState();
    if (!prevAnnoMatrix || !prevObsCrossfilter) return;
    if (!isUserAnnotation(prevAnnoMatrix, categoryName)) {
      throw new Error("not a user annotation");
    }

    const obsCrossfilter = await prevObsCrossfilter.removeObsAnnoCategory(
      categoryName,
      labelName,
      globals.unassignedCategoryLabel
    );

    dispatch({
      type: "annotation: delete label",
      metadataField: categoryName,
      label: labelName,
      annoMatrix: obsCrossfilter.annoMatrix,
      obsCrossfilter,
    });
  };

export const annotationRenameLabelInCategory =
  (
    categoryName: string,
    oldLabelName: string,
    newLabelName: string
  ): ThunkResult =>
  async (dispatch: AppDispatch, getState: GetState) => {
    const { annoMatrix: prevAnnoMatrix, obsCrossfilter: prevObsCrossfilter } =
      getState();
    if (!prevAnnoMatrix || !prevObsCrossfilter) return;
    if (!isUserAnnotation(prevAnnoMatrix, categoryName)) {
      throw new Error("not a user annotation");
    }

    const trimmedName = newLabelName.trim();
    if (!trimmedName) return;

    let obsCrossfilter = await prevObsCrossfilter.resetObsColumnValues(
      categoryName,
      oldLabelName,
      trimmedName
    );
    obsCrossfilter = await obsCrossfilter.removeObsAnnoCategory(
      categoryName,
      oldLabelName,
      globals.unassignedCategoryLabel
    );

    dispatch({
      type: "annotation: label edited",
      editedLabel: trimmedName,
      metadataField: categoryName,
      label: oldLabelName,
      annoMatrix: obsCrossfilter.annoMatrix,
      obsCrossfilter,
    });
  };

export const annotationLabelCurrentSelection =
  (categoryName: string, labelName: string): ThunkResult =>
  async (dispatch: AppDispatch, getState: GetState) => {
    const { annoMatrix: prevAnnoMatrix, obsCrossfilter: prevObsCrossfilter } =
      getState();
    if (!prevAnnoMatrix || !prevObsCrossfilter) return;
    if (!isUserAnnotation(prevAnnoMatrix, categoryName)) {
      throw new Error("not a user annotation");
    }

    const obsCrossfilter = await prevObsCrossfilter.setObsColumnValues(
      categoryName,
      prevObsCrossfilter.allSelectedLabels(),
      labelName
    );

    dispatch({
      type: "annotation: label current cell selection",
      metadataField: categoryName,
      label: labelName,
      obsCrossfilter,
      annoMatrix: obsCrossfilter.annoMatrix,
    });
  };

function writableAnnotations(
  annoMatrix: AnnoMatrix | undefined | null
): string[] {
  if (!annoMatrix) return [];
  return (annoMatrix.schema?.annotations?.obs?.columns ?? [])
    .filter((column) => column.writable)
    .map((column) => column.name);
}

export function changedWritableAnnotations(
  annoMatrix: AnnoMatrix | undefined | null,
  lastSavedAnnoMatrix: AnnoMatrix | null
): string[] {
  if (!annoMatrix || !lastSavedAnnoMatrix) return [];

  const currentBase = annoMatrix.base();
  const lastBase = lastSavedAnnoMatrix.base();

  if (currentBase === lastBase) return [];

  const currentWritable = writableAnnotations(currentBase);
  const lastWritable = writableAnnotations(lastBase);

  const changed = new Set<string>();
  // Columns newly added since last save
  for (const col of currentWritable) {
    if (!lastWritable.includes(col)) changed.add(col);
  }
  // Determine which existing columns have modified data
  const currentObsCache = currentBase._cache?.[Field.obs];
  const lastObsCache = lastBase._cache?.[Field.obs];

  // If caches are identical, then nothing changed beyond new/removed columns
  if (currentObsCache !== lastObsCache) {
    for (const col of currentWritable) {
      const currentHas = currentObsCache?.hasCol?.(col) ?? false;
      const lastHas = lastObsCache?.hasCol?.(col) ?? false;
      if (currentHas && lastHas) {
        if (currentObsCache.col(col) !== lastObsCache.col(col))
          changed.add(col);
      } else if (currentHas && !lastHas) {
        changed.add(col);
      }
    }
  }

  return Array.from(changed);
}

export function deletedWritableAnnotations(
  annoMatrix: AnnoMatrix | undefined | null,
  lastSavedAnnoMatrix: AnnoMatrix | null
): string[] {
  if (!annoMatrix || !lastSavedAnnoMatrix) return [];

  const currentBase = annoMatrix.base();
  const lastBase = lastSavedAnnoMatrix.base();

  if (currentBase === lastBase) return [];

  const currentWritable = writableAnnotations(currentBase);
  const lastWritable = writableAnnotations(lastBase);

  // Find columns that existed in last save but no longer exist
  const deleted: string[] = [];
  for (const col of lastWritable) {
    if (!currentWritable.includes(col)) {
      deleted.push(col);
    }
  }

  return deleted;
}

export const needToSaveObsAnnotations = (
  annoMatrix: AnnoMatrix | undefined,
  lastSavedAnnoMatrix: AnnoMatrix | null
): boolean =>
  changedWritableAnnotations(annoMatrix, lastSavedAnnoMatrix).length > 0 ||
  deletedWritableAnnotations(annoMatrix, lastSavedAnnoMatrix).length > 0;

export const saveObsAnnotationsAction =
  (): ThunkResult => async (dispatch: AppDispatch, getState: GetState) => {
    const state = getState();
    const { autosave } = state;
    const { lastSavedAnnoMatrix, obsAnnotationSaveInProgress } = autosave;
    const annoMatrix = state.annoMatrix?.base();

    if (!annoMatrix) return;

    if (obsAnnotationSaveInProgress || annoMatrix === lastSavedAnnoMatrix) {
      return;
    }

    const changedCols = changedWritableAnnotations(
      annoMatrix,
      lastSavedAnnoMatrix
    );
    const deletedCols = deletedWritableAnnotations(
      annoMatrix,
      lastSavedAnnoMatrix
    );

    // Detect potential rename: a column disappeared and a different one appeared
    // This happens when user undoes a rename - the "new name" column was rolled back
    // (from backend perspective it wasn't explicitly deleted, so we need to DELETE it).
    // However, we also need to distinguish this from a legitimate delete + create.
    // We use a simple heuristic: if exactly one column was deleted and exactly one was added,
    // it's likely a rename undo that we need to clean up on the backend.
    const addedCols = changedCols.filter(
      (col) => writableAnnotations(lastSavedAnnoMatrix).includes(col) === false
    );

    // If we have exactly one deleted and one added, but the added one doesn't have the same data
    // as what was deleted, treat deleted one as needing cleanup (rename undo case)
    if (
      deletedCols.length === 1 &&
      addedCols.length === 0 &&
      changedCols.length === 0
    ) {
      // Pure deletion - handle normally below
    } else if (deletedCols.length === 0 && changedCols.length > 0) {
      // Pure changes/additions - handle normally below
    } else if (deletedCols.length === 1 && changedCols.length > 0) {
      // This could be a rename where both old and new columns appear
      // The deleted one needs to be cleaned up on backend
      const deletedColName = deletedCols[0];
      console.log(
        "[AUTOSAVE] Detected potential rename undo: deleting",
        deletedColName
      );
      dispatch({
        type: "writable obs annotations - save started",
      });

      try {
        const response = await fetch(
          `${globals.API?.prefix ?? ""}${
            globals.API?.version ?? ""
          }annotations/obs?category_name=${encodeURIComponent(deletedColName)}`,
          {
            method: "DELETE",
            credentials: "include",
          }
        );

        if (!response.ok) {
          dispatch({
            type: "writable obs annotations - save error",
            message: `Failed to delete undone rename ${deletedColName}: HTTP ${response.status}`,
          });
          return;
        }

        // After deleting the old name, also save the changed columns
        const df = await annoMatrix.fetch(Field.obs, changedCols);
        const buffer = MatrixFBS.encodeMatrixFBS(df);
        const compressed = deflate(buffer);
        const requestBody = new Blob([new Uint8Array(compressed)], {
          type: "application/octet-stream",
        });

        const putResponse = await fetch(
          `${globals.API?.prefix ?? ""}${
            globals.API?.version ?? ""
          }annotations/obs`,
          {
            method: "PUT",
            body: requestBody,
            headers: new Headers({
              "Content-Type": "application/octet-stream",
            }),
            credentials: "include",
          }
        );

        if (putResponse.ok) {
          dispatch({
            type: "writable obs annotations - save complete",
            lastSavedAnnoMatrix: annoMatrix,
          });
        } else {
          dispatch({
            type: "writable obs annotations - save error",
            message: `HTTP error ${putResponse.status} - ${putResponse.statusText}`,
          });
        }
      } catch (error: unknown) {
        dispatch({
          type: "writable obs annotations - save error",
          message: (error as Error).toString(),
        });
      }
      return;
    }

    // If no changes or deletions, mark as complete
    if (changedCols.length === 0 && deletedCols.length === 0) {
      dispatch({
        type: "writable obs annotations - save complete",
        lastSavedAnnoMatrix: annoMatrix,
      });
      return;
    }

    // If only deletions (no changed data to save), call DELETE for each deleted column
    if (changedCols.length === 0 && deletedCols.length > 0) {
      dispatch({
        type: "writable obs annotations - save started",
      });

      try {
        // Call DELETE for each deleted annotation
        const responses = await Promise.all(
          deletedCols.map((categoryName) =>
            fetch(
              `${globals.API?.prefix ?? ""}${
                globals.API?.version ?? ""
              }annotations/obs?category_name=${encodeURIComponent(
                categoryName
              )}`,
              {
                method: "DELETE",
                credentials: "include",
              }
            )
          )
        );

        for (let i = 0; i < responses.length; i += 1) {
          const response = responses[i];
          const categoryName = deletedCols[i];

          if (!response.ok) {
            dispatch({
              type: "writable obs annotations - save error",
              message: `Failed to delete annotation ${categoryName}: HTTP ${response.status}`,
            });
            return;
          }
        }

        dispatch({
          type: "writable obs annotations - save complete",
          lastSavedAnnoMatrix: annoMatrix,
        });
      } catch (error: unknown) {
        dispatch({
          type: "writable obs annotations - save error",
          message: (error as Error).toString(),
        });
      }
      return;
    }

    dispatch({
      type: "writable obs annotations - save started",
    });

    const df = await annoMatrix.fetch(Field.obs, changedCols);
    const buffer = MatrixFBS.encodeMatrixFBS(df);
    const compressed = deflate(buffer);
    const requestBody = new Blob([new Uint8Array(compressed)], {
      type: "application/octet-stream",
    });

    try {
      const response = await fetch(
        `${globals.API?.prefix ?? ""}${
          globals.API?.version ?? ""
        }annotations/obs`,
        {
          method: "PUT",
          body: requestBody,
          headers: new Headers({
            "Content-Type": "application/octet-stream",
          }),
          credentials: "include",
        }
      );

      if (response.ok) {
        dispatch({
          type: "writable obs annotations - save complete",
          lastSavedAnnoMatrix: annoMatrix,
        });
      } else {
        dispatch({
          type: "writable obs annotations - save error",
          message: `HTTP error ${response.status} - ${response.statusText}`,
          response,
        });
      }
    } catch (error: unknown) {
      dispatch({
        type: "writable obs annotations - save error",
        message: (error as Error).toString(),
        error,
      });
    }
  };

function genesetStateToPayload(genesets: Genesets): {
  geneset_name: string;
  geneset_description: string;
  genes: { gene_symbol: string; gene_description: string }[];
}[] {
  const payload = [] as {
    geneset_name: string;
    geneset_description: string;
    genes: { gene_symbol: string; gene_description: string }[];
  }[];

  genesets.forEach((geneset, genesetName) => {
    const genes = Array.from(geneset.genes.values()).map((gene) => ({
      gene_symbol: gene.geneSymbol,
      gene_description: gene.geneDescription,
    }));

    payload.push({
      geneset_name: genesetName,
      geneset_description: geneset.genesetDescription,
      genes,
    });
  });

  return payload;
}

export const saveGenesetsAction =
  (): ThunkResult => async (dispatch: AppDispatch, getState: GetState) => {
    const state = getState();
    const { config, genesets: genesetState, autosave } = state;

    const genesetsEnabled = config?.parameters?.annotations_genesets ?? false;
    const genesetsReadonly =
      config?.parameters?.annotations_genesets_readonly ?? true;

    const { genesets, lastTid } = genesetState;

    if (!genesetsEnabled || genesetsReadonly) {
      dispatch({
        type: "autosave: genesets complete",
        lastSavedGenesets: genesets,
      });
      return;
    }

    if (autosave.genesetSaveInProgress) return;

    dispatch({
      type: "autosave: genesets started",
    });

    // TID (transaction ID) is incremented for optimistic concurrency control.
    // Each save gets a new TID to track the version and detect conflicts.
    const tid = (lastTid ?? 0) + 1;
    const ota = {
      tid,
      genesets: genesetStateToPayload(genesets),
    };

    try {
      const response = await fetch(
        `${globals.API?.prefix ?? ""}${globals.API?.version ?? ""}genesets`,
        {
          method: "PUT",
          headers: new Headers({
            Accept: "application/json",
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(ota),
          credentials: "include",
        }
      );

      if (!response.ok) {
        dispatch({
          type: "autosave: genesets error",
          message: `HTTP error ${response.status} - ${response.statusText}`,
          response,
        });
        return;
      }

      dispatch({
        type: "autosave: genesets complete",
        lastSavedGenesets: genesets,
      });
      dispatch({
        type: "geneset: set tid",
        tid,
      });
    } catch (error: unknown) {
      dispatch({
        type: "autosave: genesets error",
        message: (error as Error).toString(),
        error,
      });
    }
  };
