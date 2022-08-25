/**
 * Action creators for user annotation
 */
import difference from "lodash.difference";
import * as globals from "../globals";
import { AppDispatch, GetState } from "../reducers";
import { AnnotationsHelpers } from "../util/stateManager";

const { isUserAnnotation } = AnnotationsHelpers;

/**
 * Add a new user-created category to the obs annotations.
 * @param newCategoryName - string name for the category.
 * @param categoryToDuplicate - obs category to use for initial values, or null.
 * @returns An empty promise.
 */
export const annotationCreateCategoryAction =
  (newCategoryName: string, categoryToDuplicate: string) =>
  async (dispatch: AppDispatch, getState: GetState): Promise<void> => {
    const { annoMatrix: prevAnnoMatrix, obsCrossfilter: prevObsCrossfilter } =
      getState();
    if (!prevAnnoMatrix || !prevObsCrossfilter) return;
    const { schema } = prevAnnoMatrix;

    /* name must be a string,  non-zero length */
    if (typeof newCategoryName !== "string" || newCategoryName.length === 0)
      throw new Error("user annotations require string name");

    /* ensure the name isn't already in use! */
    if (schema.annotations.obsByName[newCategoryName])
      throw new Error("name collision on annotation category create");

    let initialValue;
    let newSchema;
    let ctor;
    if (categoryToDuplicate) {
      /* if we are duplicating a category, retrieve it */
      const catDupSchema = schema.annotations.obsByName[categoryToDuplicate];
      const catDupType = catDupSchema?.type;
      if (catDupType !== "string" && catDupType !== "categorical")
        throw new Error(
          "categoryToDuplicate does not exist or has invalid type"
        );

      const catToDupDf = await prevAnnoMatrix
        .base()
        .fetch("obs", categoryToDuplicate);
      const col = catToDupDf.col(categoryToDuplicate);
      initialValue = col.asArray();
      const { categories } = col.summarizeCategorical();
      // all user-created annotations must have the unassigned category
      if (!categories.includes(globals.unassignedCategoryLabel)) {
        categories.push(globals.unassignedCategoryLabel);
      }
      ctor = initialValue.constructor;
      newSchema = {
        ...catDupSchema,
        name: newCategoryName,
        categories,
        writable: true,
      };
    } else {
      /* else assign to the standard default value */
      initialValue = globals.unassignedCategoryLabel;
      ctor = Array;
      newSchema = {
        name: newCategoryName,
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
      data: newCategoryName,
      categoryToDuplicate,
      annoMatrix: obsCrossfilter.annoMatrix,
      obsCrossfilter,
    });
  };

/**
 * Rename a user-created annotation category
 */
export const annotationRenameCategoryAction =
  (oldCategoryName: string, newCategoryName: string) =>
  (dispatch: AppDispatch, getState: GetState): void => {
    const { annoMatrix: prevAnnoMatrix, obsCrossfilter: prevObsCrossfilter } =
      getState();
    if (!prevAnnoMatrix || !prevObsCrossfilter) return;
    if (!isUserAnnotation(prevAnnoMatrix, oldCategoryName))
      throw new Error("not a user annotation");

    /* name must be a string,  non-zero length */
    if (typeof newCategoryName !== "string" || newCategoryName.length === 0)
      throw new Error("user annotations require string name");

    if (oldCategoryName === newCategoryName) return;

    const obsCrossfilter = prevObsCrossfilter.renameObsColumn(
      oldCategoryName,
      newCategoryName
    );

    dispatch({
      type: "annotation: category edited",
      annoMatrix: obsCrossfilter.annoMatrix,
      obsCrossfilter,
      metadataField: oldCategoryName,
      newCategoryText: newCategoryName,
      data: newCategoryName,
    });
  };

/**
 * Delete a user-created category
 */
export const annotationDeleteCategoryAction =
  (categoryName: string) =>
  (dispatch: AppDispatch, getState: GetState): void => {
    const { annoMatrix: prevAnnoMatrix, obsCrossfilter: prevObsCrossfilter } =
      getState();
    if (!prevAnnoMatrix || !prevObsCrossfilter) return;
    if (!isUserAnnotation(prevAnnoMatrix, categoryName))
      throw new Error("not a user annotation");

    const obsCrossfilter = prevObsCrossfilter.dropObsColumn(categoryName);
    dispatch({
      type: "annotation: delete category",
      annoMatrix: obsCrossfilter.annoMatrix,
      obsCrossfilter,
      metadataField: categoryName,
    });
  };

/**
 * Add a new label to a user-defined category.  If assignSelected is true, assign
 * the label to all currently selected cells.
 */
