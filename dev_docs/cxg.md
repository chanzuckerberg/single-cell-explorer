# CXG Data Format Specification

Document Status: _draft_

Version: 0.3.0 (_DRAFT, not yet approved_)

Date Last Modified: 2021-09-29

## Introduction

CXG is a cellxgene-private data format, used for at-rest storage of annotated matrix data. It is similar to [AnnData](https://anndata.readthedocs.io/en/stable/), but with performance and access characteristics amenable to a multi-dataset, multi-user serving environment.

CXG is built upon the [TileDB](https://tiledb.com/) embedded database. Each CXG is a TileDB [group](https://docs.tiledb.com/main/api-usage/object-management), which in turn includes one or more TileDB multi-dimensional arrays.

This document presumes familiarity with [TileDB terminology and concepts](https://docs.tiledb.com/main/) and the [Corpora schema 2.0.0](https://github.com/chanzuckerberg/single-cell-curation/blob/main/schema/2.0.0/schema.md).


### Terminology

Unless explicitly noted, the AnnData conventions and terminology are adopted when referring to general annotated matrix characteristics (eg, `n_obs` is the number of observations/rows/cells in the annotated matrix).  Where implied by context, eg, "TileDB array attribute", domain-specific terms are used.

Where capitalized, [IETF RFC 2119](https://www.ietf.org/rfc/rfc2119.txt) conventions are followed (ie, conventions MUST be followed).

_Author's note:_ if you see any ambiguous terms, please call them out for clarification.

### Reserved

The `cxg` prefix is used for CXG-specific names.

### Encoding Data With TileDB Arrays

The TileDB array schema authoritatively defines the characteristics of each array (eg, the type of `X` is defined by [`X.schema`](https://tiledb-inc-tiledb-py.readthedocs-hosted.com/en/stable/python-api.html#tiledb.libtiledb.Array.schema)). In some cases, additional metadata is required for the CXG, and is attached to the array using the TileDB [array metadata](https://docs.tiledb.com/main/basic-concepts/data-format#array-metadata) capability.

All TileDB arrays MUST have a `uint32` domain, zero-based.  All `X` counts and embedding coordinates SHOULD be coerced to `float32`, which is ample precision for visualization purposes, and MUST be a numeric type. Dataframe (metadata) types are generally preserved, or where that is not possible, converted to something with equal representative value in the cellxgene application (eg, categorical types are converted to `string`, bools to `uint8`, etc).

CXG consumers (readers) MUST be prepared to handle any legal TileDB compression, global layout and tile size.  CXG writers SHOULD attempt to encode data using best-effort heuristics for time and space considerations (eg, dense/sparse encoding tradeoffs).

## Entities

### CXG

The CXG is a TileDB group containing all data and metadata for a single annotated matrix.  The following objects MUST be present in a CXG, except where noted as optional:
* `obs`: a TileDB array, of shape (n_obs,), containing obs annotations, each annotation stored in a separate TileDB array attribute. Annotations for categorical metadata may be encoded as integers for faster performance. The integers must correspond to the index location of the corresponding categories in the schema stored in the array's TileDB metadata (`ObsArray.meta['cxg_schema']`).
* `var`: a TileDB array, of shape (n_var,), containing var annotations, each annotation stored in a separate TileDB array attribute.
* `X`: a TileDB array, of shape (n_obs, n_var) for dense data, with a single TileDB attribute of numeric type.
* `Xr`: a TileDB array, of shape (n_obs) for sparse data, with two TileDB attributes of numeric type. The first ("") is expression data, and the second ("var") are the corresponding column indices. Used for row-slicing.
* `Xc`: a TileDB array, of shape (n_var) for sparse data, with a single TileDB attribute of numeric type. The first ("") is expression data, and the second ("obs") are the corresponding row indices. Used for column-slicing.
* `X_col_shift`: (optional) TileDB array used in column shift encoding, shape (n_var,), dtype = X.dtype. Single unnamed numeric attribute.  
* `emb`: a TileDB group, which in turn contains all (zero or more) embeddings.
* `emb/<EMBEDDING_NAME>`: a TileDB array, with a single anonymous attribute, of numeric type, and shape (n_obs, N>=2).
* `cxg_group_metadata`: an empty TileDB array, used to store CXG-wide metadata

### `obs` and `var` arrays

All per-observation (obs) and per-feature (var) data is encoded in a TileDB array named `obs` and `var` respectively, with shape `(n_obs,)` and `(n_var,)`.  Each TileDB array has an array attribute for each obs/var column.  All TileDB array attributes will have the same type and value as the original data, eg, `float32`, with the following exceptions:
* bool is encoded as `uint8` (1/0)
* categorical is encoded as string
* numeric types are cast to 32-bit equivalents

In addition to the obs/var data, both TileDB arrays contain an optional `cxg_schema` metadata field that is a JSON string containing per-column (attribute) schema hinting.  This is used where the TileDB native typing information is insufficient to reconstruct useful information such as categorical typing from Pandas DataFrames, and to communicate which column is the preferred human-readable index for obs & var.

The `cxg_schema` JSON string is attached to the TileDB array metadata, and is a dictionary containing the following top-level names:
* `index`: string, containing the name of the index column
* \<column-name\>: optional, a JSON dict, contain a schema definition using the same format as the cellxgene REST API /schema route

For example:
```
{
    "index": "obs_index",
    "louvain": { "type": "categorical", "categories": [ "0", "1", "2", "3", "4" ]}
    "is_useful": { "type": "boolean" }
}
```

### `X` array

TileDB array, with a single anonymous attribute, shape `(n_obs, n_var)`, containing the count matrix (equivalent to the AnnData `X` array).  MUST have numeric type, and SHOULD be `float32`.  The TileDB schema defines type and sparsity, and both dense and sparse encoding are supported.

### `X_col_shift` array

Optional TileDB array, used to encode per-column offsets for column-shift sparse encoding.  The TileDB array will have a single anonymous attribute, of the same type as the X array, and shape `(n_var,)`.  

* If the `X` array is sparse, then the `X_col_shift` array MAY exist. 
* If the `X` array is dense, then the `X_col_shift` MUST NOT exist.

* When the `X_col_shift` array exists, all values in the `i`'th column of `X` are decremented by the value of the corresponding `X_col_shift[i]`. 
* When the `X_col_shift` array does not exist, it has identical semantics to a column shift value of zero (0) for each column. 

### `emb` group and embedding arrays

A CXG MUST have a group named `emb`, which will contain all embeddings and MUST have at least one embedding array.  Embeddings are encoded as TileDB arrays, of numeric type and shape `(n_obs, >=2)`.  The arrays MUST be a numeric type, and SHOULD be coerced to `float32`. `Inf` and `NaN` values MAY be used, but the semantics for these values is undefined. The TileDB array name will be assumed to be the embedding name (conventionally, embedding names in CXG are _not_ prefixed with an `X_` as they are in AnnData).

### `cxg_group_metadata` array

Required, but empty, TileDB array, used to store CXG-wide metadata within [array metadata](https://docs.tiledb.com/main/solutions/tiledb-embedded/api-usage/array-metadata).  The following fields are defined:
* `cxg_version`: (required) a [semantic version 2.0](https://semver.org/spec/v2.0.0.html)-compliant version, identifying the specification version used to encode the CXG.
* `cxg_properties`: (optional) a dictionary containing dataset wide properties, defined below.
* `cxg_category_colors`: (optional) a categorical color table, defined below.

#### `cxg_properties` field

The `cxg_properties` metadata dictionary contains dataset-wide properties, encoded as a JSON dictionary. Currently, the following optional fields are defined:
* `title`: string, dataset human name (eg, "Lung Tissue")
* `about`: string, fully-qualified http/https URL, linking to more information on the dataset.

All implementations MUST ignore unrecognized fields. 

#### `cxg_category_colors` field

This optional field contains a copy of the category color table, which MAY be used to display category-specific color labels. This is a JSON dictionary, containing a per-category color-table.  Each color table is named `{category_name}_colors`, and is itself a dictionary mapping label name to RGB color.  For example:

```
{
    "louvain_colors": {
        "0": "#FFFFFF",
        "1": "#000000"
    }
}
```

## Corpora Schema Encoding

Note: This section is technically not part of the CXG specification, but rather provides an expectation of what metadata will be available in a CXG file that is converted from Corpora Schema-compliant H5AD file; we use "WILL" rather than "MUST" to document these expectations.

The [Corpora Schema 2.0.0](https://github.com/chanzuckerberg/single-cell-curation/blob/main/schema/2.0.0/schema.md) defines a set of metadata and encoding conventions for annotated matrices.  When a Corpora dataset is encoded as a CXG, the following WILL apply.   

### Corpora metadata property

A CXG containing a Corpora dataset WILL contain a property in the `cxg_group_metadata` field named `corpora`. The value WILL be a JSON encoded string, which in turn contains properties defined in the [Corpora Schema 2.0.0 `uns`](https://github.com/chanzuckerberg/single-cell-curation/blob/main/schema/2.0.0/schema.md#uns-dataset-metadata) AnnData container. The entire encoding WILL be JSON, rather than a hybrid Python/JSON encoding, but will otherwise follow the data structure defined by the Corpora schema.

These Corpora metadata properties WILL exist in the CXG `cxg_group_metadata` field named `corpora`: 
* `schema_version`
* `title`
* `X_normalization`

These Corpora metadata properties MAY exist:
* `default_embedding` (v1.1.0+)
* `X_approximate_distribution` (v2.0.0+)
* `batch_condition` (v2.0.0+)
* `contributors` (v1.1.0 only)
* `preprint_doi` (v1.1.0 only)
* `publication_doi` (v1.1.0 only)
* `default_field` (v1.1.0 only)
* `tags ` (v1.1.0 only)
* `project_name` (v1.1.0 only)
* `project_description` (v1.1.0 only)


For example:
```
{
    "corpora": {
        "schema_version": "2.0.0",
        "title": "Analysis of 8 datasets of healthy and diseased mouse heart",
        "X_normalization": "CPM",
        "X_approximate_distribution": "normal",
        "default_embedding": "X_umap"
    }
}
```

### Other Corpora fields

All other Corpora schema fields will be encoded into a CXG using the conventions defined in the [Corpora Schema 2.0.0](https://github.com/chanzuckerberg/single-cell-curation/blob/main/schema/2.0.0/schema.md). For example, fields in `AnnData.obs` will be encoded in the CXG `obs` array as defined [above](#obs-and-var).

### Compatibility with CXG 0.1

*NOTE: As of 2021-09-29, there are still CXG 0.1 files in existence, but these should be 
replaced with CXG 0.2.0 files in the "near future".  Production CXG 0.1 files exist only in the `cellxgene-data-wrangling-prod` S3 bucket, and do not appear in cellxgene Data Portal.*  

For CXG 0.1 files that were created from [Corpora Schema 1.1.0](https://github.com/chanzuckerberg/single-cell-curation/blob/2dc6a6f7ea342715d8a400a3cead29c691745df7/schema/1.1.0/corpora_schema.md) H5AD files, the following WILL apply:

#### Presentation Hints
* The [Corpora Schema 1.1.0 `title`](https://github.com/chanzuckerberg/single-cell-curation/blob/2dc6a6f7ea342715d8a400a3cead29c691745df7/schema/1.1.0/corpora_schema.md#presentation-metadata) value WILL be saved in the `cxg_properties.title` field.
* The [Corpora Schema 1.1.0 `color_map`](https://github.com/chanzuckerberg/single-cell-curation/blob/2dc6a6f7ea342715d8a400a3cead29c691745df7/schema/1.1.0/corpora_schema.md#presentation-hints), MAY be saved in the `cxg_category_colors` field and WILL NOT be saved in the `corpora` field.
* The [Corpora Schema 1.1.0 SUMMARY `project_link`](https://github.com/chanzuckerberg/single-cell-curation/blob/2dc6a6f7ea342715d8a400a3cead29c691745df7/schema/1.1.0/corpora_schema.md#presentation-hints), MAY be saved in the `cxg_properties.about` field.

Where these values differ in the final CXG, the `cxg_properties` values WILL take precedence.

## CXG Version History

There were several ad hoc version of CXG files created prior to this spec.  This describes the _current_ version of CXG, which incorporates support for Corpora schema semantics.  The known versions are as follows:

| Version | Description | Detection |
| ------- | ----------- | --------- |
| _unnamed_ | An unnamed development version. Did not include explicit versioning support in the data model. Created in early 2020, and not actively used in production. | Missing `cxg_group_metadata` |
| `0.1`       | The first version, defined to support the capabilities of the mid-2020 cellxgene.  Created in early 2020, and in active use. Includes everything in this spec, excluding Corpora schema support.  __NOTE:__ this version is encoded with a short-hand (malformed) semver version number. | `cxg_group_metadata.cxg_version == '0.1'` | 
| `0.2.0`     | Corpora Schema 1.0.0, 1.1.0, and 2.0.0 H5AD files have all been converted into CXG 0.2.0 files. CXG files generated from Corpora 1.x Schema files can be identified by the `corpora.version.corpora_schema_version` metadata property.  CXG files generated from Corpora 2.0.0 Schema files can be identified via the `corpora.schema_version=2.0.0` property. Arguably, the differences in `corpora` properties could have been captured in a new CXG file version, but in reality they all used the same 0.2.0 CXG version. In the near future, all CXG existing files will have been generated from Corpora 2.0.0 Schema files.  | `cxg_group_metadata.cxg_version == '0.2.0'` |
| `0.3.0`     | This specification and the current version.  Sparse `X` arrays have been converted into two 1-dimensional arrays `Xr` and `Xc` for row- and column-slicing, respectively. To improve load times of categorical metadata, the `obs` cell metadata array has been updated to store categorical columns as integers. These integers correspond to the index locations of the categories in the schema type hints stored in the TileDB array metadata for `obs`. | `cxg_group_metadata.cxg_version == '0.3.0'` |

You may use the `scripts/cxg_inspect.py`, available in this repository, to determine the version of a CXG file, along with the version of the Corpora Schema from which it may (or may not) have been generated.