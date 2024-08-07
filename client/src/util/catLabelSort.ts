/*
Sort category values (labels) in the order we want for presentation.

TL;DR: sort order is:
* numbers or number-like strings first, in numeric order
* most strings, in case-insenstive unicode sort order
* then 'nan' (any case)
* then, IF isUseAnno is true, globals.unassignedCategoryLabel
*/

import isNumber from "is-number";
import { Category } from "../common/types/schema";

function caseInsensitiveCompare(
  a: string | number | boolean,
  b: string | number | boolean
): number {
  const textA = String(a).toUpperCase();
  const textB = String(b).toUpperCase();
  return textA < textB ? -1 : textA > textB ? 1 : 0;
}

/** typescript type safety */
function isNumberForReal(tbd: unknown): tbd is number {
  return isNumber(tbd);
}

const catLabelSort = (values: Array<Category>): Array<Category> => {
  /* this sort could be memoized for perf */

  const strings: (string | number | boolean)[] = [];
  const ints: (string | number | boolean)[] = [];
  const unassignedOrNaN: (string | number | boolean)[] = [];

  values?.forEach((v) => {
    if (String(v).toLowerCase() === "nan") {
      unassignedOrNaN.push(v);
    } else if (isNumberForReal(v)) {
      ints.push(v);
    } else {
      strings.push(v);
    }
  });

  strings.sort(caseInsensitiveCompare);
  ints.sort((a, b) => +a - +b);
  unassignedOrNaN.sort(caseInsensitiveCompare);

  return ints.concat(strings, unassignedOrNaN);
};

export default catLabelSort;
