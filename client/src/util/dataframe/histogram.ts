/*
Dataframe histogram
*/
import {
  NumberArray,
  isDictEncodedTypedArray,
} from "../../common/types/arraytypes";
import {
  DataframeColumn,
  ContinuousHistogram,
  ContinuousHistogramBy,
  CategoricalHistogram,
  CategoricalHistogramBy,
} from "./types";

export function histogramContinuous(
  column: DataframeColumn,
  bins: number,
  domain: [number, number]
): ContinuousHistogram {
  const valBins = new Array(bins).fill(0);
  if (!column) {
    return valBins;
  }
  const [min, max] = domain;
  const binWidth = (max - min) / bins;
  const colArray: NumberArray = column.asArray() as NumberArray;
  for (let r = 0, len = colArray.length; r < len; r += 1) {
    const val = colArray[r];
    if (val <= max && val >= min) {
      // ensure test excludes NaN values
      const valBin = Math.min(Math.floor((val - min) / binWidth), bins - 1);
      valBins[valBin] += 1;
    }
  }
  return valBins;
}

export function histogramContinuousBy(
  column: DataframeColumn,
  bins: number,
  domain: [number, number],
  by: DataframeColumn
): ContinuousHistogramBy {
  const byMap = new Map();
  if (!column || !by) {
    return byMap;
  }
  const [min, max] = domain;
  const binWidth = (max - min) / bins;
  const byArray = by.asArray();
  const colArray = column.asArray() as NumberArray;
  for (let r = 0, len = colArray.length; r < len; r += 1) {
    const byBin = byArray[r];
    let valBins = byMap.get(byBin);
    if (valBins === undefined) {
      valBins = new Array(bins).fill(0);
      byMap.set(byBin, valBins);
    }
    const val = colArray[r];
    if (val <= max && val >= min) {
      // ensure test excludes NaN values
      const valBin = Math.min(Math.floor((val - min) / binWidth), bins - 1);
      valBins[valBin] += 1;
    }
  }
  return byMap;
}

export function histogramCategorical(
  column: DataframeColumn
): CategoricalHistogram {
  const valMap = new Map();
  if (!column) {
    return valMap;
  }
  const colArray = column.asArray();
  for (let r = 0, len = colArray.length; r < len; r += 1) {
    const valBin = colArray[r];
    let curCount = valMap.get(valBin);
    if (curCount === undefined) {
      curCount = 0;
    }
    valMap.set(valBin, curCount + 1);
  }

  // Convert codes to labels for dict-encoded columns
  if (isDictEncodedTypedArray(colArray)) {
    const labelMap = new Map();
    valMap.forEach((count, code) => {
      const label = colArray.codeMapping[code as number];
      labelMap.set(label, count);
    });
    return labelMap;
  }

  return valMap;
}

export function histogramCategoricalBy(
  column: DataframeColumn,
  by: DataframeColumn
): CategoricalHistogramBy {
  const byMap = new Map();
  if (!column || !by) {
    return byMap;
  }
  const byArray = by.asArray();
  const colArray = column.asArray();
  for (let r = 0, len = colArray.length; r < len; r += 1) {
    const byBin = byArray[r];
    let valMap = byMap.get(byBin);
    if (valMap === undefined) {
      valMap = new Map();
      byMap.set(byBin, valMap);
    }
    const valBin = colArray[r];
    let curCount = valMap.get(valBin);
    if (curCount === undefined) {
      curCount = 0;
    }
    valMap.set(valBin, curCount + 1);
  }

  // Convert codes to labels for dict-encoded columns
  const byIsDictEncoded = isDictEncodedTypedArray(byArray);
  const colIsDictEncoded = isDictEncodedTypedArray(colArray);

  if (byIsDictEncoded || colIsDictEncoded) {
    const labelByMap = new Map();

    byMap.forEach((valMap, byCode) => {
      // Convert outer map key (by column)
      const byLabel = byIsDictEncoded
        ? byArray.codeMapping[byCode as number]
        : byCode;

      // Convert inner map keys (column)
      if (colIsDictEncoded) {
        const labelValMap = new Map();
        valMap.forEach((count: number, colCode: number | string) => {
          const colLabel = colArray.codeMapping[colCode as number];
          labelValMap.set(colLabel, count);
        });
        labelByMap.set(byLabel, labelValMap);
      } else {
        labelByMap.set(byLabel, valMap);
      }
    });

    return labelByMap;
  }

  return byMap;
}

/*
Memoization hash for histogramCategorical()
*/
export function hashCategorical(column: DataframeColumn): string {
  return `${column.__id}:`;
}

export function hashCategoricalBy(
  column: DataframeColumn,
  by: DataframeColumn
): string {
  return `${column.__id}:${by.__id}`;
}

/*
Memoization hash for histogramContinuous
*/
export function hashContinuous(
  column: DataframeColumn,
  bins: number,
  domain: [number, number]
): string {
  const [min, max] = domain;
  return `${column.__id}::${bins}:${min}:${max}`;
}

export function hashContinuousBy(
  column: DataframeColumn,
  bins: number,
  domain: [number, number],
  by: DataframeColumn
): string {
  const [min, max] = domain;
  return `${column.__id}:${bins}:${min}:${max}:${by.__id}`;
}
