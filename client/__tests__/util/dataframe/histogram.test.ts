import { expect, test } from "@playwright/test";
import * as Dataframe from "../../../src/util/dataframe";

const { describe } = test;

describe("Dataframe column histogram", () => {
  test("categorical by categorical", () => {
    const df = new Dataframe.Dataframe(
      [3, 3],
      [["n1", "n2", "n3"], ["c1", "c2", "c3"], new Int32Array([0, 1, 2])],
      null,
      new Dataframe.KeyIndex(["name", "cat", "value"])
    );

    const h1 = df.col("cat").histogramCategoricalBy(df.col("name"));
    expect(h1).toMatchObject(
      Object.fromEntries([
        ["n1", Object.fromEntries([["c1", 1]])],
        ["n2", Object.fromEntries([["c2", 1]])],
        ["n3", Object.fromEntries([["c3", 1]])],
      ])
    );
    // memoized?
    expect(df.col("cat").histogramCategoricalBy(df.col("name"))).toBe(h1);
  });

  test("continuous by categorical", () => {
    const df = new Dataframe.Dataframe(
      [3, 3],
      [["n1", "n2", "n3"], ["c1", "c2", "c3"], new Int32Array([0, 1, 2])],
      null,
      new Dataframe.KeyIndex(["name", "cat", "value"])
    );

    const h1 = df.col("value").histogramContinuousBy(3, [0, 2], df.col("name"));
    expect(h1).toMatchObject(
      Object.fromEntries([
        ["n1", [1, 0, 0]],
        ["n2", [0, 1, 0]],
        ["n3", [0, 0, 1]],
      ])
    );
    // memoized?
    expect(
      df.col("value").histogramContinuousBy(3, [0, 2], df.col("name"))
    ).toBe(h1);
  });

  test("categorical", () => {
    const df = new Dataframe.Dataframe(
      [3, 3],
      [["n1", "n2", "n3"], ["c1", "c2", "c3"], new Int32Array([0, 1, 2])],
      null,
      new Dataframe.KeyIndex(["name", "cat", "value"])
    );

    const h1 = df.col("cat").histogramCategorical();
    expect(h1).toMatchObject(
      Object.fromEntries([
        ["c1", 1],
        ["c2", 1],
        ["c3", 1],
      ])
    );
    // memoized?
    expect(df.col("cat").histogramCategorical()).toBe(h1);
  });

  test("continuous", () => {
    const df = new Dataframe.Dataframe(
      [3, 3],
      [["n1", "n2", "n3"], ["c1", "c2", "c3"], new Int32Array([0, 1, 2])],
      null,
      new Dataframe.KeyIndex(["name", "cat", "value"])
    );

    const h1 = df.col("value").histogramContinuous(3, [0, 2]);
    expect(h1).toMatchObject([1, 1, 1]);
    // memoized?
    expect(df.col("value").histogramContinuous(3, [0, 2])).toMatchObject(h1);
  });

  test("continuous thesholds correct", () => {
    const vals = [0, 1, 9, 10, 11, 20, 99, 100];
    const df = new Dataframe.Dataframe(
      [8, 2],
      [new Int32Array(vals), new Float32Array(vals)]
    );

    expect(df.col(0).histogramContinuous(5, [0, 100])).toEqual([5, 1, 0, 0, 2]);
    expect(df.col(1).histogramContinuous(5, [0, 100])).toEqual([5, 1, 0, 0, 2]);
    expect(df.col(0).histogramContinuous(2, [0, 10])).toEqual([2, 2]);
    expect(df.col(0).histogramContinuous(10, [0, 100])).toEqual([
      3, 2, 1, 0, 0, 0, 0, 0, 0, 2,
    ]);
  });
});
