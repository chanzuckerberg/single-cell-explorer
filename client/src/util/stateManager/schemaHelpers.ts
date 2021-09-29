/**
 * Helpers for schema management
 *
 * TODO: all this would be much more natural if done with a framework
 * like immutable.js
 */
import cloneDeep from "lodash.clonedeep";

import fromEntries from "../fromEntries";
import catLabelSort from "../catLabelSort";
import {
  RawSchema,
  Schema,
  EmbeddingSchema,
  AnnotationColumnSchema,
  CategoricalAnnotationColumnSchema,
  Category,
} from "../../common/types/schema";
import { LabelType } from "../dataframe/types";

/**
 * System wide schema assumptions:
 *  - schema and data wil be consistent (eg, for user-created annotations)
 *  - schema will be internally self-consistent (eg, index matches columns)
 */

/**
 * Index schema for ease of use
 */
export function indexEntireSchema(schema: RawSchema): Schema {
  (schema as Schema).annotations.obsByName = fromEntries(
    schema.annotations?.obs?.columns?.map((v) => [v.name, v]) || []
  );
  (schema as Schema).annotations.varByName = fromEntries(
    schema.annotations?.var?.columns?.map((v) => [v.name, v]) || []
  );
  (schema as Schema).layout.obsByName = fromEntries(
    schema.layout?.obs?.map((v) => [v.name, v]) || []
  );
  (schema as Schema).layout.varByName = fromEntries(
    schema.layout?.var?.map((v) => [v.name, v]) || []
  );

  return schema as Schema;
}

/**
 * Redux copy conventions - WARNING, only for modifying obs annotations
 */
function _copyObsAnno(schema: Schema): Schema {
  return {
    ...schema,
    annotations: {
      ...schema.annotations,
      obs: cloneDeep(schema.annotations.obs),
    },
  };
}

function _copyObsLayout(schema: Schema): Schema {
  return {
    ...schema,
    layout: {
      ...schema.layout,
      obs: cloneDeep(schema.layout.obs),
    },
  };
}

/**
 * Reindex obs annotations ONLY
 */
function _reindexObsAnno(schema: Schema): Schema {
  schema.annotations.obsByName = fromEntries(
    schema.annotations.obs.columns.map((v) => [v.name, v])
  );
  return schema;
}

function _reindexObsLayout(schema: Schema) {
  schema.layout.obsByName = fromEntries(
    schema.layout.obs.map((v) => [v.name, v])
  );
  return schema;
}

export function removeObsAnnoColumn(schema: Schema, name: LabelType): Schema {
  const newSchema = _copyObsAnno(schema);
  newSchema.annotations.obs.columns = schema.annotations.obs.columns.filter(
    (v) => v.name !== name
  );
  return _reindexObsAnno(newSchema);
}

export function addObsAnnoColumn(
  schema: Schema,
  _: string,
  defn: AnnotationColumnSchema
): Schema {
  const newSchema = _copyObsAnno(schema);

  newSchema.annotations.obs.columns.push(defn);

  return _reindexObsAnno(newSchema);
}

/**
 * Remove a category from a categorical annotation
 */
export function removeObsAnnoCategory(
  schema: Schema,
  name: LabelType,
  category: Category
): Schema {
  /* remove a category from a categorical annotation */
  // TODO: #35 Use type guards to insure type instead of casting
  const categories = (
    schema.annotations.obsByName[name] as CategoricalAnnotationColumnSchema
  )?.categories;

  if (!categories) {
    throw new Error("column does not exist or is not categorical");
  }

  const idx = categories.indexOf(category);

  if (idx === -1) throw new Error("category does not exist");

  const newSchema = _reindexObsAnno(_copyObsAnno(schema));

  /* remove category.  Do not need to resort as this can't change presentation order */
  // TODO: #35 Use type guards to insure type instead of casting
  (
    newSchema.annotations.obsByName[name] as CategoricalAnnotationColumnSchema
  ).categories?.splice(idx, 1);

  return newSchema;
}

/**
 * Add a category to a categorical annotation
 */
export function addObsAnnoCategory(
  schema: Schema,
  name: string,
  category: Category
): Schema {
  const categories = (
    schema.annotations.obsByName[name] as CategoricalAnnotationColumnSchema
  )?.categories;

  if (!categories) {
    throw new Error("column does not exist or is not categorical");
  }

  const idx = categories.indexOf(category);

  if (idx !== -1) throw new Error("category already exists");

  const newSchema = _reindexObsAnno(_copyObsAnno(schema));

  /* add category, retaining presentation sort order */
  // TODO: #35 Use type guards to insure type instead of casting
  const catAnno = newSchema.annotations.obsByName[
    name
  ] as CategoricalAnnotationColumnSchema;

  catAnno.categories = catLabelSort(catAnno.writable, [
    ...(catAnno.categories || []),
    category,
  ]);

  return newSchema;
}

/**
 * Add or replace a layout
 */
export function addObsLayout(schema: Schema, layout: EmbeddingSchema): Schema {
  const newSchema = _copyObsLayout(schema);
  newSchema.layout.obs.push(layout);
  return _reindexObsLayout(newSchema);
}
