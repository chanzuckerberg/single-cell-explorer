#!/usr/bin/env python
"""Convert a TileDB .cxg dataset to an AnnData .zarr store, for the Zarr-adaptor POC.

Reads via the existing CxgDataset adaptor so the zarr fixture matches the .cxg one exactly.
Read-only POC scope: X, obs, var, embeddings, colors. No user annotations / genesets.

Usage:
    python scripts/cxg_to_zarr.py <input.cxg> <output.zarr>
"""
import sys

import anndata
import numpy as np
import pandas as pd

# anndata's zarr v2 writer can't serialize Arrow-backed strings; keep object strings as object.
pd.set_option("future.infer_string", False)

from server.common.config.app_config import AppConfig
from server.common.utils.data_locator import DataLocator
from server.dataset.cxg_dataset import CxgDataset


def _minimal_config():
    config = AppConfig()
    config.update_server_config(app__flask_secret_key="x", multi_dataset__dataroot="/test/")
    config.complete_config()
    return config


def _coerce(values, col_schema):
    """Reconstruct the logical column. CxgDataset.query_*_array returns raw codes for
    categorical columns, so rebuild categoricals from the cxg schema. anndata's zarr writer
    can't serialize Arrow-backed strings (pandas 2.x default), so non-categorical strings -> object."""
    if col_schema and col_schema.get("type") == "categorical" and "categories" in col_schema:
        categories = col_schema["categories"]
        arr = np.asarray(values)
        if arr.dtype.kind in ("i", "u"):
            return pd.Categorical.from_codes(arr, categories=categories)
        return pd.Categorical([v.decode() if isinstance(v, bytes) else str(v) for v in arr], categories=categories)
    s = pd.Series(values)
    if pd.api.types.is_categorical_dtype(s):
        return s.values
    if pd.api.types.is_numeric_dtype(s) or pd.api.types.is_bool_dtype(s):
        return np.asarray(s)
    return np.array([v.decode() if isinstance(v, bytes) else str(v) for v in s], dtype=object)


def _frame(keys, query_fn, index_name, schema_cols):
    """Build a DataFrame from adaptor column queries, using index_name's column as the index."""
    by_name = {c["name"]: c for c in schema_cols}
    df = pd.DataFrame({k: _coerce(query_fn(k), by_name.get(k)) for k in keys})
    df.index = pd.Index(np.asarray(df[index_name]).astype(object), name=index_name)
    return df


def convert(cxg_path: str, zarr_path: str) -> None:
    ds = CxgDataset(DataLocator(cxg_path), _minimal_config())
    schema = ds.get_schema()
    obs_index = schema["annotations"]["obs"].get("index", ds.get_obs_keys()[0])
    var_index = schema["annotations"]["var"].get("index", ds.get_var_keys()[0])

    obs = _frame(ds.get_obs_keys(), ds.query_obs_array, obs_index, schema["annotations"]["obs"]["columns"])
    var = _frame(ds.get_var_keys(), ds.query_var_array, var_index, schema["annotations"]["var"]["columns"])

    # Full dense X (POC fixtures are small). None masks -> whole matrix.
    X = np.asarray(ds.get_X_array(None, None))
    obsm = {f"X_{name}": np.asarray(ds.get_embedding_array(name)) for name in ds.get_embedding_names()}

    uns = {}
    colors = ds.get_colors()
    if colors:
        uns["cxg_category_colors"] = colors

    adata = anndata.AnnData(X=X, obs=obs, var=var, obsm=obsm, uns=uns)
    adata.write_zarr(zarr_path)
    ds.cleanup()
    print(f"wrote {zarr_path}: {adata.shape[0]} obs x {adata.shape[1]} var, embeddings={list(obsm)}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2])
