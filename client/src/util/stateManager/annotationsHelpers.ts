/*
Helper functions for user-editable annotations state management.
See also reducers/annotations.js
*/

import { Schema } from "../../common/types/schema";
import { Dataframe, LabelType } from "../dataframe";

/**
 * There are a number of state constraints assumed throughout the
 * application:
 *  - all obs annotations are in annoMatrix, regardless of whether or not they
 *    are user editable.
 *  - the annoMatrix.schema is always up to date and matches
 *     the data
 *  - the schema flag `writable` correctly indicates whether
 *     the annotation is editable/mutable.
 *
 * In addition, the current state management only allows for categorical
 * annotations to be writable.
 */
export function isCategoricalAnnotation(
  schema: Schema,
  name: string
): boolean | undefined {
  /**
   * we treat any string, categorical or boolean as a categorical.
   */
  const colSchema = schema.annotations.obsByName[name];

  if (colSchema === undefined) return undefined;

  const { type } = colSchema;

  return type === "string" || type === "boolean" || type === "categorical";
}

/**
 * @returns `true` if all rows as indicated by mask have the `colname` set to
 * label. False, if not.
 */
export function allHaveLabelByMask(
  df: Dataframe,
  colName: LabelType,
  label: string,
  mask: Uint8Array
): boolean {
  const col = df.col(colName);
  if (!col) return false;
  if (df.length !== mask.length)
    throw new RangeError("mismatch on mask length");

  for (let i = 0; i < df.length; i += 1) {
    if (mask[i]) {
      if (col.iget(i) !== label) return false;
    }
  }
  return true;
}

const legalCharacters = /^(\w|[ .()-])+$/;

/**
 * Validate the name
 *
 * Tests:
 * 0. must be string, non-null
 * 1. no leading or trailing spaces
 * 2. only accept alpha, numeric, underscore, period, parens, hyphen and space
 * 3. no runs of multiple spaces
 *
 * @param name - annotation name
 * @returns `false` - a valid name. `string` - a named error, indicating why it was invalid.
 */
export function annotationNameIsErroneous(name: string): boolean | string {
  if (name === "") {
    return "empty-string";
  }
  if (name[0] === " " || name[name.length - 1] === " ") {
    return "trim-spaces";
  }
  if (!legalCharacters.test(name)) {
    return "illegal-characters";
  }
  for (let i = 1, l = name.length; i < l; i += 1) {
    if (name[i] === " " && name[i - 1] === " ") {
      return "multi-space-run";
    }
  }

  /* all is well! Indicate not erroneous with a false */
  return false;
}
