import functools
import os
import tempfile
import threading
from copy import deepcopy
from typing import Optional
from urllib.parse import urlparse

import anndata
import boto3
import numpy as np
import pandas as pd
import scipy.sparse as sp
import zarr
from botocore.exceptions import BotoCoreError, ClientError

from server.common.constants import XApproximateDistribution
from server.common.errors import DatasetAccessError
from server.common.fbs.matrix import encode_matrix_fbs
from server.common.utils.type_conversion_utils import (
    get_schema_type_hint_from_dtype,
    get_schema_type_hint_of_array,
)
from server.compute.diffexp_cxg import diffexp_ttest_from_mean_var, mean_var_n
from server.dataset.dataset import Dataset

# Serializes concurrent first-time downloads of the same prefix (lru_cache memoizes the
# *result* but not the compute, so two requests could otherwise download in parallel).
_S3_DOWNLOAD_LOCK = threading.Lock()


@functools.lru_cache(maxsize=8)  # small set of demo datasets per process; not a general cache
def _materialize_s3_zarr(uri: str) -> str:
    """Download an s3:// zarr prefix to a local temp dir and return the path.

    ponytail: the pinned fsspec (0.7.4) is too old for zarr's FSStore array reads
    (FSMap lacks getitems), so we download instead of stream.

    Known limits (acceptable for the demo, not production):
    - Assumes the dataset is immutable: a path present locally is never re-fetched,
      so updates to the same s3 uri won't be picked up until the process restarts.
    - The temp dir is a deliberate cache and is not cleaned up during the process
      lifetime; the OS reclaims tempdir on reboot.
    Upgrade path: bump fsspec/s3fs and read via FSStore, or go lazy (out-of-core)."""
    parsed = urlparse(uri)
    bucket, prefix = parsed.netloc, parsed.path.lstrip("/").rstrip("/") + "/"
    local_root = os.path.join(tempfile.gettempdir(), "zarr_cache", bucket, prefix.rstrip("/"))
    s3 = boto3.client("s3")
    try:
        with _S3_DOWNLOAD_LOCK:
            for page in s3.get_paginator("list_objects_v2").paginate(Bucket=bucket, Prefix=prefix):
                for obj in page.get("Contents", []):
                    rel = obj["Key"][len(prefix) :]
                    if not rel:
                        continue
                    dest = os.path.join(local_root, rel)
                    os.makedirs(os.path.dirname(dest), exist_ok=True)
                    if not os.path.exists(dest):
                        s3.download_file(bucket, obj["Key"], dest)
    except (BotoCoreError, ClientError) as e:
        raise DatasetAccessError(f"Failed to fetch zarr dataset from {uri}: {e}") from None
    return local_root


