import { makeSortIndex } from "../../../src/util/typedCrossfilter/util";
import { rangeFill as fillRange } from "../../../src/util/range";

describe("fillRange", () => {
  test("Array", () => {
    expect(fillRange(new Array(6))).toMatchObject([0, 1, 2, 3, 4, 5]);
    expect(fillRange(new Array(4), 1)).toMatchObject([1, 2, 3, 4]);
    expect(fillRange([])).toMatchObject([]);
  });

  test("Uint32Array", () => {
    expect(fillRange(new Uint32Array(6))).toMatchObject(
      new Uint32Array([0, 1, 2, 3, 4, 5])
    );
    expect(fillRange(new Array(4), 1)).toMatchObject(
      new Uint32Array([1, 2, 3, 4])
    );
    expect(fillRange([])).toMatchObject(new Uint32Array([]));
  });
});

describe("makeSortIndex", () => {
  test("Array", () => {
    expect(makeSortIndex([3, 2, 1, 0])).toMatchObject(
      new Uint32Array([3, 2, 1, 0])
    );
    expect(makeSortIndex([3, 2, 1, 0, 4])).toMatchObject(
      new Uint32Array([3, 2, 1, 0, 4])
    );
    expect(makeSortIndex([])).toMatchObject(new Uint32Array([]));
  });

  test("Float32Array", () => {
    expect(makeSortIndex(new Float32Array([3, 2, 1, 0]))).toMatchObject(
      new Uint32Array([3, 2, 1, 0])
    );
    expect(makeSortIndex(new Float32Array([3, 2, 1, 0, 4]))).toMatchObject(
      new Uint32Array([3, 2, 1, 0, 4])
    );
    expect(makeSortIndex(new Float32Array([]))).toMatchObject(
      new Uint32Array([])
    );
  });

  test("Int32Array", () => {
    expect(makeSortIndex(new Int32Array([3, 2, 1, 0]))).toMatchObject(
      new Uint32Array([3, 2, 1, 0])
    );
    expect(makeSortIndex(new Int32Array([3, 2, 1, 0, 4]))).toMatchObject(
      new Uint32Array([3, 2, 1, 0, 4])
    );
    expect(makeSortIndex(new Int32Array([]))).toMatchObject(
      new Uint32Array([])
    );
  });
});
