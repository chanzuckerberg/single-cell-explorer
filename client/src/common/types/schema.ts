export type Category = number | string | boolean;

export interface CategoricalAnnotationColumnSchema {
  categories: Category[];
  name: string;
  type: "categorical";
  writable: boolean;
}

export type AnnotationColumnSchema =
  | CategoricalAnnotationColumnSchema
  | {
      name: string;
      type: "string" | "float32" | "int32" | "boolean";
      writable: boolean;
      categories?: Category[];
    };

export interface XMatrixSchema {
  nObs: number;
  nVar: number;
  // TODO(thuang): Not sure what other types are available
  type: "float32";
}

export interface EmbeddingSchema {
  dims: string[];
  name: string;
  // TODO(thuang): Not sure what other types are available
  type: "float32";
}

export interface UnsSchema {
  spatial: {
    imageWidth: number;
    imageHeight: number;
    libraryId: string;
    image: string;
  };
  type: "spatial";
}
interface RawLayoutSchema {
  obs: EmbeddingSchema[];
  var?: EmbeddingSchema[];
}

interface RawAnnotationsSchema {
  obs: {
    columns: AnnotationColumnSchema[];
    index: string;
  };
  var: {
    columns: AnnotationColumnSchema[];
    index: string;
  };
  uns: {
    columns: UnsSchema;
  };
}

export interface RawSchema {
  annotations: RawAnnotationsSchema;
  dataframe: XMatrixSchema;
  layout: RawLayoutSchema;
  uns: UnsSchema;
}

interface AnnotationsSchema extends RawAnnotationsSchema {
  obsByName: { [name: string]: AnnotationColumnSchema };
  varByName: { [name: string]: AnnotationColumnSchema };
}

interface LayoutSchema extends RawLayoutSchema {
  obsByName: { [name: string]: EmbeddingSchema };
  varByName: { [name: string]: EmbeddingSchema };
}

export interface Schema extends RawSchema {
  annotations: AnnotationsSchema;
  layout: LayoutSchema;
  uns: UnsSchema;
}

/**
 * Sub-schema objects describing the schema for a primitive Array or Matrix in one of the fields.
 */
export type ArraySchema =
  | AnnotationColumnSchema
  | EmbeddingSchema
  | XMatrixSchema
  | UnsSchema;

/**
 * Set of data / metadata objects that must be specified in a CXG.
 */
export enum Field {
  "obs" = "obs",
  "var" = "var",
  "emb" = "emb",
  "X" = "X",
  "uns" = "uns",
}
