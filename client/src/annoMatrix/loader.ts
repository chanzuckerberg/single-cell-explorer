import { doBinaryRequest, doFetch } from "./fetchHelpers";
import { matrixFBSToDataframe } from "../util/stateManager/matrix";
import { _getColumnSchema } from "./schema";
import {
  addObsAnnoCategory as addObsAnnoCategoryToSchema,
  addObsAnnoColumn,
  removeObsAnnoCategory as removeObsAnnoCategoryFromSchema,
  removeObsAnnoColumn,
} from "../util/stateManager/schemaHelpers";
import { _whereCacheCreate, WhereCache } from "./whereCache";
import AnnoMatrix from "./annoMatrix";
import PromiseLimit from "../util/promiseLimit";
import {
  _expectComplexQuery,
  _expectSimpleQuery,
  _hashStringValues,
  _urlEncodeComplexQuery,
  _urlEncodeLabelQuery,
  _urlOptionalEncodeNbinsSuffix,
  ComplexQuery,
  Query,
} from "./query";
import {
  normalizeResponse,
  normalizeWritableCategoricalSchema,
} from "./normalize";
import {
  AnnotationColumnSchema,
  ArraySchema,
  CategoricalAnnotationColumnSchema,
  Category,
  Field,
  RawSchema,
} from "../common/types/schema";
import { Dataframe } from "../util/dataframe";
import {
  LabelType,
  LabelArray,
  DataframeValueArray,
  DataframeValue,
} from "../util/dataframe/types";
import { AnyArray, TypedArray } from "../common/types/arraytypes";

const promiseThrottle = new PromiseLimit<ArrayBuffer>(5);

type ColumnValueCtor = new (length: number) => AnyArray;

export default class AnnoMatrixLoader extends AnnoMatrix {
  baseURL: string;

  /*
  AnnoMatrix implementation which proxies to HTTP server using the CXG REST API.
  Used as the base (non-view) instance.

  Public API is same as AnnoMatrix class (refer there for API description),
  with the addition of the constructor which bootstraps:

    new AnnoMatrixLoader(serverBaseURL, schema) -> instance

  */
  constructor(baseURL: string, schema: RawSchema) {
    const { nObs, nVar } = schema.dataframe;
    super(schema, nObs, nVar);

    if (baseURL[baseURL.length - 1] !== "/") {
      // must have trailing slash
      baseURL += "/";
    }
    this.baseURL = baseURL;
    Object.seal(this);
  }

  addObsColumn(
    colSchema: AnnotationColumnSchema,
    Ctor: ColumnValueCtor,
    value: AnyArray | Category
  ): AnnoMatrix {
    const columnName = colSchema.name;
    if (
      _getColumnSchema(this.schema, Field.obs, columnName) ||
      this._cache.obs.hasCol(columnName)
    ) {
      throw new Error("column already exists");
    }

    const newAnnoMatrix = this._clone();
    let columnData: AnyArray;
    const cloneArray = (arr: AnyArray): DataframeValueArray => {
      if (Array.isArray(arr)) {
        return [...(arr as DataframeValue[])] as DataframeValueArray;
      }
      return (arr as TypedArray).slice() as unknown as DataframeValueArray;
    };

    if (Array.isArray(value) || ArrayBuffer.isView(value)) {
      if ((value as AnyArray).constructor !== Ctor) {
        throw new Error("Mismatched value array type");
      }
      if ((value as AnyArray).length !== this.nObs) {
        throw new Error("Value array has incorrect length");
      }
      columnData = cloneArray(value as AnyArray);
    } else {
      const initialized = new Ctor(this.nObs) as AnyArray;
      if (typeof (initialized as any).fill !== "function") {
        throw new Error("Column constructor must support fill");
      }
      (initialized as any).fill(value as Category);
      columnData = cloneArray(initialized);
    }

    const dataframeColumn = columnData as DataframeValueArray;
    newAnnoMatrix._cache.obs = this._cache.obs.withCol(
      columnName,
      dataframeColumn
    );
    const normalizedSchema = normalizeWritableCategoricalSchema(
      {
        ...colSchema,
        writable: true,
      },
      newAnnoMatrix._cache.obs.col(columnName)
    );
    newAnnoMatrix.schema = addObsAnnoColumn(
      this.schema,
      columnName,
      normalizedSchema
    );
    return newAnnoMatrix;
  }

  addObsAnnoCategory(col: LabelType, category: Category): AnnoMatrix {
    const colSchema = _getColumnSchema(this.schema, Field.obs, col);
    writableCategoryTypeCheck(colSchema);
    const newAnnoMatrix = this._clone();
    newAnnoMatrix.schema = addObsAnnoCategoryToSchema(
      this.schema,
      col as string,
      category
    );
    return newAnnoMatrix;
  }

