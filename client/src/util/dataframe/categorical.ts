/*
Dataframe histogram
*/
import { CodeMapping } from "../stateManager/code_mapping_interfaces";
import { CatIntArray } from "../stateManager/matrix";
import { DataframeValueArray } from "./types";

export function mapCodesToValues(
  column: CatIntArray,
  mapping: CodeMapping,
  __id: string
): DataframeValueArray {
  const result: DataframeValueArray = new Array(column.length);
  for (const [i, val] of column.entries()) {
    result[i] = mapping[val];
  }
  return result;
}

export function hashMapCodesToValues(
  __column: CatIntArray,
  mapping: CodeMapping,
  id: string
): string {
  return `${JSON.stringify(mapping)}:${id}`;
}
