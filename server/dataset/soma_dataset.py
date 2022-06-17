import json
import logging
import os
import threading

import numpy as np
import pandas as pd
import tiledb
from server_timing import Timing as ServerTiming
from tiledb import TileDBError

from server.common.constants import XApproximateDistribution
from server.common.errors import DatasetAccessError, ConfigurationError
from server.common.fbs.matrix import encode_matrix_fbs
from server.common.immutable_kvcache import ImmutableKVCache
from server.common.utils.type_conversion_utils import get_schema_type_hint_from_dtype
from server.common.utils.utils import path_join
from server.compute import diffexp_cxg
from server.compute import diffexp_soma
from server.dataset.cxg_util import pack_selector_from_mask
from server.dataset.dataset import Dataset


from abc import ABCMeta, abstractmethod
from os.path import basename, splitext

import numpy as np
import pandas as pd
from scipy import sparse

from server.common.config.app_config import AppConfig
from server.common.constants import Axis, XApproximateDistribution
from server.common.errors import (
    FilterError,
    JSONEncodingValueError,
    ExceedsLimitError,
    UnsupportedSummaryMethod,
    DatasetAccessError,
)
from server.common.utils.utils import jsonify_numpy
from server.common.fbs.matrix import encode_matrix_fbs

import tiledbsc