  async removeObsAnnoCategory(
    col: LabelType,
    category: Category,
    unassignedCategory: Category
  ): Promise<AnnoMatrix> {
    const colSchema = _getColumnSchema(this.schema, Field.obs, col);
    writableCategoryTypeCheck(colSchema);

    const newAnnoMatrix = await this.resetObsColumnValues(
      col,
      category,
      unassignedCategory
    );
    newAnnoMatrix.schema = removeObsAnnoCategoryFromSchema(
      newAnnoMatrix.schema,
      col as string,
      category
    );
    return newAnnoMatrix;
  }

  dropObsColumn(col: LabelType): AnnoMatrix {
    const colSchema = _getColumnSchema(this.schema, Field.obs, col);
    writableCheck(colSchema);

    const newAnnoMatrix = this._clone();
    newAnnoMatrix._cache.obs = this._cache.obs.dropCol(col);
    newAnnoMatrix.schema = removeObsAnnoColumn(this.schema, col as string);
    return newAnnoMatrix;
  }

  renameObsColumn(oldCol: LabelType, newCol: LabelType): AnnoMatrix {
    const oldColSchema = _getColumnSchema(this.schema, Field.obs, oldCol);
    writableCheck(oldColSchema);

    if (typeof newCol !== "string" || newCol.length === 0) {
      throw new Error("new column name must be a non-empty string");
    }
    if (_getColumnSchema(this.schema, Field.obs, newCol)) {
      throw new Error("column already exists");
    }

    if (!this._cache.obs.hasCol(oldCol)) {
      throw new Error("annotation data unavailable");
    }
    const existing = this._cache.obs.col(oldCol).asArray() as AnyArray;
    const ctor = existing.constructor as ColumnValueCtor;

    const dropped = this.dropObsColumn(oldCol);
    return dropped.addObsColumn(
      {
        ...(oldColSchema as AnnotationColumnSchema),
        name: newCol,
      },
      ctor,
      existing
    );
  }

  async setObsColumnValues(
    col: LabelType,
    rowLabels: LabelArray,
    value: Category
  ): Promise<AnnoMatrix> {
    const colSchema = _getColumnSchema(this.schema, Field.obs, col);
    writableCategoryTypeCheck(colSchema);

    await this.fetch(Field.obs, col);
    if (!this._cache.obs.hasCol(col)) {
      throw new Error("annotation data unavailable");
    }

    const column = this._cache.obs.col(col);
    const nextData = column.getLabelArray().slice() as Category[];
    const offsets = this.rowIndex.getOffsets(rowLabels);

    // Modify the values
    offsets.forEach((offset) => {
      if (offset === undefined) {
        throw new Error("Unknown row label");
      }
      nextData[offset] = value;
    });

    const newAnnoMatrix = this._clone();
    const updatedColumn = nextData as unknown as DataframeValueArray;
    newAnnoMatrix._cache.obs = this._cache.obs.replaceColData(
      col,
      updatedColumn
    );

    const columnName = col as string;
    const columnDef = this.schema.annotations.obsByName[columnName] as
      | CategoricalAnnotationColumnSchema
      | undefined;
    let updatedSchema = this.schema;
    if (!columnDef?.categories?.includes(value)) {
      updatedSchema = addObsAnnoCategoryToSchema(
        this.schema,
        columnName,
        value
      );
    }
    newAnnoMatrix.schema = updatedSchema;
    return newAnnoMatrix;
  }

  async resetObsColumnValues(
    col: LabelType,
    oldValue: Category,
    newValue: Category
  ): Promise<AnnoMatrix> {
    const colSchema = _getColumnSchema(this.schema, Field.obs, col);
    writableCategoryTypeCheck(colSchema);

    if (!colSchema.categories.includes(oldValue)) {
      throw new Error("unknown category");
    }

    await this.fetch(Field.obs, col);
    if (!this._cache.obs.hasCol(col)) {
      throw new Error("annotation data unavailable");
    }

    const column = this._cache.obs.col(col);
    const data = column.getLabelArray().slice() as Category[];

    for (let i = 0, l = data.length; i < l; i += 1) {
      if (data[i] === oldValue) {
        data[i] = newValue;
      }
    }

    const newAnnoMatrix = this._clone();
    newAnnoMatrix._cache.obs = this._cache.obs.replaceColData(
      col,
      data as unknown as DataframeValueArray
    );

    if (!colSchema.categories.includes(newValue)) {
      newAnnoMatrix.schema = addObsAnnoCategoryToSchema(
        this.schema,
        col as string,
        newValue
      );
    }

    return newAnnoMatrix;
  }