class ZarrDataset(Dataset):
    """Read-only POC adaptor serving an AnnData .zarr store.

    ponytail: loads the whole AnnData into memory via anndata.read_zarr. Fine for the POC and
    small fixtures; for large out-of-core datasets the upgrade path is anndata lazy reads
    (read_elem / experimental.read_dispatched) or slicing raw zarr arrays directly. Writes
    (user annotations / gene sets) are intentionally not implemented.
    """

    def __init__(self, data_locator, app_config=None):
        super().__init__(data_locator, app_config)
        path = data_locator.uri_or_path
        if str(path).startswith("s3://"):
            path = _materialize_s3_zarr(str(path))
        self.adata = anndata.read_zarr(path)
        self.schema = None
        self._obs_index_name = self.adata.obs.index.name or "name_0"
        self._var_index_name = self.adata.var.index.name or "name_0"

    # ---- lifecycle ---------------------------------------------------------

    @staticmethod
    def pre_load_validation(data_locator):
        if not data_locator.exists():
            raise DatasetAccessError("Dataset does not exist.")

    @staticmethod
    def open(data_locator, app_config):
        return ZarrDataset(data_locator, app_config)

    @staticmethod
    def file_size(data_locator):
        return 0  # POC: not tracked

    def cleanup(self):
        pass

    def get_name(self):
        return "zarr_dataset"

    def get_library_versions(self):
        return {"anndata": anndata.__version__, "zarr": zarr.__version__}

    # ---- shape & axis frames ----------------------------------------------

    def get_shape(self):
        return self.adata.shape

    def _axis_frame(self, axis) -> pd.DataFrame:
        """Return obs/var as a DataFrame with the index promoted to a named column,
        mirroring the cxg layout where the index is stored as a regular attribute."""
        axis = str(axis)
        if axis == "obs":
            df, index_name = self.adata.obs, self._obs_index_name
        else:
            df, index_name = self.adata.var, self._var_index_name
        if index_name in df.columns:
            return df
        out = df.copy()
        out.insert(0, index_name, df.index.to_numpy())
        return out

    def get_obs_columns(self):
        return self._axis_frame("obs").columns

    def get_obs_keys(self):
        return list(self._axis_frame("obs").columns)

    def get_var_keys(self):
        return list(self._axis_frame("var").columns)

    def get_obs_index(self):
        return self.adata.obs.index.to_numpy()

    @staticmethod
    def _as_query_array(series):
        # Base-class filter logic (dataset.py) treats only category/object/boolean as string-like.
        # anndata returns pandas extension "string"/"str" dtype -> coerce to numpy object like CxgDataset.
        if pd.api.types.is_categorical_dtype(series):
            return series.values
        if pd.api.types.is_extension_array_dtype(series.dtype) and not pd.api.types.is_numeric_dtype(series.dtype):
            return np.asarray(series, dtype=object)
        return series.values

    def query_obs_array(self, term_name):
        try:
            return self._as_query_array(self._axis_frame("obs")[term_name])
        except KeyError:
            raise DatasetAccessError("query_obs") from None

    def query_var_array(self, term_name):
        try:
            return self._as_query_array(self._axis_frame("var")[term_name])
        except KeyError:
            raise DatasetAccessError("query_var") from None

    # ---- embeddings --------------------------------------------------------

    def _obsm_key(self, ename):
        return ename if ename in self.adata.obsm else f"X_{ename}"

    def get_embedding_names(self):
        names = [k[2:] if k.startswith("X_") else k for k in self.adata.obsm]
        if not names:
            raise DatasetAccessError("zarr matrix missing embeddings")
        return names

    def get_embedding_array(self, ename, dims=2):
        arr = np.asarray(self.adata.obsm[self._obsm_key(ename)])
        return arr[:, 0:dims]

    # ---- X -----------------------------------------------------------------

    def get_X_array(self, obs_mask=None, var_mask=None):
        X = self.adata.X
        obs_idx = slice(None) if obs_mask is None else np.nonzero(obs_mask)[0]
        var_idx = slice(None) if var_mask is None else np.nonzero(var_mask)[0]
        sub = X[obs_idx, :][:, var_idx]
        if sp.issparse(sub):
            sub = sub.toarray()
        return np.asarray(sub)

    def get_X_array_dtype(self):
        return self.adata.X.dtype

    def get_X_approximate_distribution(self) -> XApproximateDistribution:
        dist = self.adata.uns.get("X_approximate_distribution") if self.adata.uns else None
        if dist == XApproximateDistribution.COUNT.value:
            return XApproximateDistribution.COUNT
        return XApproximateDistribution.NORMAL

    # ---- diffexp (backend-agnostic math, in-memory submatrices) -----------

    def compute_diffexp_ttest(self, setA, setB, top_n=None, lfc_cutoff=None, selector_lists=False):
        if top_n is None:
            top_n = self.app_config.default_dataset__diffexp__top_n
        if lfc_cutoff is None:
            lfc_cutoff = self.app_config.default_dataset__diffexp__lfc_cutoff

        n_obs = self.get_shape()[0]
        rowsA = np.asarray(setA) if selector_lists else np.nonzero(setA)[0]
        rowsB = np.asarray(setB) if selector_lists else np.nonzero(setB)[0]

        dist = self.get_X_approximate_distribution()
        dtype = self.get_X_array_dtype()

        def mask(rows):
            m = np.zeros((n_obs,), dtype=np.bool_)
            m[rows] = True
            return m

        meanA, varA, nA = mean_var_n(self.get_X_array(mask(rowsA)), dist)
        meanB, varB, nB = mean_var_n(self.get_X_array(mask(rowsB)), dist)
        return diffexp_ttest_from_mean_var(
            meanA=meanA.astype(dtype),
            varA=varA.astype(dtype),
            nA=nA,
            meanB=meanB.astype(dtype),
            varB=varB.astype(dtype),
            nB=nB,
            top_n=top_n,
            diffexp_lfc_cutoff=lfc_cutoff,
        )

    # ---- metadata: colors, uns, genesets ----------------------------------

    def get_colors(self):
        if not self.adata.uns:
            return dict()
        colors = self.adata.uns.get("cxg_category_colors", dict())
        return dict(colors)

    def get_uns(self, metadata_key):
        if not self.adata.uns:
            return None
        return self.adata.uns.get(metadata_key)

    def get_genesets(self, user_id: Optional[str] = None):
        return {"genesets": [], "tid": 0}

    # ---- schema ------------------------------------------------------------

    def _column_schema(self, name, series, axis):
        hint = get_schema_type_hint_of_array(series)
        schema = dict(name=name, writable=False, **hint)
        # cellxgene client treats obs booleans as categorical
        if axis == "obs" and schema.get("type") == "boolean":
            schema["type"] = "categorical"
            schema["categories"] = [str(c) for c in pd.Categorical(series.astype("bool")).categories.tolist()]
        return schema

    def _get_schema(self):
        shape = self.get_shape()
        dataframe = {
            "nObs": shape[0],
            "nVar": shape[1],
            **get_schema_type_hint_from_dtype(dtype=self.get_X_array_dtype(), allow_int64=True),
        }

        annotations = {}
        for ax, index_name in (("obs", self._obs_index_name), ("var", self._var_index_name)):
            frame = self._axis_frame(ax)
            cols = []
            for name in frame.columns:
                col = self._column_schema(name, frame[name], ax)
                # cxg skips int64 obs columns; mirror so the client filter logic matches
                if ax == "obs" and col.get("type") in ("int64", "uint64"):
                    continue
                cols.append(col)
            annotations[ax] = dict(columns=cols, index=index_name)

        obs_layout = []
        for ename in self.get_embedding_names():
            ndim = np.asarray(self.adata.obsm[self._obsm_key(ename)]).shape[1]
            obs_layout.append({"name": ename, "type": "float32", "dims": [f"{ename}_{d}" for d in range(ndim)]})

        return {"dataframe": dataframe, "annotations": annotations, "layout": {"obs": obs_layout}}

    def get_schema(self, user_id: Optional[str] = None):
        if self.schema is None:
            self.schema = self._get_schema()
        return deepcopy(self.schema)

    # ---- annotations -> fbs ------------------------------------------------

    def annotation_to_fbs_matrix(self, axis, fields=None, num_bins=None, user_id: Optional[str] = None):
        frame = self._axis_frame(axis)
        if fields:
            missing = [f for f in fields if f not in frame.columns]
            if missing:
                raise KeyError(missing[0])
            df = frame[list(fields)].copy()
        else:
            df = frame.copy()
        return encode_matrix_fbs(df, col_idx=df.columns, num_bins=num_bins)

    # ---- writes: not supported in read-only POC ---------------------------

    def get_saved_obs_annotations(self, user_id: Optional[str] = None):
        return None

    def get_saved_gene_sets(self, user_id: Optional[str] = None):
        return None

    def save_obs_annotations(self, dataframe, user_id: Optional[str] = None):
        raise NotImplementedError("ZarrDataset is read-only (POC)")

    def save_gene_sets(self, genesets_payload, tid: Optional[int] = None, user_id: Optional[str] = None):
        raise NotImplementedError("ZarrDataset is read-only (POC)")
