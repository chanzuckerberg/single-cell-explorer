/* eslint-disable @typescript-eslint/no-loop-func -- beforeEach is rewriting the variable */
import filter from "lodash.filter";
import zip from "lodash.zip";
import { expect, test } from "@playwright/test";

import Crossfilter, {
  CrossfilterSelector,
} from "../../../src/util/typedCrossfilter";

const { describe, beforeEach } = test;
const someData = [
  {
    date: "2011-11-14T16:17:54Z",
    quantity: 2,
    total: 190,
    tip: 100,
    type: "tab",
    productIDs: ["001"],
    coords: [0, 0],
    nonFinite: 0.0,
  },
  {
    date: "2011-11-14T16:20:19Z",
    quantity: 2,
    total: 190,
    tip: 100,
    type: "tab",
    productIDs: ["001", "005"],
    coords: [0.4, 0.4],
    nonFinite: Number.NaN,
  },
  {
    date: "2011-11-14T16:28:54Z",
    quantity: 1,
    total: 300,
    tip: 200,
    type: "visa",
    productIDs: ["004", "005"],
    coords: [0.3, 0.1],
    nonFinite: Number.POSITIVE_INFINITY,
  },
  {
    date: "2011-11-14T16:30:43Z",
    quantity: 2,
    total: 90,
    tip: 0,
    type: "tab",
    productIDs: ["001", "002"],
    coords: [0.392, 0.1],
    nonFinite: Number.NEGATIVE_INFINITY,
  },
  {
    date: "2011-11-14T16:48:46Z",
    quantity: 2,
    total: 90,
    tip: 0,
    type: "tab",
    productIDs: ["005"],
    coords: [0.7, 0.0482],
    nonFinite: 1.0,
  },
  {
    date: "2011-11-14T16:53:41Z",
    quantity: 2,
    total: 90,
    tip: 0,
    type: "tab",
    productIDs: ["001", "004", "005"],
    coords: [0.9999, 1.0],
    nonFinite: Number.NaN,
  },
  {
    date: "2011-11-14T16:54:06Z",
    quantity: 1,
    total: 100,
    tip: 0,
    type: "cash",
    productIDs: ["001", "002", "003", "004", "005"],
    coords: [0.384, 0.6938],
    nonFinite: 99.0,
  },
  {
    date: "2011-11-14T16:58:03Z",
    quantity: 2,
    total: 90,
    tip: 0,
    type: "tab",
    productIDs: ["001"],
    coords: [0.4822, 0.482],
    nonFinite: Number.NaN,
  },
  {
    date: "2011-11-14T17:07:21Z",
    quantity: 2,
    total: 90,
    tip: 0,
    type: "tab",
    productIDs: ["004", "005"],
    coords: [0.2234, 0],
    nonFinite: Number.NaN,
  },
  {
    date: "2011-11-14T17:22:59Z",
    quantity: 2,
    total: 90,
    tip: 0,
    type: "tab",
    productIDs: ["001", "002", "004", "005"],
    coords: [0.382, 0.38485],
    nonFinite: -1,
  },
  {
    date: "2011-11-14T17:25:45Z",
    quantity: 2,
    total: 200,
    tip: 0,
    type: "cash",
    productIDs: ["002"],
    coords: [0.998, 0.8472],
    nonFinite: 0.0,
  },
  {
    date: "2011-11-14T17:29:52Z",
    quantity: 1,
    total: 200,
    tip: 100,
    type: "visa",
    productIDs: ["004"],
    coords: [0.8273, 0.3384],
    nonFinite: 0.0,
  },
];

let payments: Crossfilter<typeof someData>;
beforeEach(() => {
  payments = new Crossfilter(someData);
});