  /**
   ** Private below
   **/
  async _doLoad(
    field: Field,
    query: Query,
    nBins: number | null
  ): Promise<[WhereCache | null, Dataframe]> {
    /*
    _doLoad - evaluates the query against the field. Returns:
      * whereCache update: column query map mapping the query to the column labels
      * Dataframe containing the new columns (one per dimension)
    */
    let doRequest;
    let priority = 10; // default fetch priority

    switch (field) {
      case "obs":
      case "var": {
        doRequest = _obsOrVarLoader(this.baseURL, field, query, nBins);
        break;
      }
      case "X": {
        doRequest = _XLoader(this.baseURL, field, query, nBins);
        break;
      }
      case "emb": {
        doRequest = _embLoader(this.baseURL, field, query, nBins);
        priority = 0; // high prio load for embeddings
        break;
      }
      default:
        throw new Error("Unknown field name");
    }
    const buffer = await promiseThrottle.priorityAdd(priority, doRequest);
    let result = matrixFBSToDataframe(buffer);
    if (!result || result.isEmpty()) throw Error("Unknown field/col");

    const whereCacheUpdate = _whereCacheCreate(
      field,
      query,
      result.colIndex.labels()
    );
    result = normalizeResponse(field, this.schema, result);

    return [whereCacheUpdate, result];
  }
}

/*
Utility functions below
*/

function writableCheck(
  colSchema: AnnotationColumnSchema | ArraySchema | undefined
): asserts colSchema is AnnotationColumnSchema {
  if (!colSchema || !(colSchema as AnnotationColumnSchema).writable) {
    throw new Error("Unknown or readonly obs column");
  }
}

function writableCategoryTypeCheck(
  colSchema: AnnotationColumnSchema | ArraySchema | undefined
): asserts colSchema is CategoricalAnnotationColumnSchema {
  writableCheck(colSchema as AnnotationColumnSchema | undefined);
  if ((colSchema as AnnotationColumnSchema).type !== "categorical") {
    throw new Error("column must be categorical");
  }
}

function _embLoader(
  baseURL: string,
  _field: Field,
  query: Query,
  nBins: number | null = null
): () => Promise<ArrayBuffer> {
  _expectSimpleQuery(query);

  const urlBase = `${baseURL}layout/obs`;
  const urlQuery = _urlEncodeLabelQuery("layout-name", query);
  const url = _urlOptionalEncodeNbinsSuffix(`${urlBase}?${urlQuery}`, nBins);
  return () => doBinaryRequest(url);
}

function _obsOrVarLoader(
  baseURL: string,
  field: Field,
  query: Query,
  nBins: number | null = null
): () => Promise<ArrayBuffer> {
  _expectSimpleQuery(query);

  const urlBase = `${baseURL}annotations/${field}`;
  const urlQuery = _urlEncodeLabelQuery("annotation-name", query);
  const url = _urlOptionalEncodeNbinsSuffix(`${urlBase}?${urlQuery}`, nBins);
  return () => doBinaryRequest(url);
}

function _XLoader(
  baseURL: string,
  _field: Field,
  query: Query,
  nBins: number | null = null
): () => Promise<ArrayBuffer> {
  _expectComplexQuery(query);

  // Casting here as query is validated to be complex in _expectComplexQuery above.
  const complexQuery = query as ComplexQuery;

  if ("where" in complexQuery) {
    const urlBase = `${baseURL}data/var`;
    const urlQuery = _urlEncodeComplexQuery(complexQuery);
    const url = _urlOptionalEncodeNbinsSuffix(`${urlBase}?${urlQuery}`, nBins);
    return () => doBinaryRequest(url);
  }

  if ("summarize" in complexQuery) {
    const urlBase = `${baseURL}summarize/var`;
    const urlQuery = _urlEncodeComplexQuery(complexQuery);

    if (urlBase.length + urlQuery.length < 2000) {
      const url = _urlOptionalEncodeNbinsSuffix(
        `${urlBase}?${urlQuery}`,
        nBins
      );
      return () => doBinaryRequest(url);
    }

    const url = _urlOptionalEncodeNbinsSuffix(
      `${urlBase}?key=${_hashStringValues([urlQuery])}`,
      nBins
    );
    return async () => {
      const res = await doFetch(url, {
        method: "POST",
        body: urlQuery,
        headers: new Headers({
          Accept: "application/octet-stream",
          "Content-Type": "application/x-www-form-urlencoded",
        }),
      });
      return res.arrayBuffer();
    };
  }

  throw new Error("Unknown query structure");
}
