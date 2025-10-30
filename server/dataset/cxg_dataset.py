import contextlib
import json
import logging
import os
import pickle  # TODO: remove this after 5.3.0 migration
import threading
from copy import deepcopy
from typing import Any, Dict, Optional
from urllib.parse import quote, unquote

import numpy as np
import pandas as pd
import tiledb
from packaging import version
from pandas.api.types import is_categorical_dtype
from server_timing import Timing as ServerTiming
from tiledb import TileDBError

from server.common.cache.atac_cache import CYTOBAND_DATA_CACHE, GENE_DATA_CACHE
from server.common.constants import ATAC_BIN_SIZE, ATAC_RANGE_BUFFER, XApproximateDistribution
from server.common.errors import ConfigurationError, DatasetAccessError
from server.common.fbs.matrix import encode_matrix_fbs
from server.common.immutable_kvcache import ImmutableKVCache
from server.common.utils.type_conversion_utils import get_schema_type_hint_from_dtype
from server.common.utils.utils import path_join
from server.compute import diffexp_cxg
from server.dataset.cxg_util import pack_selector_from_mask
from server.dataset.dataset import Dataset


class CxgDataset(Dataset):
    # These defaults are overridden by the config variable: server.adaptor.cxg_adaptor.tiledb_cxt
    tiledb_ctx = tiledb.Ctx(
        {
            "sm.tile_cache_size": 8 * 1024**3,
            "py.init_buffer_bytes": 512 * 1024**2,
            "vfs.s3.region": "us-west-2",
        }
    )

    def __init__(self, data_locator, app_config=None):
        super().__init__(data_locator, app_config)
        self.lock = threading.Lock()

        self.url = data_locator.uri_or_path
        if self.url[-1] != "/":
            self.url += "/"

        # Extract dataset name from URL
        self.dataset_name = self._extract_dataset_name()

        # caching immutable state
        self.lsuri_results = ImmutableKVCache(lambda key: self._lsuri(uri=key, tiledb_ctx=self.tiledb_ctx))
        self.arrays = ImmutableKVCache(lambda key: self._open_array(uri=key, tiledb_ctx=self.tiledb_ctx))
        self.schema = None
        self.genesets = None
        self.X_approximate_distribution = None

        self._validate_and_initialize()

    @staticmethod
    def _encode_component(component: str) -> str:
        return quote(component, safe="")

    @staticmethod
    def _decode_component(component: str) -> str:
        try:
            return unquote(component)
        except Exception:
            return component

    @staticmethod
    def _make_json_safe(value: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, (np.generic,)):
            return value.item()
        if isinstance(value, (pd.Timestamp,)):
            return value.isoformat()
        if isinstance(value, (np.datetime64,)):
            return pd.Timestamp(value).isoformat()
        return value

    def _extract_dataset_name(self) -> str:
        """Extract dataset name from URL, keeping .cxg suffix."""
        # Remove trailing slash if present
        url = self.url.rstrip("/")

        # Extract the last path component (dataset name with .cxg)
        dataset_name = os.path.basename(url)

        return dataset_name

    def _get_centralized_user_data_bucket(self) -> str:
        """Get the centralized user data bucket from the /w/ dataroot configuration.
        Returns None if no centralized bucket is configured."""
        dataroots = self.app_config.server__multi_dataset__dataroots

        # Find the /w/ dataroot (byod_workflows in the config)
        for _, dataroot_config in dataroots.items():
            if dataroot_config["base_url"] == "w":
                return dataroot_config["dataroot"]

        # Second: Check if single dataroot is configured (dataroot option)
        single_dataroot = self.app_config.server__multi_dataset__dataroot
        if single_dataroot:
            return single_dataroot

        # No centralized bucket configured
        return None

    def _user_root_uri(self, user_id: str) -> str:
        # Try to get the centralized user data bucket
        centralized_bucket = self._get_centralized_user_data_bucket()

        if centralized_bucket:
            # All user data goes to the centralized user data bucket
            # Format: s3://byod-workflows-{env}/user-data/user_id/dataset_name/
            return path_join(
                centralized_bucket,
                "user-data",
                self._encode_component(user_id),
                self._encode_component(self.dataset_name),
            )
        else:
            # Fallback to old behavior: store alongside dataset
            return path_join(self.url, self._encode_component(user_id))

    def _ensure_group(self, uri: str) -> None:
        try:
            obj_type = tiledb.object_type(uri, ctx=self.tiledb_ctx)
        except TileDBError:
            obj_type = None

        if obj_type is None:
            vfs = tiledb.VFS(ctx=self.tiledb_ctx)
            if not vfs.is_dir(uri):
                if not uri.startswith("s3://"):
                    # For local filesystem paths, use os.makedirs for recursive creation
                    os.makedirs(uri, exist_ok=True)
                else:
                    # For S3 paths, use TileDB VFS create_dir
                    vfs.create_dir(uri)
            tiledb.group_create(uri, ctx=self.tiledb_ctx)
        elif obj_type != "group":
            raise DatasetAccessError(f"Annotation storage path collision at {uri}")

    def _ensure_user_storage(self, user_id: str) -> str:
        user_root = self._user_root_uri(user_id)
        self._ensure_group(user_root)
        return user_root

    def _annotation_array_uri(self, user_root_uri: str, column_name: str) -> str:
        return path_join(user_root_uri, self._encode_component(column_name))

    def _ensure_annotation_array(self, array_uri: str, length: int) -> None:
        if length <= 0:
            return

        try:
            obj_type = tiledb.object_type(array_uri, ctx=self.tiledb_ctx)
        except TileDBError:
            obj_type = None

        if obj_type == "array":
            try:
                with tiledb.open(array_uri, mode="r", ctx=self.tiledb_ctx) as arr:
                    dim = arr.schema.domain.dim(0)
                    attr = arr.schema.attr(0)
                    domain = dim.domain
                    dtype = attr.dtype
                if domain != (0, length - 1) or dtype != np.int32:
                    tiledb.remove(array_uri, ctx=self.tiledb_ctx)
                    obj_type = None
            except TileDBError:
                tiledb.remove(array_uri, ctx=self.tiledb_ctx)
                obj_type = None

        if obj_type is None:
            dim = tiledb.Dim(
                name="obs_idx",
                domain=(0, length - 1),
                tile=max(1, min(length, 1024)),
                dtype=np.int64,
            )
            attr = tiledb.Attr(name="value", dtype=np.int32)
            schema = tiledb.ArraySchema(
                domain=tiledb.Domain(dim),
                attrs=(attr,),
                cell_order="C",
                tile_order="C",
                sparse=False,
            )
            tiledb.DenseArray.create(array_uri, schema, ctx=self.tiledb_ctx)

    def _list_annotation_arrays(self, user_root_uri: str) -> Dict[str, str]:
        arrays: Dict[str, str] = {}
        try:
            entries = []
            tiledb.ls(user_root_uri, lambda path, obj: entries.append((path.rstrip("/"), obj)), ctx=self.tiledb_ctx)
        except TileDBError:
            return arrays

        for path, obj_type in entries:
            if obj_type != "array":
                continue
            column_name: Optional[str] = None
            try:
                with tiledb.open(path, mode="r", ctx=self.tiledb_ctx) as arr:
                    column_name = arr.meta.get("column_name", None)
                    if isinstance(column_name, bytes):
                        column_name = column_name.decode("utf-8")
            except TileDBError:
                continue
            if not column_name:
                column_name = self._decode_component(os.path.basename(path))
            arrays[str(column_name)] = path
        return arrays

    def _write_annotation_column(
        self,
        user_root_uri: str,
        column_name: str,
        series: pd.Series,
        n_obs: int,
    ) -> None:
        categorical = pd.Categorical(series)
        if len(categorical) != n_obs:
            raise DatasetAccessError("Annotation length mismatch with dataset")

        categories = [self._make_json_safe(value) for value in categorical.categories.tolist()]
        codes = categorical.codes.astype(np.int32, copy=False)

        array_uri = self._annotation_array_uri(user_root_uri, column_name)
        temp_array_uri = f"{array_uri}.tmp"

        # Write to temporary location first
        self._ensure_annotation_array(temp_array_uri, n_obs)

        try:
            with tiledb.open(temp_array_uri, mode="w", ctx=self.tiledb_ctx) as arr:
                arr[:] = codes.reshape((n_obs,))
                arr.meta["value_kind"] = "categorical"
                arr.meta["column_name"] = column_name
                arr.meta["categories"] = json.dumps(categories)
                arr.meta["ordered"] = json.dumps(bool(categorical.ordered))

            # Atomic move: only after successful write
            vfs = tiledb.VFS(ctx=self.tiledb_ctx)

            # Remove existing array if it exists
            if vfs.is_dir(array_uri):
                with contextlib.suppress(TileDBError):
                    tiledb.remove(array_uri, ctx=self.tiledb_ctx)

            # Move temp to final location (as atomic as possible)
            vfs.move_dir(temp_array_uri, array_uri)

        except Exception:
            # Clean up temp array on any failure
            try:
                if tiledb.object_type(temp_array_uri, ctx=self.tiledb_ctx) == "array":
                    tiledb.remove(temp_array_uri, ctx=self.tiledb_ctx)
            except TileDBError:
                pass  # Best effort cleanup
            raise

    def _load_annotation_column(self, array_uri: str) -> Optional[pd.Series]:
        try:
            with tiledb.open(array_uri, mode="r", ctx=self.tiledb_ctx) as arr:
                # Read data and check what we actually got
                data = arr[:]

                # Handle different data formats that might be returned
                if isinstance(data, dict):
                    # If we get a dict, try to extract the 'value' attribute
                    if "value" in data:
                        raw = np.array(data["value"], dtype=np.int32).reshape(-1)
                    else:
                        logging.warning(f"TileDB array {array_uri} returned dict without 'value' key: {data}")
                        return None
                else:
                    try:
                        raw = np.array(data, dtype=np.int32).reshape(-1)
                    except (TypeError, ValueError) as e:
                        logging.warning(
                            f"Failed to convert TileDB array data to int32 for {array_uri}: {type(data)}, {e}"
                        )
                        return None

                column_name = arr.meta.get("column_name")
                if isinstance(column_name, bytes):
                    column_name = column_name.decode("utf-8")
                if not column_name:
                    column_name = self._decode_component(os.path.basename(array_uri))
                value_kind = arr.meta.get("value_kind", "categorical")
                if value_kind != "categorical":
                    return None
                categories_meta = arr.meta.get("categories")
                ordered_meta = arr.meta.get("ordered")
        except TileDBError as e:
            logging.warning(f"TileDB error reading {array_uri}: {e}")
            return None

        if categories_meta is None:
            return None

        try:
            categories = json.loads(categories_meta)
        except (TypeError, json.JSONDecodeError):
            logging.warning("Failed to decode categories metadata for %s", array_uri)
            return None

        ordered = False
        if ordered_meta is not None:
            try:
                ordered = bool(json.loads(ordered_meta))
            except (TypeError, json.JSONDecodeError):
                ordered = False

        categorical = pd.Categorical.from_codes(raw, categories=categories, ordered=ordered)
        return pd.Series(categorical, name=column_name)

    def _load_obs_annotations_from_storage(self, user_id: str) -> Optional[pd.DataFrame]:
        user_root_uri = self._user_root_uri(user_id)
        arrays = self._list_annotation_arrays(user_root_uri)
        if not arrays:
            return None

        columns = {}
        for column_name, array_uri in arrays.items():
            series = self._load_annotation_column(array_uri)
            if series is not None:
                columns[column_name] = series.reset_index(drop=True)

        if not columns:
            return None

        return pd.DataFrame(columns)

    def _genesets_uri(self, user_id: str) -> str:
        return path_join(self._user_root_uri(user_id), "genesets.json")

    def _write_user_genesets(self, user_id: str, payload: Dict[str, Any]) -> None:
        user_root_uri = self._ensure_user_storage(user_id)
        genesets_uri = path_join(user_root_uri, "genesets.json")
        vfs = tiledb.VFS(ctx=self.tiledb_ctx)
        serialized = json.dumps(payload)
        with vfs.open(genesets_uri, "wb") as handle:
            handle.write(serialized.encode("utf-8"))

    def _read_user_genesets(self, user_id: str) -> Optional[Dict[str, Any]]:
        genesets_uri = self._genesets_uri(user_id)
        vfs = tiledb.VFS(ctx=self.tiledb_ctx)
        if not vfs.is_file(genesets_uri):
            return None
        try:
            with vfs.open(genesets_uri, "rb") as handle:
                raw = handle.read()
        except TileDBError:
            return None

        try:
            return json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            logging.warning("Failed to parse genesets payload at %s", genesets_uri)
            return None

    def cleanup(self):
        """close all the open tiledb arrays"""
        for array in self.arrays.values():
            array.close()
        self.arrays.clear()

    def save_obs_annotations(
        self,
        dataframe: pd.DataFrame,
        user_id: Optional[str] = None,
    ) -> None:
        if user_id is None:
            raise ValueError("User ID is required for saving annotations")

        n_obs, _ = self.get_shape()
        if n_obs <= 0:
            return

        user_root_uri = self._ensure_user_storage(user_id)
        existing = self._list_annotation_arrays(user_root_uri)

        if dataframe is not None and not dataframe.empty:
            for column in dataframe.columns:
                self._write_annotation_column(user_root_uri, column, dataframe[column], n_obs)
                existing.pop(column, None)

    def delete_obs_annotation_category(
        self,
        category_name: str,
        user_id: Optional[str] = None,
    ) -> None:
        """Delete a user annotation category by removing its TileDB array."""
        if user_id is None:
            raise ValueError("User ID is required for deleting annotation category")

        if not category_name or not isinstance(category_name, str):
            raise ValueError("Category name must be a non-empty string")

        user_root_uri = self._user_root_uri(user_id)
        existing_arrays = self._list_annotation_arrays(user_root_uri)

        if category_name not in existing_arrays:
            raise DatasetAccessError(f"Annotation category '{category_name}' not found")

        array_uri = existing_arrays[category_name]
        try:
            # Remove the TileDB array
            tiledb.remove(array_uri, ctx=self.tiledb_ctx)
            logging.info(f"Deleted annotation category '{category_name}' for user {user_id}")
        except TileDBError as e:
            raise DatasetAccessError(f"Failed to delete annotation category '{category_name}': {str(e)}") from e

    def rename_obs_annotation_category(
        self,
        old_category_name: str,
        new_category_name: str,
        user_id: Optional[str] = None,
    ) -> None:
        """Rename a user annotation category by renaming its TileDB array."""
        if user_id is None:
            raise ValueError("User ID is required for renaming annotation category")

        if not old_category_name or not isinstance(old_category_name, str):
            raise ValueError("Old category name must be a non-empty string")

        if not new_category_name or not isinstance(new_category_name, str):
            raise ValueError("New category name must be a non-empty string")

        if old_category_name == new_category_name:
            return  # No-op if names are the same

        user_root_uri = self._user_root_uri(user_id)
        existing_arrays = self._list_annotation_arrays(user_root_uri)

        if old_category_name not in existing_arrays:
            raise DatasetAccessError(f"Annotation category '{old_category_name}' not found")

        if new_category_name in existing_arrays:
            raise DatasetAccessError(f"Annotation category '{new_category_name}' already exists")

        old_array_uri = existing_arrays[old_category_name]
        new_array_uri = self._annotation_array_uri(user_root_uri, new_category_name)

        try:
            # Check if VFS supports move operation (works for both filesystem and S3)
            vfs = tiledb.VFS(ctx=self.tiledb_ctx)

            # Try VFS move first - this is atomic and works for both filesystem and S3
            try:
                vfs.move_dir(old_array_uri, new_array_uri)

                # Update the column_name metadata in the moved array
                with tiledb.open(new_array_uri, mode="w", ctx=self.tiledb_ctx) as new_arr:
                    new_arr.meta["column_name"] = new_category_name

                logging.info(
                    f"Renamed annotation category '{old_category_name}' to '{new_category_name}' using VFS move"
                )
                return

            except TileDBError:
                # VFS move failed, fall back to copy-delete approach
                logging.warning(f"VFS move failed for '{old_category_name}', falling back to copy-delete")
                pass

            logging.info(
                f"Renamed annotation category '{old_category_name}' to '{new_category_name}' using copy-delete"
            )

        except TileDBError as e:
            # If something went wrong, try to clean up the new array if it was created
            try:
                if tiledb.object_type(new_array_uri, ctx=self.tiledb_ctx) == "array":
                    tiledb.remove(new_array_uri, ctx=self.tiledb_ctx)
            except TileDBError:
                pass  # Ignore cleanup errors

            raise DatasetAccessError(
                f"Failed to rename annotation category '{old_category_name}' to '{new_category_name}': {str(e)}"
            ) from e

    def get_saved_obs_annotations(
        self,
        user_id: Optional[str] = None,
    ) -> Optional[pd.DataFrame]:
        """Always load user annotations from persistent storage (S3/filesystem)."""
        if user_id is None:
            return None
        return self._load_obs_annotations_from_storage(user_id)

    def save_gene_sets(
        self,
        genesets_payload,
        tid: Optional[int] = None,
        user_id: Optional[str] = None,
    ) -> None:
        if user_id is None:
            raise ValueError("User ID is required for saving gene sets")

        # Get current state from storage to determine TID
        persisted = self.get_saved_gene_sets(user_id=user_id) or {}
        current_tid = persisted.get("tid", 0)

        if tid is None:
            tid = current_tid + 1
        if tid <= current_tid:
            raise ValueError("TID must be greater than previous saved value")

        payload = {
            "tid": tid,
            "genesets": genesets_payload,
        }

        self._write_user_genesets(user_id, payload)

    def get_saved_gene_sets(
        self,
        user_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Always load user gene sets from persistent storage (S3/filesystem)."""
        if user_id is None:
            return None
        return self._read_user_genesets(user_id)

    def write_user_embedding(
        self,
        user_root_uri: str,
        embedding_name: str,
        coordinates: np.ndarray,  # shape (n_cells, 2)
    ) -> None:
        """
        TEMPORARY: For stub testing only. Will be removed once Argo workflows
        handle embedding generation and persistence.

        Write a user-generated embedding to TileDB in the user-data location.
        """
        if coordinates.shape[1] != 2:
            raise ValueError("Embedding coordinates must be 2D (n_cells, 2)")

        n_cells = coordinates.shape[0]
        if n_cells <= 0:
            return

        # Ensure emb/ subdirectory exists
        emb_root = path_join(user_root_uri, "emb")
        self._ensure_group(emb_root)

        # Create embedding array URI
        embedding_uri = path_join(emb_root, embedding_name)
        temp_embedding_uri = f"{embedding_uri}.tmp"

        # Create TileDB schema for 2D dense array (based on vcp-workflows)
        filters = tiledb.FilterList([tiledb.ZstdFilter()])
        attrs = [tiledb.Attr(dtype=coordinates.dtype, filters=filters)]
        dimensions = [
            tiledb.Dim(
                domain=(0, n_cells - 1),
                tile=min(n_cells, 1000),
                dtype=np.uint32,
            ),
            tiledb.Dim(
                domain=(0, 1),  # 2D embedding (x, y)
                tile=2,
                dtype=np.uint32,
            ),
        ]
        domain = tiledb.Domain(*dimensions)
        schema = tiledb.ArraySchema(
            domain=domain,
            sparse=False,
            attrs=attrs,
            capacity=1_000_000,
            cell_order="row-major",
            tile_order="row-major",
        )

        # Write to temporary location first
        tiledb.DenseArray.create(temp_embedding_uri, schema, ctx=self.tiledb_ctx)

        try:
            with tiledb.open(temp_embedding_uri, mode="w", ctx=self.tiledb_ctx) as arr:
                arr[:] = coordinates
                # Add metadata similar to other CXG arrays
                arr.meta["embedding_name"] = embedding_name
                arr.meta["n_cells"] = str(n_cells)
                arr.meta["dims"] = "2"

            # Atomic move: only after successful write
            vfs = tiledb.VFS(ctx=self.tiledb_ctx)

            # Remove existing array if it exists
            if vfs.is_dir(embedding_uri):
                with contextlib.suppress(TileDBError):
                    tiledb.remove(embedding_uri, ctx=self.tiledb_ctx)

            # Move temp to final location (as atomic as possible)
            vfs.move_dir(temp_embedding_uri, embedding_uri)

        except Exception:
            # Clean up temp array on any failure
            try:
                if tiledb.object_type(temp_embedding_uri, ctx=self.tiledb_ctx) == "array":
                    tiledb.remove(temp_embedding_uri, ctx=self.tiledb_ctx)
            except TileDBError:
                pass  # Best effort cleanup
            raise

    @staticmethod
    def set_tiledb_context(context_params):
        """Set the tiledb context.  This should be set before any instances of CxgDataset are created"""
        try:
            CxgDataset.tiledb_ctx = tiledb.Ctx(context_params)

        except tiledb.libtiledb.TileDBError as e:
            if e.message == "Global context already initialized!":
                if tiledb.default_ctx().config().dict() != CxgDataset.tiledb_ctx.config().dict():
                    raise ConfigurationError("Cannot change tiledb configuration once it is set") from None
            else:
                raise ConfigurationError(f"Invalid tiledb context: {str(e)}") from None

    @staticmethod
    def pre_load_validation(data_locator):
        location = data_locator.uri_or_path
        if not CxgDataset.isvalid(location):
            logging.error(f"cxg matrix is not valid: {location}")
            raise DatasetAccessError("cxg matrix is not valid")

    @staticmethod
    def file_size(data_locator):
        return 0

    @staticmethod
    def open(data_locator, app_config):
        return CxgDataset(data_locator, app_config)

    def get_about(self):
        return self.about if self.about else super().get_about()

    def get_title(self):
        return self.title if self.title else super().get_title()

    def get_corpora_props(self):
        return self.corpora_props if self.corpora_props else super().get_corpora_props()

    def get_name(self):
        return "cellxgene cxg adaptor version"

    def get_library_versions(self):
        return dict(tiledb=tiledb.version.version)

    def get_path(self, *urls):
        return path_join(self.url, *urls)

    def _init_sparsity_and_format(self):
        try:
            X = self.open_array("Xr")
            self.is_1d = True
        except Exception:
            X = self.open_array("X")
            self.is_1d = False
        self.is_sparse = X.schema.sparse

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
        if tiledb.object_type(url, ctx=CxgDataset.tiledb_ctx) != "group":
            return False
        if tiledb.object_type(path_join(url, "obs"), ctx=CxgDataset.tiledb_ctx) != "array":
            return False
        if tiledb.object_type(path_join(url, "var"), ctx=CxgDataset.tiledb_ctx) != "array":
            return False
        if tiledb.object_type(path_join(url, "X"), ctx=CxgDataset.tiledb_ctx) != "array" and not (
            tiledb.object_type(path_join(url, "Xr"), ctx=CxgDataset.tiledb_ctx) == "array"
            and tiledb.object_type(path_join(url, "Xc"), ctx=CxgDataset.tiledb_ctx) == "array"
        ):
            return False
        if tiledb.object_type(path_join(url, "emb"), ctx=CxgDataset.tiledb_ctx) != "group":
            return False
        return True

    def has_array(self, name):
        a_type = tiledb.object_type(path_join(self.url, name), ctx=self.tiledb_ctx)
        return a_type == "array"

    def _validate_and_initialize(self):
        """
        remember, preload_validation() has already been called, so
        no need to repeat anything it has done.

        Load the CXG "group" metadata and cache instance values.
        Be very aware of multiple versions of the CXG object.

        CXG versions in the wild:
        * version 0, aka "no version" -- can be detected by the lack
          of a cxg_group_metadata array.
        * version 0.1 -- metadata attache to cxg_group_metadata array.
          Same as 0, except it adds group metadata.
        """
        title = None
        about = None
        corpora_props = None
        if self.has_array("cxg_group_metadata"):
            # version >0
            gmd = self.open_array("cxg_group_metadata")
            cxg_version = gmd.meta["cxg_version"]
            if version.parse(cxg_version) >= version.parse("0.1.0"):
                cxg_properties = json.loads(gmd.meta["cxg_properties"])
                title = cxg_properties.get("title", None)
                about = cxg_properties.get("about", None)
            if version.parse(cxg_version) >= version.parse("0.2.0"):
                corpora_props = json.loads(gmd.meta["corpora"]) if "corpora" in gmd.meta else None
        else:
            # version 0
            cxg_version = "0.0"

        if cxg_version not in ["0.0", "0.1", "0.2.0", "0.3.0"]:
            raise DatasetAccessError(f"cxg matrix is not valid: {self.url}")
        self.X_approximate_distribution = self.app_config.default_dataset__X_approximate_distribution

        self.title = title
        self.about = about
        self.cxg_version = cxg_version
        self.corpora_props = corpora_props
        self._init_sparsity_and_format()

    @staticmethod
    def _open_array(uri, tiledb_ctx):
        return tiledb.open(uri, mode="r", ctx=tiledb_ctx)

    def open_X_array(self, col_wise=False):
        """
        A helper function to open the 1D X array in row or column orientation with
        backwards compatibility for 2D arrays.
        """
        if self.is_1d and col_wise:
            return self.open_array("Xc")
        elif self.is_1d and not col_wise:
            return self.open_array("Xr")
        else:
            # If not 1D, then X array is either dense data or sparse data that has not
            # been remastered. Support for 2D sparse arrays is deprecated.
            return self.open_array("X")

    def open_array(self, name):
        try:
            p = self.get_path(name)
            return self.arrays[p]
        except tiledb.libtiledb.TileDBError:
            raise DatasetAccessError(name) from None

    def get_embedding_array(self, ename, dims=2, user_id: Optional[str] = None):
        # Try user embedding first if user_id provided (works for both stub and Argo-generated)
        if user_id:
            user_root_uri = self._user_root_uri(user_id)
            user_emb_uri = path_join(user_root_uri, f"emb/{ename}")
            logging.info(f"Trying user embedding: {user_emb_uri} for user_id: {user_id}")
            try:
                array = tiledb.open(user_emb_uri, mode="r", ctx=self.tiledb_ctx)
                logging.info(f"Successfully opened user embedding: {user_emb_uri}")
                return array[:, 0:dims]
            except TileDBError as e:
                logging.info(f"User embedding not found: {user_emb_uri}, error: {e}")
                pass  # Fall through to static embedding
        else:
            logging.info(f"No user_id provided, trying static embedding for: {ename}")

        # Try static embedding
        try:
            array = self.open_array(f"emb/{ename}")
            logging.info(f"Successfully opened static embedding: emb/{ename}")
            return array[:, 0:dims]
        except DatasetAccessError as e:
            logging.error(f"Static embedding not found: emb/{ename}, error: {e}")
            raise

    def compute_diffexp_ttest(self, setA, setB, top_n=None, lfc_cutoff=None, selector_lists=False):
        if top_n is None:
            top_n = self.app_config.default_dataset__diffexp__top_n
        if lfc_cutoff is None:
            lfc_cutoff = self.app_config.default_dataset__diffexp__lfc_cutoff
        return diffexp_cxg.diffexp_ttest(
            adaptor=self,
            setA=setA,
            setB=setB,
            top_n=top_n,
            diffexp_lfc_cutoff=lfc_cutoff,
            selector_lists=selector_lists,
        )

    def get_colors(self):
        if self.cxg_version == "0.0":
            return dict()
        meta = self.open_array("cxg_group_metadata").meta
        return json.loads(meta["cxg_category_colors"]) if "cxg_category_colors" in meta else dict()

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
        obs_items = pack_selector_from_mask(obs_mask)
        var_items = pack_selector_from_mask(var_mask)
        shape = self.get_shape()
        if obs_items is None or var_items is None:
            # If either zero rows or zero columns were selected, return an empty 2d array.
            obs_size = 0 if obs_items is None else shape[0] if obs_mask is None else np.count_nonzero(obs_mask)
            var_size = 0 if var_items is None else shape[1] if var_mask is None else np.count_nonzero(var_mask)
            return np.ndarray((obs_size, var_size))

        if self.is_sparse:
            X = self.open_X_array(col_wise=True)
            if self.is_1d:
                data = X.query(order="U").multi_index[var_items]
            else:
                data = X.query(order="U").multi_index[obs_items, var_items]
            nrows, obsindices = self.__remap_indices(shape[0], obs_mask, data.get("coords", data)["obs"])
            ncols, varindices = self.__remap_indices(shape[1], var_mask, data.get("coords", data)["var"])
            densedata = np.zeros((nrows, ncols), dtype=self.get_X_array_dtype())
            densedata[obsindices, varindices] = data[""]
            return densedata
        else:
            X = self.open_X_array()
            data = X.multi_index[obs_items, var_items][""]
            return data

    def get_X_approximate_distribution(self) -> XApproximateDistribution:
        return self.X_approximate_distribution

    def get_shape(self):
        X = self.open_X_array()
        if self.is_1d:
            Xc = self.open_X_array(col_wise=True)
            return (X.shape[0], Xc.shape[0])
        else:
            return X.shape

    def get_X_array_dtype(self):
        X = self.open_X_array()
        return X.attr(0).dtype

    def query_var_array(self, term_name):
        var = self.open_array("var")
        data = var.query(attrs=[term_name])[:][term_name]
        return data

    def query_obs_array(self, term_name):
        obs = self.open_array("obs")
        schema = self.get_schema()
        try:
            data = obs.query(attrs=[term_name])[:][term_name]
            type_hint = schema.get(term_name, None)
            if (
                type_hint is not None
                and type_hint[term_name]["type"] == "categorical"
                and str(data.dtype).startswith("int")
                and "categories" in type_hint[term_name]
            ):
                data = pd.Categorical.from_codes(data, categories=type_hint[term_name]["categories"])
            elif type_hint is not None and type_hint[term_name]["type"] == "boolean":
                # convert boolean to categorical
                data = pd.Categorical(data)
        except tiledb.libtiledb.TileDBError:
            raise DatasetAccessError("query_obs") from None
        return data

    def get_obs_names(self):
        # get the index from the meta data
        obs = self.open_array("obs")
        meta = json.loads(obs.meta["cxg_schema"])
        index_name = meta["index"]
        return index_name

    def get_obs_index(self):
        obs = self.open_array("obs")
        meta = json.loads(obs.meta["cxg_schema"])
        index_name = meta["index"]
        data = obs.query(attrs=[index_name])[:][index_name]
        return data

    def get_obs_columns(self):
        obs = self.open_array("obs")
        schema = obs.schema
        col_names = [attr.name for attr in schema]
        return pd.Index(col_names)

    def get_obs_keys(self):
        obs = self.open_array("obs")
        schema = obs.schema
        return [attr.name for attr in schema]

    def get_var_keys(self):
        var = self.open_array("var")
        schema = var.schema
        return [attr.name for attr in schema]

    def get_uns(self, metadata_key):
        """
        Extracts an object from the uns array in a TileDB container
        """
        try:
            uns = self.open_array("uns")
        except KeyError:
            return None

        for key in uns.meta:
            if key == metadata_key:
                try:
                    if type(uns.meta[key]) == bytes:  # TODO: remove this after 5.3.0 migration
                        return pickle.loads(uns.meta[key])  # for backwards compatibility
                    return json.loads(uns.meta[key])
                except Exception as e:
                    print(f"Error deserializing uns data for key {key}: {e}")
                    return None

    def get_atac_coverage(self, gene_name, genome_version, cell_types):
        """
        Extracts ATAC coverage data for a gene and one or more cell types from TileDB.
        """
        if not self.has_array("coverage"):
            return None

        bin_size = ATAC_BIN_SIZE
        range_buffer = ATAC_RANGE_BUFFER

        try:
            gene_info = self.get_atac_gene_info(gene_name, genome_version)
            if gene_info is None:
                return None
        except DatasetAccessError:
            return None

        target_chromosome, gene_start, gene_end, sorted_genes = gene_info

        # Determine genomic region of interest
        bin_start = (gene_start - range_buffer) // bin_size
        bin_end = (gene_end + range_buffer) // bin_size

        CHROM_MAPPING = {
            **{f"chr{i}": i for i in range(1, 23)},
            "chrX": 23,
            "chrY": 24,
            "chrM": 25,
        }

        chromosome = CHROM_MAPPING.get(target_chromosome)
        if chromosome is None:
            raise ValueError(f"Unknown chromosome: {target_chromosome}")

        try:
            coverage = self.open_array("coverage")

            # Ensure cell_types is a list
            if isinstance(cell_types, str):
                # Split on comma only if it's one string containing multiple values
                cell_types = [ct.strip() for ct in cell_types.split(",")] if "," in cell_types else [cell_types]

            # Escape and build proper OR query string
            escaped_cell_types = [ct.replace("'", "\\'") for ct in cell_types]
            cell_type_filter = " or ".join(f"(cell_type == '{ct}')" for ct in escaped_cell_types)

            qc = (
                f"(chrom == {chromosome}) and "
                f"({cell_type_filter}) and "
                f"(bin >= {bin_start}) and (bin <= {bin_end})"
            )

            result = coverage.query(cond=qc).df[:]

            # Check if normalized_coverage is quantized (uint8) and dequantize if needed
            if result["normalized_coverage"].dtype == np.uint8:
                # Dequantize: uint8 quantized values -> float32 original values
                result["normalized_coverage"] = result["normalized_coverage"] / 25.5
                #   The 25.5 value comes from mapping our target data range to the uint8 storage range:
                #
                #   25.5 = 255 / 10.0
                #
                #   Where:
                #   - 255 = Maximum value for uint8 (2^8 - 1)
                #   - 10.0 = Maximum practical value we want to represent
                #
                #   1. Data Range Analysis
                #
                #   From ATAC-seq normalized coverage analysis:
                #   - Most values: 0-3 (low accessibility regions)
                #   - Common values: 3-7 (medium accessibility)
                #   - High values: 7-10 (high accessibility)
                #   - Extreme outliers: 10+ (very rare)
                #
                #   2. Storage Target
                #
                #   - uint8 range: 0 to 255 (256 possible values)
                #   - Practical range: 0 to 10 (covers 99%+ of real data)
                #
                #   3. Linear Mapping Formula
                #
                #   quantized_value = original_value × scale_factor
                #   scale_factor = max_uint8_value / max_practical_value
                #   scale_factor = 255 / 10 = 25.5

            bins = np.arange(bin_start, bin_end + 1)
            starts = bins * bin_size
            ends = starts + bin_size

            coverage_by_celltype = {}
            for ct in cell_types:
                subset = result[result["cell_type"] == ct]
                coverage_map = dict(zip(subset["bin"], subset["normalized_coverage"]))
                norm_covs = [coverage_map.get(b, 0.0) for b in bins]
                coverage_plot = list(zip(norm_covs, starts.astype(float), ends.astype(float)))
                coverage_by_celltype[ct] = coverage_plot

        except tiledb.libtiledb.TileDBError as e:
            raise DatasetAccessError(f"get_atac_coverage failed: {str(e)}") from e

        return {
            "chromosome": target_chromosome,
            "coverageByCellType": coverage_by_celltype,
            "geneInfo": sorted_genes,
        }

    def get_atac_gene_info(self, gene_name, genome_version):
        """
        Given a gene name and genome version, returns the chromosome, start, end,
        and sorted list of genes on the same chromosome.
        """
        try:
            gene_data = GENE_DATA_CACHE.get(genome_version)
        except KeyError as e:
            raise DatasetAccessError(f"Genome version {genome_version} not preloaded") from e

        target_gene = gene_data.get(gene_name)
        if not target_gene:
            logging.warning(f"Gene '{gene_name}' not found in genome version '{genome_version}'.")
            return None

        target_chromosome = target_gene.get("geneChromosome")
        if not target_chromosome:
            logging.warning(f"No chromosome info for gene '{gene_name}'.")
            return None

        gene_start = target_gene["geneStart"]
        gene_end = target_gene["geneEnd"]

        # Filter genes on the same chromosome
        same_chr_genes = [
            gene_info for gene_info in gene_data.values() if gene_info.get("geneChromosome") == target_chromosome
        ]
        sorted_genes = sorted(same_chr_genes, key=lambda g: g.get("geneStart", float("inf")))

        return target_chromosome, gene_start, gene_end, sorted_genes

    def get_atac_cytoband(self, chr_key, genome_version):
        """
        Given a chromosome key and genome version, returns cytoband data for that chromosome.
        """
        try:
            cytoband_data = CYTOBAND_DATA_CACHE.get(genome_version)
            return cytoband_data.get(chr_key)
        except (FileNotFoundError, KeyError, json.JSONDecodeError) as e:
            logging.error(f"Error accessing cytoband data: {e}")
            return None

    # function to get the embedding
    # this function to iterate through embeddings.
    def get_embedding_names(self, user_id: Optional[str] = None):
        with ServerTiming.time("layout.lsuri"):
            # Get static embeddings (existing code)
            pemb = self.get_path("emb")
            embeddings = [os.path.basename(p) for (p, t) in self.lsuri(pemb) if t == "array"]

            # Get user embeddings if user_id provided
            # This will work with both stub-generated and Argo-generated embeddings
            if user_id:
                user_root_uri = self._user_root_uri(user_id)
                user_emb_uri = path_join(user_root_uri, "emb")
                try:
                    user_embeddings = [os.path.basename(p) for (p, t) in self.lsuri(user_emb_uri) if t == "array"]
                    embeddings.extend(user_embeddings)
                except TileDBError:
                    pass  # No user embeddings yet

        if len(embeddings) == 0:
            raise DatasetAccessError("cxg matrix missing embeddings")
        return embeddings

    def _get_schema(self, user_id: Optional[str] = None):
        if self.schema:
            return self.schema

        shape = self.get_shape()
        dtype = self.get_X_array_dtype()

        dataframe = {
            "nObs": shape[0],
            "nVar": shape[1],
            # Allow int64 fields to be generated in the schema hint so that we can filter later
            **get_schema_type_hint_from_dtype(dtype=dtype, allow_int64=True),
        }

        annotations = {}
        for ax in ("obs", "var"):
            A = self.open_array(ax)
            schema_hints = json.loads(A.meta["cxg_schema"]) if "cxg_schema" in A.meta else {}
            if not isinstance(schema_hints, dict):
                raise TypeError("Array schema was malformed.")

            cols = []
            for attr in A.schema:
                schema = dict(name=attr.name, writable=False)
                type_hint = schema_hints.get(attr.name, {})
                # type hints take precedence
                if "type" in type_hint:
                    if type_hint["type"] in ["int64", "uint64"] and ax == "obs":
                        # Skip over int64 fields in the obs array when generating schema
                        continue

                    schema["type"] = type_hint["type"]
                    if schema["type"] == "boolean" and ax == "obs":
                        # convert boolean to categorical
                        schema["type"] = "categorical"
                        schema["categories"] = pd.Categorical(
                            self.open_array("obs").query(attrs=[attr.name])[:][attr.name].astype("bool")
                        ).categories.tolist()
                        schema["categories"] = [str(cat) for cat in schema["categories"]]
                    elif schema["type"] == "categorical" and "categories" in type_hint:
                        schema["categories"] = type_hint["categories"]
                else:
                    schema.update(get_schema_type_hint_from_dtype(dtype=attr.dtype))
                cols.append(schema)

            annotations[ax] = dict(columns=cols)

            if "index" in schema_hints:
                annotations[ax].update({"index": schema_hints["index"]})

        obs_layout = []
        embeddings = self.get_embedding_names(user_id=user_id)  # Pass user_id
        for ename in embeddings:
            # Try to open from user location first if user_id provided, then static location
            # This will work with both stub and Argo-generated embeddings
            A = None
            if user_id:
                user_root_uri = self._user_root_uri(user_id)
                user_emb_uri = path_join(user_root_uri, f"emb/{ename}")
                try:
                    A = tiledb.open(user_emb_uri, mode="r", ctx=self.tiledb_ctx)
                except TileDBError:
                    pass  # Fall through to static embedding

            if A is None:
                try:
                    A = self.open_array(f"emb/{ename}")
                except DatasetAccessError:
                    raise
            obs_layout.append({"name": ename, "type": "float32", "dims": [f"{ename}_{d}" for d in range(0, A.ndim)]})

        schema = {"dataframe": dataframe, "annotations": annotations, "layout": {"obs": obs_layout}}
        return schema

    def _augment_schema_with_user_annotations(self, schema: Dict[str, Any], annotations_df: pd.DataFrame) -> None:
        if annotations_df is None or annotations_df.empty:
            return

        obs_schema = schema.setdefault("annotations", {}).setdefault("obs", {})
        columns = obs_schema.setdefault("columns", [])
        columns_by_name = {col["name"]: col for col in columns if isinstance(col, dict) and "name" in col}

        for column_name in annotations_df.columns:
            series = annotations_df[column_name]
            if is_categorical_dtype(series):
                categories = series.cat.categories.tolist()
            else:
                categories = pd.Index(series).astype(str).tolist()
            normalized_categories = [cat.decode("utf-8") if isinstance(cat, bytes) else cat for cat in categories]

            column_schema = columns_by_name.get(column_name)
            if column_schema is None:
                column_schema = {"name": column_name}
                columns.append(column_schema)
                columns_by_name[column_name] = column_schema

            column_schema.update(
                {
                    "type": "categorical",
                    "categories": normalized_categories,
                    "writable": True,
                }
            )

    def get_schema(self, user_id: Optional[str] = None):
        # Always regenerate schema when user_id is provided to include user embeddings
        if self.schema is None or user_id:
            with self.lock:
                if self.schema is None or user_id:
                    self.schema = self._get_schema(user_id=user_id)

        schema = deepcopy(self.schema)
        if user_id:
            user_annotations = self.get_saved_obs_annotations(user_id=user_id)
            self._augment_schema_with_user_annotations(schema, user_annotations)
        return schema

    def _normalize_genesets(self, geneset_entries):
        """Helper method to normalize geneset entries by ensuring they have geneset_name."""
        normalized_genesets = []
        if isinstance(geneset_entries, list):
            for item in geneset_entries:
                if isinstance(item, dict):
                    normalized_genesets.append(item)
                elif isinstance(item, (list, tuple)) and len(item) == 2 and isinstance(item[1], dict):
                    geneset_name = item[0]
                    geneset_obj = item[1]
                    if "geneset_name" not in geneset_obj:
                        geneset_obj = {**geneset_obj, "geneset_name": geneset_name}
                    normalized_genesets.append(geneset_obj)
        elif isinstance(geneset_entries, dict):
            for name, value in geneset_entries.items():
                if isinstance(value, dict):
                    if "geneset_name" not in value:
                        value = {**value, "geneset_name": name}
                    normalized_genesets.append(value)
        return normalized_genesets

    def _get_genesets(self):
        if self.genesets:
            return self.genesets
        A = self.open_array("obs")
        raw = json.loads(A.meta["genesets"]) if "genesets" in A.meta else {}

        tid = 0
        geneset_entries = []

        if isinstance(raw, dict):
            tid = raw.get("tid", 0)
            geneset_entries = raw.get("genesets", raw)
        elif isinstance(raw, list) and len(raw) == 2 and isinstance(raw[1], (int, float)):
            geneset_entries, tid = raw[0], int(raw[1])
        else:
            geneset_entries = raw

        normalized_genesets = self._normalize_genesets(geneset_entries)
        return {"genesets": normalized_genesets, "tid": tid}

    def get_genesets(
        self,
        user_id: Optional[str] = None,
    ):
        saved = self.get_saved_gene_sets(user_id=user_id)
        if saved is not None:
            return saved

        if self.genesets is None:
            with self.lock:
                self.genesets = self._get_genesets()
        if isinstance(self.genesets, dict):
            geneset_entries = self.genesets.get("genesets", [])
            normalized_genesets = self._normalize_genesets(geneset_entries)
            return {
                "genesets": normalized_genesets,
                "tid": self.genesets.get("tid", 0),
            }
        # Fallback - should not happen due to normalization above.
        return {"genesets": [], "tid": 0}

    def annotation_to_fbs_matrix(
        self,
        axis,
        fields=None,
        num_bins=None,
        user_id: Optional[str] = None,
    ):

        with ServerTiming.time(f"annotations.{axis}.query"):
            A = self.open_array(str(axis))

            try:
                schema = self.get_schema(user_id=user_id) if axis == "obs" else self.get_schema()
                obs_schema_columns = schema["annotations"]["obs"]["columns"] if axis == "obs" else []

                obs_column_names = {attr.name for attr in A.schema}
                requested_fields = list(fields) if fields else None
                base_fields: Optional[list[str]] = None
                if requested_fields is not None:
                    base_fields = [field for field in requested_fields if field in obs_column_names]

                if requested_fields is None:
                    data = A[:]
                elif base_fields:
                    data = A.query(attrs=base_fields)[:]
                else:
                    data = {}

                if data:
                    df = pd.DataFrame.from_dict(data)
                else:
                    n_obs = self.get_shape()[0]
                    df = pd.DataFrame(index=range(n_obs))

                if axis == "obs":
                    categorical_dtypes = []
                    for column_schema in obs_schema_columns:
                        column_name = column_schema.get("name")
                        if fields and column_name not in fields:
                            continue
                        if column_schema.get("type") == "categorical":
                            categories = column_schema.get("categories", [])
                            if categories:
                                categorical_dtypes.append((column_name, categories))

                    for name, categories in categorical_dtypes:
                        if name in df.columns:
                            if str(df[name].dtype).startswith("int") or str(df[name].dtype).startswith("uint"):
                                df[name] = pd.Categorical.from_codes(df[name], categories=categories)
                            else:
                                df[name] = pd.Categorical(df[name], categories=categories)

                saved_annotations = None
                if axis == "obs":
                    saved_annotations = self.get_saved_obs_annotations(user_id=user_id)

                if saved_annotations is not None and not saved_annotations.empty:
                    if fields:
                        candidate_columns = [col for col in fields if col in saved_annotations.columns]
                    else:
                        candidate_columns = list(saved_annotations.columns)

                    for column in candidate_columns:
                        column_values = saved_annotations[column].values
                        if len(df.index) == 0:
                            df = pd.DataFrame(index=range(len(column_values)))
                        df[column] = column_values

                if fields:
                    missing_columns = [col for col in fields if col not in df.columns]
                    if missing_columns:
                        raise KeyError(missing_columns[0])
                    df = df[fields]
            except TileDBError as e:
                raise KeyError(e) from None

        with ServerTiming.time(f"annotations.{axis}.encode"):
            fbs = encode_matrix_fbs(df, col_idx=df.columns, num_bins=num_bins)

        return fbs
