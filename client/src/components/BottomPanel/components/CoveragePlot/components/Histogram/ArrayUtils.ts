export default class ArrayUtils {
  // Use binary search to find the closest neighbors to a value in a sorted array.
  static findClosestNeighbors(sortedArray: number[], value: number) {
    if (sortedArray.length === 0) {
      return [];
    }

    if (sortedArray.length === 1) {
      return [sortedArray[0], sortedArray[0]];
    }

    let low = 0;
    let high = sortedArray.length - 1;

    // Stop once low and high are consecutive.
    while (low + 1 < high) {
      const curIndex = Math.round((low + high) / 2);

      if (sortedArray[curIndex] <= value) {
        low = curIndex;
      } else {
        high = curIndex;
      }
    }

    // value must be between arr[low] and arr[high].
    // UNLESS value < min(sortedArray) or value > max(sortedArray)
    if (value < sortedArray[low]) {
      return [sortedArray[low]];
    }
    if (value > sortedArray[high]) {
      return [sortedArray[high]];
    }

    return [sortedArray[low], sortedArray[high]];
  }
}

export const parseData = (data: unknown) => {
  // basic parsing to support multiple series
  // does not support all bad inputs
  if (!Array.isArray(data)) return null;

  if (!Array.isArray(data[0])) return [data];

  return data;
};

export const formatPercent = (number: number) =>
  `${(100 * number).toFixed(1)}%`;
