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
  AnnotationColumnSchema,
  Category,
  CategoricalAnnotationColumnSchema,
  RawSchema,
  Schema,
} from "../../common/types/schema";

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

function cloneObsAnnotations(schema: Schema): Schema {
  const cloned = {
    ...schema,
    annotations: {
      ...schema.annotations,
      obs: cloneDeep(schema.annotations.obs),
    },
  } as Schema;
  cloned.annotations.obsByName = fromEntries(
    cloned.annotations.obs.columns.map((col) => [col.name, col])
  );
  return cloned;
}

function reindexObsAnnotations(schema: Schema): Schema {
  schema.annotations.obsByName = fromEntries(
    schema.annotations.obs.columns.map((col) => [col.name, col])
  );
  return schema;
}

export function removeObsAnnoColumn(schema: Schema, name: string): Schema {
  const newSchema = cloneObsAnnotations(schema);
  newSchema.annotations.obs.columns = newSchema.annotations.obs.columns.filter(
    (column) => column.name !== name
  );
  return reindexObsAnnotations(newSchema);
}

export function addObsAnnoColumn(
  schema: Schema,
  _name: string,
  definition: AnnotationColumnSchema
): Schema {
  const newSchema = cloneObsAnnotations(schema);
  newSchema.annotations.obs.columns.push(cloneDeep(definition));
  return reindexObsAnnotations(newSchema);
}

export function addObsAnnoCategory(
  schema: Schema,
  name: string,
  category: Category
): Schema {
  const newSchema = cloneObsAnnotations(schema);
  const column =
    newSchema.annotations.obsByName[name] as CategoricalAnnotationColumnSchema;
  if (!column?.categories)
    throw new Error("column does not exist or is not categorical");
  if (column.categories.includes(category))
    throw new Error("category already exists");

  column.categories = catLabelSort([...column.categories, category]);
  return reindexObsAnnotations(newSchema);
}

export function removeObsAnnoCategory(
  schema: Schema,
  name: string,
  category: Category
): Schema {
  const newSchema = cloneObsAnnotations(schema);
  const column =
    newSchema.annotations.obsByName[name] as CategoricalAnnotationColumnSchema;
  if (!column?.categories)
    throw new Error("column does not exist or is not categorical");
  const index = column.categories.indexOf(category);
  if (index === -1) throw new Error("category does not exist");

  column.categories.splice(index, 1);
  column.categories = catLabelSort([...column.categories]);
  return reindexObsAnnotations(newSchema);
}