export const annotationCreateLabelInCategory =
  (
    categoryName: string,
    labelName: string,
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
    assignSelected: any // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  ) =>
  async (dispatch: AppDispatch, getState: GetState): Promise<void> => {
    const { annoMatrix: prevAnnoMatrix, obsCrossfilter: prevObsCrossfilter } =
      getState();
    if (!prevAnnoMatrix || !prevObsCrossfilter) return;
    if (!isUserAnnotation(prevAnnoMatrix, categoryName))
      throw new Error("not a user annotation");

    let obsCrossfilter = prevObsCrossfilter.addObsAnnoCategory(
      categoryName,
      labelName
    );
    if (assignSelected) {
      obsCrossfilter = await obsCrossfilter.setObsColumnValues(
        categoryName,
        prevObsCrossfilter.allSelectedLabels(),
        labelName
      );
    }

    dispatch({
      type: "annotation: add new label to category",
      annoMatrix: obsCrossfilter.annoMatrix,
      obsCrossfilter,
      metadataField: categoryName,
      newLabelText: labelName,
      assignSelectedCells: assignSelected,
    });
  };

/**
 * delete a label from a user-defined category
 */
export const annotationDeleteLabelFromCategory =
  (categoryName: string, labelName: string) =>
  async (dispatch: AppDispatch, getState: GetState): Promise<void> => {
    const { annoMatrix: prevAnnoMatrix, obsCrossfilter: prevObsCrossfilter } =
      getState();
    if (!prevAnnoMatrix || !prevObsCrossfilter) return;
    if (!isUserAnnotation(prevAnnoMatrix, categoryName))
      throw new Error("not a user annotation");

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

/**
 * label name change
 */
export const annotationRenameLabelInCategory =
  (categoryName: string, oldLabelName: string, newLabelName: string) =>
  async (dispatch: AppDispatch, getState: GetState): Promise<void> => {
    const { annoMatrix: prevAnnoMatrix, obsCrossfilter: prevObsCrossfilter } =
      getState();
    if (!prevAnnoMatrix || !prevObsCrossfilter) return;
    if (!isUserAnnotation(prevAnnoMatrix, categoryName))
      throw new Error("not a user annotation");

    let obsCrossfilter = await prevObsCrossfilter.resetObsColumnValues(
      categoryName,
      oldLabelName,
      newLabelName
    );
    obsCrossfilter = await obsCrossfilter.removeObsAnnoCategory(
      categoryName,
      oldLabelName,
      globals.unassignedCategoryLabel
    );

    dispatch({
      type: "annotation: label edited",
      editedLabel: newLabelName,
      metadataField: categoryName,
      label: oldLabelName,
      annoMatrix: obsCrossfilter.annoMatrix,
      obsCrossfilter,
    });
  };

/**
 * set the label on all currently selected
 */
export const annotationLabelCurrentSelection =
  (categoryName: string, labelName: string) =>
  async (dispatch: AppDispatch, getState: GetState): Promise<void> => {
    const { annoMatrix: prevAnnoMatrix, obsCrossfilter: prevObsCrossfilter } =
      getState();
    if (!prevAnnoMatrix || !prevObsCrossfilter) return;
    if (!isUserAnnotation(prevAnnoMatrix, categoryName))
      throw new Error("not a user annotation");

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
function writableAnnotations(annoMatrix: any) {
  return (
    annoMatrix.schema.annotations.obs.columns
      // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
      .filter((s: any) => s.writable)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
      .map((s: any) => s.name)
  );
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types --- FIXME: disabled temporarily on migrate to TS.
export const needToSaveObsAnnotations = (
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  annoMatrix: any,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
  lastSavedAnnoMatrix: any
) => {
  /*
  Return true if there are LIKELY user-defined annotation modifications between the two
  annoMatrices.  Technically not an action creator, but intimately intertwined
  with the save process.

  Two conditions will trigger a need to save:
    * the collection of user-defined columns have changed
    * the contents of the user-defined columns have change
  */

  annoMatrix = annoMatrix.base();

  // if the annoMatrix hasn't changed, we are guaranteed no changes to the matrix schema or contents.
  if (annoMatrix === lastSavedAnnoMatrix) return false;

  // if the schema has changed, we need to save
  const currentWritable = writableAnnotations(annoMatrix);
  if (difference(currentWritable, writableAnnotations(lastSavedAnnoMatrix))) {
    return true;
  }

  // no schema changes; check for change in contents
  return currentWritable.some(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
    (col: any) => annoMatrix.col(col) !== lastSavedAnnoMatrix.col(col)
  );
};