class SomaDataset(Dataset):

    def __init__(self, data_locator, app_config=None):
        super().__init__(data_locator, app_config)
        self.lock = threading.Lock()

        self.url = data_locator.uri_or_path
        if self.url[-1] != "/":
            self.url += "/"

        # caching immutable state
        # TODO: for ease of use, keep the caches out
        # self.lsuri_results = ImmutableKVCache(lambda key: self._lsuri(uri=key, tiledb_ctx=self.tiledb_ctx))
        # self.arrays = ImmutableKVCache(lambda key: self._open_array(uri=key, tiledb_ctx=self.tiledb_ctx))
        self.schema = None
        self.X_approximate_distribution = None

        self._soma = tiledbsc.SOMA(self.url)

        self._validate_and_initialize()

    def cleanup(self):
        """close all the open tiledb arrays"""
        for array in self.arrays.values():
            array.close()
        self.arrays.clear()

    @staticmethod
    # TODO: I guess we'll need a TileDB context here
    def set_tiledb_context(context_params):
        """Set the tiledb context.  This should be set before any instances of CxgDataset are created"""
        try:
            SomaDataset.tiledb_ctx = tiledb.Ctx(context_params)

        except tiledb.libtiledb.TileDBError as e:
            if e.message == "Global context already initialized!":
                if tiledb.default_ctx().config().dict() != SomaDataset.tiledb_ctx.config().dict():
                    raise ConfigurationError("Cannot change tiledb configuration once it is set")
            else:
                raise ConfigurationError(f"Invalid tiledb context: {str(e)}")

    @staticmethod
    def pre_load_validation(data_locator):
        location = data_locator.uri_or_path
        if not SomaDataset.isvalid(location):
            logging.error(f"SOMA matrix is not valid: {location}")
            raise DatasetAccessError("SOMA matrix is not valid")

    @staticmethod
    def file_size(data_locator):
        return 0

    @staticmethod
    def open(data_locator, app_config):
        return SomaDataset(data_locator, app_config)

    def get_about(self):
        return "TODO"

    def get_title(self):
        return "TODO"

    def get_corpora_props(self):
        return "TODO"

    def get_name(self):
        return "cellxgene cxg adaptor version"

    def get_library_versions(self):
        return dict(tiledb=tiledb.__version__)

    def get_path(self, *urls):
        return path_join(self.url, *urls)

    @staticmethod
    def _lsuri(uri, tiledb_ctx):
        def _cleanpath(p):
            if p[-1] == "/":
                return p[:-1]
            else:
                return p

        result = []
        tiledb.ls(uri, lambda path, type: result.append((_cleanpath(path), type)), ctx=tiledb_ctx)
        return result

    def lsuri(self, uri):
        """
        given a URI, do a tiledb.ls but normalizing for all path weirdness:
        * S3 URIs require trailing slash.  file: doesn't care.
        * results on S3 *have* a trailing slash, Posix does not.

        returns list of (absolute paths, type) *without* trailing slash
        in the path.
        """
        if uri[-1] != "/":
            uri += "/"
        return self.lsuri_results[uri]

    @staticmethod
    def isvalid(url):
        """
        Return True if this looks like a valid CXG, False if not.  Just a quick/cheap
        test, not to be fully trusted.
        """
        # TODO: needed?
        return True

    def has_array(self, name):
        a_type = tiledb.object_type(path_join(self.url, name), ctx=self.tiledb_ctx)
        return a_type == "array"

    def _validate_and_initialize(self):
        # TODO: any SOMA validations needed?
        pass

    @staticmethod
    def _open_array(uri, tiledb_ctx):
        raise NotImplementedError

    def open_array(self, name):
        # TODO: caching
        return getattr(self._soma, name)

    def get_embedding_array(self, ename, dims=2):
        # TODO: force the sorting
        emb = self._soma.obsm[f"X_{ename}"]
        A = emb.df().iloc[:, 0:dims]
        return A.to_numpy()

    def compute_diffexp_ttest(self, setA, setB, top_n=None, lfc_cutoff=None, arr="X", selector_lists=False):
        if top_n is None:
            top_n = self.dataset_config.diffexp__top_n
        if lfc_cutoff is None:
            lfc_cutoff = self.dataset_config.diffexp__lfc_cutoff
        return diffexp_soma.diffexp_ttest(
            adaptor=self,
            setA=setA,
            setB=setB,
            top_n=top_n,
            diffexp_lfc_cutoff=lfc_cutoff,
            arr=arr,
            selector_lists=selector_lists,
        )

    def get_colors(self):
        # TODO
        return dict()

    def __remap_indices(self, coord_range, coord_mask, coord_data):
        """
        This function maps the indices in coord_data, which could be in the range [0,coord_range), to
        a range that only includes the number of indices encoded in coord_mask.
        coord_range is the maxinum size of the range (e.g. get_shape()[0] or get_shape()[1])
        coord_mask is a mask passed into the get_X_array, of size coord_range
        coord_data are indices representing locations of non-zero values, in the range [0,coord_range).

        For example, say
        coord_mask = [1,0,1,0,0,1]
        coord_data = [2,0,2,2,5]

        The function computes the following:
        indices = [0,2,5]
        ncoord = 3
        maprange = [0,1,2]
        mapindex = [0,0,1,0,0,2]
        coordindices = [1,0,1,1,2]
        """
        if coord_mask is None:
            return coord_range, coord_data

        indices = coord_mask.nonzero()[0]
        ncoord = indices.shape[0]
        maprange = np.arange(ncoord)
        mapindex = np.zeros(indices[-1] + 1, dtype=int)
        mapindex[indices] = maprange
        coordindices = mapindex[coord_data]
        return ncoord, coordindices

    def get_X_array(self, obs_mask=None, var_mask=None):
        raise NotImplementedError

        X = self.open_array("X")
        var = self.open_array("var")

        # TODO: this is only for var for now. extend to obs
        df = var.df()
        var_ids = df[df["feature_name"].isin(vars)] # TODO: use the correct filter name
        var_ids.index.tolist()

        print("---- got here")
        obs_items = pack_selector_from_mask(obs_mask)
        var_items = pack_selector_from_mask(var_mask)
        if obs_items is None or var_items is None:
            # If either zero rows or zero columns were selected, return an empty 2d array.
            shape = self.get_shape()
            obs_size = 0 if obs_items is None else shape[0] if obs_mask is None else np.count_nonzero(obs_mask)
            var_size = 0 if var_items is None else shape[1] if var_mask is None else np.count_nonzero(var_mask)
            return np.ndarray((obs_size, var_size))

        print("--- var_items", var_items)
        print("--- obs_items", obs_items)

        var_ids = var.df().iloc[var_items].index.tolist()

        print(obs_items, var_items)
        data = X.data.dim_select(obs_items, var_ids)

        nrows, obsindices = self.__remap_indices(X.shape[0], obs_mask, data.get("coords", data)["obs"])
        ncols, varindices = self.__remap_indices(X.shape[1], var_mask, data.get("coords", data)["var"])
        densedata = np.zeros((nrows, ncols), dtype=self.get_X_array_dtype())
        densedata[obsindices, varindices] = data[""]

        return densedata

    def get_X_approximate_distribution(self) -> XApproximateDistribution:
        return self.X_approximate_distribution

    def get_shape(self):
        obs = self._soma.obs
        var = self._soma.var
        return (obs.shape()[0], var.shape()[0])

    def get_X_array_dtype(self):
        raise NotImplementedError

    def query_var_array(self, term_name):
        var = self.open_array("var")
        data = var.df()[term_name].to_numpy()
        return data

    def query_obs_array(self, term_name):
        obs = self.open_array("obs")
        try:
            data = obs.df()[term_name].to_numpy()
        except tiledb.libtiledb.TileDBError:
            raise DatasetAccessError("query_obs")
        return data

    def get_obs_names(self):
        raise NotImplementedError

    def get_obs_index(self):
        raise NotImplementedError

    def get_obs_columns(self):
        raise NotImplementedError

    def get_obs_keys(self):
        return self._soma.obs.keys()

    def get_var_keys(self):
        return self._soma.var.keys()

    def get_embedding_names(self):
        obsm = self._soma.obsm
        return [key[2:] for key in obsm.keys()]

    def get_schema(self):
        shape = self.get_shape()
        dtype = np.float32 # TODO: fix this

        dataframe = {"nObs": shape[0], "nVar": shape[1], "type": "float32"}

        annotations = {}
        for ax in ("obs", "var"):
            A = self.open_array(ax)
            df = A.df()
            cols = []
            for col_name in df:
                col = df[col_name]
                dtype = col.dtype
                if dtype == np.uint8:
                    is_bool = col.unique() in [0,1]
                    if is_bool:
                        cols.append({"name": col_name, "type": "boolean"})
                elif dtype == np.object:
                    cats = col.unique().tolist()
                    cols.append({"name": col_name, "type": "categorical", "categories": cats})
                elif dtype == np.float64: # TODO: FE requires float32 as type annotation
                    cols.append({"name": col_name, "type": "float32"})
                else:
                    cols.append({"name": col_name, "type": str(dtype)})

            annotations[ax] = dict(columns=cols)
        
        # TODO: this isn't currently indexed in SOMA, but the FE won't work properly without this field
        annotations["var"].update({"index": "feature_name"})
     
        obs_layout = []
        embeddings = self.get_embedding_names()
        for ename in embeddings:
            A = self._soma.obsm[f"X_{ename}"]
            # TODO: is there any case where there can be more than 2 dimensions?
            obs_layout.append({"name": ename, "type": "float32", "dims": [f"{ename}_{d}" for d in range(0, 2)]})

        schema = {"dataframe": dataframe, "annotations": annotations, "layout": {"obs": obs_layout}}
        return schema

    def annotation_to_fbs_matrix(self, axis, fields=None):
        with ServerTiming.time(f"annotations.{axis}.query"):
            A = self.open_array(str(axis))

            try:
                if not fields:
                    df = A.df()
                else:
                    df = A.df()[fields]
            except TileDBError as e:
                raise KeyError(e)

        with ServerTiming.time(f"annotations.{axis}.encode"):
            fbs = encode_matrix_fbs(df, col_idx=df.columns)

        return fbs

    def summarize_var(self, method, filter, query_hash):
        if method != "mean":
            raise UnsupportedSummaryMethod("Unknown gene set summary method.")

        if "obs" in filter:
            raise FilterError("filtering on obs unsupported")

        # TODO: index is another possible filter, but I don't know where it is used
        var_filter = filter.get("var")
        if "annotation_value" not in var_filter:
            raise FilterError("filtering must be done on annotation_value")

        var_selector = var_filter["annotation_value"][0]["values"]
        col_name = var_filter["annotation_value"][0]["name"]

        # {'var': {'annotation_value': [{'name': 'feature_name', 'values': ['GJA4', 'ADIRF', 'MYL9', 'MYH11', 'TAGLN', 'MT1A', 'ACTA2', 'TINAGL1', 'TPM2', 'ADAMTS4', 'PDK4', 'TPPP3', 'MT1M', 'CALD1', 'DSTN']}]}}

        df = self.open_array("var").df()
        
        var_ids = df[df[col_name].isin(var_selector)] # TODO: potential performance bottleneck
        var_ids = var_ids.index.tolist()

        X = self.open_array("X")["data"]
        obs = self.open_array("obs")

        df = X.dim_select(None, var_ids)
        df.reset_index(inplace=True)
        coo = tiledbsc.util.X_and_ids_to_sparse_matrix(df, 'obs_id', 'var_id', 'value', obs.ids(), var_ids)
        mean = coo.mean(axis=1).A

        col_idx = pd.Index([query_hash])
        return encode_matrix_fbs(mean, col_idx=col_idx, row_idx=None)
        
    def data_frame_to_fbs_matrix(self, filter, axis):
        """
        Retrieves data 'X' and returns in a flatbuffer Matrix.
        :param filter: filter: dictionary with filter params
        :param axis: string obs or var
        :return: flatbuffer Matrix

        Caveats:
        * currently only supports access on VAR axis
        * currently only supports filtering on VAR axis
        """
        if axis != Axis.VAR:
            raise ValueError("Only VAR dimension access is supported")

        var_filter = filter.get("var")
        if "annotation_value" not in var_filter:
            raise FilterError("filtering must be done on annotation_value")

        var_selector = var_filter["annotation_value"][0]["values"]
        col_name = var_filter["annotation_value"][0]["name"]

        df = self.open_array("var").df()
        var_ids = df[df[col_name].isin(var_selector)]
        var_ids = var_ids.index.tolist()

        X = self.open_array("X")["data"]
        obs = self.open_array("obs")

        df = X.dim_select(None, var_ids)
        df.reset_index(inplace=True)
        coo = tiledbsc.util.X_and_ids_to_sparse_matrix(df, 'obs_id', 'var_id', 'value', obs.ids(), var_ids)
        mat = coo.todense().A

        tdf = self.open_array("var").df()
        tdf = tdf.reset_index()
        z = tdf[tdf[col_name].isin(var_selector)] # TODO
        col_idx = z.index.to_numpy()

        return encode_matrix_fbs(mat, col_idx=col_idx, row_idx=None)