describe("ImmutableTypedCrossfilter", () => {
  test("create crossfilter", () => {
    expect(payments).toBeDefined();
    expect(payments.size()).toEqual(someData.length);
    expect(payments.all()).toEqual(someData);

    const p = payments
      .addDimension("quantity", {
        type: "scalar",
        value: payments.all().map((d) => d.quantity),
        ValueArrayCtor: Int32Array,
      })
      .select("quantity", { mode: "all" });
    expect(p).toBeDefined();
    expect(p.all()).toEqual(someData);
    expect(p.size()).toEqual(someData.length);
    expect(p.isElementSelected(0)).toBeTruthy();
    expect(p.countSelected()).toEqual(someData.length);
    expect(p.allSelected()).toEqual(someData);
  });

  test("immutability", () => {
    /*
    the following should return a new crossfilter:
    - addDimension()
    - delDimension()
    - select
    */
    const p2 = payments.addDimension("quantity", {
      type: "scalar",
      value: payments.all().map((d) => d.quantity),
      ValueArrayCtor: Int32Array,
    });

    expect(payments).not.toBe(p2);
    const p3 = p2.select("quantity", { mode: "all" });
    expect(p3).not.toBe(p2);

    const p4 = p3.delDimension("quantity");
    expect(p4).not.toBe(p3);

    const p5 = p2.renameDimension("quantity", "Quantity");
    expect(p5).not.toBe(p2);
  });

  test("select all and none", () => {
    let p = payments
      .addDimension("quantity", {
        type: "scalar",
        value: payments.all().map((d) => d.quantity),
        ValueArrayCtor: Int32Array,
      })
      .addDimension("tip", {
        type: "scalar",
        value: payments.all().map((d) => d.tip),
        ValueArrayCtor: Float32Array,
      })
      .addDimension("total", {
        type: "scalar",
        value: payments.all().map((d) => d.total),
        ValueArrayCtor: Float32Array,
      })
      .addDimension("type", {
        type: "enum",
        value: payments.all().map((d) => d.type),
      });
    expect(p).toBeDefined();

    /* expect all records to be selected - default init state */
    expect(p.allSelected()).toEqual(someData);
    expect(p.countSelected()).toEqual(someData.length);
    expect(p.allSelectedMask()).toEqual(
      new Uint8Array(someData.length).fill(1)
    );
    expect(p.fillByIsSelected(new Uint8Array(someData.length), 99, 0)).toEqual(
      new Uint8Array(someData.length).fill(99)
    );
    for (let i = 0; i < someData.length; i += 1) {
      expect(p.isElementSelected(i)).toBeTruthy();
    }

    /* expect a selectAll on one dimension to change nothing */
    p = p.select("tip", { mode: "all" });
    expect(p.allSelected()).toEqual(someData);

    /* ditto */
    p = p.select("quantity", { mode: "all" });
    expect(p.allSelected()).toEqual(someData);

    /* select none on one dimension */
    p = p.select("type", { mode: "none" });
    expect(p.allSelected()).toEqual([]);
    expect(p.countSelected()).toEqual(0);
    expect(p.allSelectedMask()).toEqual(
      new Uint8Array(someData.length).fill(0)
    );
    expect(p.fillByIsSelected(new Uint8Array(someData.length), 99, 0)).toEqual(
      new Uint8Array(someData.length).fill(0)
    );
    for (let i = 0; i < someData.length; i += 1) {
      expect(p.isElementSelected(i)).toBeFalsy();
    }

    p = p.select("quantity", { mode: "none" });
    expect(p.allSelected()).toEqual([]);

    // invert the first none; should have no effect because type is
    // still not filtered.
    p = p.select("quantity", { mode: "all" });
    expect(p.allSelected()).toEqual([]);

    /* select all of type; should select all records */
    p = p.select("type", { mode: "all" });
    expect(p.allSelected()).toEqual(someData);
  });

  describe("scalar dimension", () => {
    let p: typeof payments;
    beforeEach(() => {
      p = payments
        .addDimension("quantity", {
          type: "scalar",
          value: payments.all().map((d) => d.quantity),
          ValueArrayCtor: Int32Array,
        })
        .addDimension("tip", {
          type: "scalar",
          value: payments.all().map((d) => d.tip),
          ValueArrayCtor: Float32Array,
        })
        .select("tip", { mode: "all" });
    });

    /*
    select modes:  all, none, exact, range
    */
    test("all", () => {
      expect(p.select("quantity", { mode: "all" }).countSelected()).toEqual(
        someData.length
      );
    });
    test("none", () => {
      expect(p.select("quantity", { mode: "none" }).countSelected()).toEqual(0);
    });
    for (const [v] of [[[]], [[2]], [[2, 1]], [[9, 82]], [[0, 1]]]) {
      test(`exact: ${v}`, () =>
        expect(
          p.select("quantity", { mode: "exact", values: v }).countSelected()
        ).toEqual(filter(someData, (d) => v.includes(d.quantity)).length));
    }
    test("single value exact", () => {
      expect(
        p.select("quantity", { mode: "exact", values: 2 }).countSelected()
      ).toEqual(filter(someData, (d) => d.quantity === 2).length);
    });
    for (const [lo, hi] of [
      [0, 1],
      [1, 2],
      [0, 99],
      [99, 100000],
    ]) {
      test(`range ${[lo, hi]}`, () =>
        expect(
          p.select("quantity", { mode: "range", lo, hi }).countSelected()
        ).toEqual(
          filter(someData, (d) => d.quantity >= lo && d.quantity < hi).length
        ));
    }
    test("bad mode", () => {
      expect(() =>
        p.select("type", { mode: "bad mode" } as unknown as CrossfilterSelector)
      ).toThrow(Error);
    });
  });

  describe("enum dimension", () => {
    let p: typeof payments;
    beforeEach(() => {
      p = payments.addDimension("type", {
        type: "enum",
        value: payments.all().map((d) => d.type),
      });
    });

    test("all", () => {
      expect(p.select("type", { mode: "all" }).countSelected()).toEqual(
        someData.length
      );
    });
    test("none", () => {
      expect(p.select("type", { mode: "none" }).countSelected()).toEqual(0);
    });
    for (const [v] of [
      [[]],
      [["tab"]],
      [["visa"]],
      [["visa", "tab"]],
      [["cash", "tab", "visa"]],
    ]) {
      test(`exact: ${v}`, () =>
        expect(
          p.select("type", { mode: "exact", values: v }).countSelected()
        ).toEqual(filter(someData, (d) => v.includes(d.type)).length));
    }
    test("single value exact", () => {
      expect(
        p.select("type", { mode: "exact", values: "tab" }).countSelected()
      ).toEqual(filter(someData, (d) => d.type === "tab").length);
    });
    test("range", () => {
      expect(() => p.select("type", { mode: "range", lo: 0, hi: 9 })).toThrow(
        Error
      );
    });
    test("bad mode", () => {
      expect(() =>
        p.select("type", { mode: "bad mode" } as unknown as CrossfilterSelector)
      ).toThrow(Error);
    });
  });

  describe("spatial dimension", () => {
    let p: typeof payments;
    beforeEach(() => {
      const X = Float32Array.from(someData.map((r) => r.coords[0]));
      const Y = Float32Array.from(someData.map((r) => r.coords[1]));
      p = payments.addDimension("coords", { type: "spatial", X, Y });
    });

    test("all", () => {
      expect(p.select("coords", { mode: "all" }).countSelected()).toEqual(
        someData.length
      );
    });
    test("none", () => {
      expect(p.select("coords", { mode: "none" }).countSelected()).toEqual(0);
    });
    for (const [minX, minY, maxX, maxY] of [
      [0, 0, 1, 1],
      [0, 0, 0.5, 0.5],
      [0.5, 0.5, 1, 1],
    ]) {
      test(`within-rect ${minX}, ${minY}, ${maxX}, ${maxY}, `, () => {
        expect(
          p
            .select("coords", { mode: "within-rect", minX, minY, maxX, maxY })
            .allSelected()
        ).toEqual(
          filter(someData, (d) => {
            const [x, y] = d.coords;
            return minX <= x && x < maxX && minY <= y && y < maxY;
          })
        );
      });
    }

    const config: [[number, number][], boolean[]][] = [
      [
        [
          [0, 0],
          [0, 1],
          [1, 1],
          [1, 0],
        ],
        [
          true,
          true,
          true,
          true,
          true,
          false,
          true,
          true,
          true,
          true,
          true,
          true,
        ],
      ],
      [
        [
          [0, 0],
          [0, 0.5],
          [0.5, 0.5],
          [0.5, 0],
        ],
        [
          true,
          true,
          true,
          true,
          false,
          false,
          false,
          true,
          true,
          true,
          false,
          false,
        ],
      ],
    ];

    for (const [polygon, expected] of config) {
      test(`within-polygon ${polygon}`, () => {
        expect(
          p
            .select("coords", {
              mode: "within-polygon",
              polygon: polygon as [number, number][],
              graphId: "test-graph-id",
            })
            .allSelected()
        ).toEqual(
          zip(someData, expected)
            .filter((x) => x[1])
            .map((x) => x[0])
        );
      });
    }
  });

  describe("non-finite scalars", () => {
    let p: typeof payments;
    beforeEach(() => {
      p = payments
        .addDimension("quantity", {
          type: "scalar",
          value: payments.all().map((d) => d.quantity),
          ValueArrayCtor: Int32Array,
        })
        .addDimension("nonFinite", {
          type: "scalar",
          value: payments.all().map((d) => d.nonFinite),
          ValueArrayCtor: Float32Array,
        })
        .select("quantity", { mode: "all" });
    });

    test("all or none", () => {
      expect(p.select("nonFinite", { mode: "all" }).countSelected()).toEqual(
        someData.length
      );
      expect(p.select("nonFinite", { mode: "none" }).countSelected()).toEqual(
        0
      );
    });

    test("exact", () => {
      expect(
        p.select("nonFinite", { mode: "exact", values: [0] }).countSelected()
      ).toEqual(3);
      expect(
        p.select("nonFinite", { mode: "exact", values: [1] }).countSelected()
      ).toEqual(1);
      expect(
        p
          .select("nonFinite", {
            mode: "exact",
            values: [Number.POSITIVE_INFINITY],
          })
          .countSelected()
      ).toEqual(1);
      expect(
        p
          .select("nonFinite", {
            mode: "exact",
            values: [Number.NEGATIVE_INFINITY],
          })
          .countSelected()
      ).toEqual(1);
      expect(
        p
          .select("nonFinite", { mode: "exact", values: [Number.NaN] })
          .countSelected()
      ).toEqual(4);
      expect(
        p
          .select("nonFinite", {
            mode: "exact",
            values: [Number.POSITIVE_INFINITY, 0, 1, 99],
          })
          .countSelected()
      ).toEqual(6);
    });

    test("range", () => {
      expect(
        p
          .select("nonFinite", {
            mode: "range",
            lo: 0,
            hi: Number.POSITIVE_INFINITY,
          })
          .countSelected()
      ).toEqual(5);
      expect(
        p
          .select("nonFinite", {
            mode: "range",
            lo: 0,
            hi: Number.NaN,
          })
          .countSelected()
      ).toEqual(6);
      expect(
        p
          .select("nonFinite", {
            mode: "range",
            lo: Number.NEGATIVE_INFINITY,
            hi: Number.POSITIVE_INFINITY,
          })
          .countSelected()
      ).toEqual(7);
    });
  });
});

/* eslint-enable @typescript-eslint/no-loop-func -- beforeEach is rewriting the variable */
