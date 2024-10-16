/* eslint-disable no-bitwise -- unsigned right shift better than Math.round */
import { expect, test } from "@playwright/test";

/*
test color helpers
*/
import {
  createColorTable,
  loadUserColorConfig,
} from "../../../src/util/stateManager/colorHelpers";
import * as Dataframe from "../../../src/util/dataframe";

const { describe } = test;

describe("categorical color helpers", () => {
  /*
  Primary test constraint for categorical colors is that they are ordered/identified
  by schema order, NOT by value.  Ie,

    scale(schemaIndex) should match rgb[obsOffset]
  */

  const schema = indexSchema({
    annotations: {
      obs: {
        columns: [
          {
            name: "name_0",
            type: "string",
            writable: false,
          },
          {
            name: "continuousColumn",
            type: "float32",
            writable: false,
          },
          {
            categories: [
              "CD4 T cells",
              "CD14+ Monocytes",
              "B cells",
              "CD8 T cells",
              "NK cells",
              "FCGR3A+ Monocytes",
              "Dendritic cells",
              "Megakaryocytes",
            ],
            name: "categoricalColumn",
            type: "categorical",
            writable: false,
          },
        ],
        index: "name_0",
      },
      var: {
        columns: [
          {
            name: "name_0",
            type: "string",
            writable: false,
          },
        ],
        index: "name_0",
      },
    },
    dataframe: {
      nObs: 2638,
      nVar: 1838,
      type: "float32",
    },
    layout: {},
  });

  const catColCategories = schema.annotations.obs.columns[2].categories;
  const isSpatial = false;
  const obsDataframe = new Dataframe.Dataframe(
    [schema.dataframe.nObs, 2],
    [
      new Float32Array(schema.dataframe.nObs).map(() => Math.random()),
      new Array(schema.dataframe.nObs)
        .fill("")
        .map(
          () =>
            catColCategories[(Math.random() * catColCategories.length) >>> 0]
        ),
    ],
    null,
    new Dataframe.KeyIndex(["continuousColumn", "categoricalColumn"])
  );

  test("default category order", () => {
    const ct = createColorTable({
      colorMode: "color by categorical metadata",
      colorByAccessor: "categoricalColumn",
      colorByData: obsDataframe,
      schema,
      userColors: null,
      isSpatial,
    });
    expect(ct).toBeDefined();
    const data = obsDataframe.col("categoricalColumn").asArray();
    const cats = schema.annotations.obsByName.categoricalColumn.categories;
    for (let i = 0; i < schema.dataframe.nObs; i += 1) {
      expect(makeScale(ct.rgb[i])).toEqual(ct?.scale?.(cats.indexOf(data[i])));
    }
  });

  test("shuffle category order", () => {
    const schemaClone = indexSchema(JSON.parse(JSON.stringify(schema)));
    shuffle(schemaClone.annotations.obsByName.categoricalColumn.categories);
    const ct = createColorTable({
      colorMode: "color by categorical metadata",
      colorByAccessor: "categoricalColumn",
      colorByData: obsDataframe,
      schema: schemaClone,
      userColors: null,
      isSpatial,
    });
    expect(ct).toBeDefined();
    const data = obsDataframe.col("categoricalColumn").asArray();
    const cats = schemaClone.annotations.obsByName.categoricalColumn.categories;
    for (let i = 0; i < schemaClone.dataframe.nObs; i += 1) {
      expect(makeScale(ct.rgb[i])).toEqual(ct?.scale?.(cats.indexOf(data[i])));
    }
  });

  test("user defined color order", () => {
    const cats = schema.annotations.obsByName.categoricalColumn.categories;

    const shuffleCats = shuffle(
      Array.from(schema.annotations.obsByName.categoricalColumn.categories)
    );

    const userDefinedColorTable = {
      categoricalColumn: shuffleCats.reduce(
        (acc: { [label: string]: string }, label: string) => {
          acc[label] = randRGBColor();
          return acc;
        },
        {}
      ),
    };

    const userColors = loadUserColorConfig(userDefinedColorTable);
    expect(userColors).toBeDefined();

    const ct = createColorTable({
      colorMode: "color by categorical metadata",
      colorByAccessor: "categoricalColumn",
      colorByData: obsDataframe,
      schema,
      userColors,
      isSpatial,
    });
    expect(ct).toBeDefined();
    const data = obsDataframe.col("categoricalColumn").asArray();
    for (let i = 0; i < schema.dataframe.nObs; i += 1) {
      expect(makeScale(ct.rgb[i])).toEqual(
        ct?.scale?.(cats.indexOf(data[i])).toString()
      );
    }
  });
});

/*
TODO:
1. mix up category order in schema to make sure it works with varied order
2. user defined colors
*/

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
function indexSchema(schema: any) {
  schema.annotations.obsByName = Object.fromEntries(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
    schema.annotations?.obs?.columns?.map((v: any) => [v.name, v]) ?? []
  );
  schema.annotations.varByName = Object.fromEntries(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
    schema.annotations?.var?.columns?.map((v: any) => [v.name, v]) ?? []
  );
  schema.layout.obsByName = Object.fromEntries(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
    schema.layout?.obs?.map((v: any) => [v.name, v]) ?? []
  );
  schema.layout.varByName = Object.fromEntries(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
    schema.layout?.var?.map((v: any) => [v.name, v]) ?? []
  );

  return schema;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
function makeScale(rgb: any) {
  // make a scale string from a rgb float triple
  return `rgb(${(rgb[0] * 255) >>> 0}, ${(rgb[1] * 255) >>> 0}, ${
    (rgb[2] * 256) >>> 0
  })`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any --- FIXME: disabled temporarily on migrate to TS.
function shuffle(array: any) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = (Math.random() * (i + 1)) >>> 0;
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function randHexColor() {
  const hex = ((Math.random() * 255) >>> 0).toString(16);
  return `0${hex}`.slice(-2);
}

function randRGBColor() {
  return `#${randHexColor()}${randHexColor()}${randHexColor()}`;
}

/* eslint-enable no-bitwise -- unsigned right shift better than Math.round */
