/*
This module contains helper functions to map an array of categorical codes to values
*/
import { CatIntArray } from "../../common/types/arraytypes";
import { DataframeValueArray } from "./types";

export function mapCodesToValues(
  column: CatIntArray,
  __id: string
): DataframeValueArray {
  const result: DataframeValueArray = new Array(column.length);
  for (const [i, _] of column.entries()) {
    result[i] = column.vat(i);
  }
  return result;
}

export function hashMapCodesToValues(column: CatIntArray, id: string): string {
  return `${JSON.stringify(column.codeMapping)}:${id}`;
}
