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
      const columnArray = column.asArray() as AnyArray;
      const categories = column.summarizeCategorical().categories.slice();
      if (!categories.includes(globals.unassignedCategoryLabel)) {
        categories.push(globals.unassignedCategoryLabel);
      }
      initialValue = columnArray;
      ctor = (columnArray.constructor as ColumnValueCtor) ?? Array;
      newSchema = {
        ...sourceSchema,
        name: trimmedName,
        categories,
        writable: true,
      };
    } else {
      initialValue = globals.unassignedCategoryLabel;
      ctor = Array as unknown as ColumnValueCtor;
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
    const { annoMatrix: prevAnnoMatrix, obsCrossfilter: prevObsCrossfilter } =
      getState();
    if (!prevAnnoMatrix || !prevObsCrossfilter) return;
    if (!isUserAnnotation(prevAnnoMatrix, oldCategoryName)) {
      throw new Error("not a user annotation");
    }

    const trimmedName = newCategoryName.trim();
    if (!trimmedName || trimmedName === oldCategoryName) return;

    // Update in-memory state first
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

    // Reset autosave state to prevent trying to save stale annotation data
    dispatch({
      type: "writable obs annotations - save complete",
      lastSavedAnnoMatrix: obsCrossfilter.annoMatrix,
    });

    // Persist to backend
    try {
      const response = await fetch(
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
          credentials: "include",
        }
      );

      if (!response.ok) {
        console.error(
          `Failed to rename category on backend: ${response.status} - ${response.statusText}`
        );
        // Note: We don't revert the local state here since the user expects the UI to reflect their action
        // The backend rename failure will be logged but won't block the UI
      }
    } catch (error) {
      console.error("Failed to rename category on backend:", error);
      // Same as above - don't revert local state
    }
  };

export const annotationDeleteCategoryAction =
  (categoryName: string): ThunkResult =>
  async (dispatch: AppDispatch, getState: GetState) => {
    const { annoMatrix: prevAnnoMatrix, obsCrossfilter: prevObsCrossfilter } =
      getState();
    if (!prevAnnoMatrix || !prevObsCrossfilter) return;
    if (!isUserAnnotation(prevAnnoMatrix, categoryName)) {
      throw new Error("not a user annotation");
    }

    // Update in-memory state first
    const obsCrossfilter = prevObsCrossfilter.dropObsColumn(categoryName);
    dispatch({
      type: "annotation: delete category",
      annoMatrix: obsCrossfilter.annoMatrix,
      obsCrossfilter,
      metadataField: categoryName,
    });

    // Reset autosave state to prevent trying to save stale annotation data
    dispatch({
      type: "writable obs annotations - save complete",
      lastSavedAnnoMatrix: obsCrossfilter.annoMatrix,
    });

    // Persist to backend
    try {
      const response = await fetch(
        `${globals.API?.prefix ?? ""}${
          globals.API?.version ?? ""
        }annotations/obs?category_name=${encodeURIComponent(categoryName)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        console.error(
          `Failed to delete category on backend: ${response.status} - ${response.statusText}`
        );
        // Note: We don't revert the local state here since the user expects the UI to reflect their action
        // The backend deletion failure will be logged but won't block the UI
      }
    } catch (error) {
      console.error("Failed to delete category on backend:", error);
      // Same as above - don't revert local state
    }
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

    // If no changes or deletions, mark as complete
    if (changedCols.length === 0 && deletedCols.length === 0) {
      dispatch({
        type: "writable obs annotations - save complete",
        lastSavedAnnoMatrix: annoMatrix,
      });
      return;
    }

    // If only deletions (no changed data to save), mark as complete
    // Backend category deletion will be handled separately via dedicated endpoints
    if (changedCols.length === 0 && deletedCols.length > 0) {
      dispatch({
        type: "writable obs annotations - save complete",
        lastSavedAnnoMatrix: annoMatrix,
      });
      return;
    }

    dispatch({
      type: "writable obs annotations - save started",
    });

    const df = await annoMatrix.fetch(Field.obs, changedCols);
    const buffer = MatrixFBS.encodeMatrixFBS(df);
    const compressed = deflate(buffer);
    const requestBody = new Blob([compressed], {
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
