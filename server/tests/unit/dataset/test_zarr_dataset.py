"""Parity tests for the Zarr-backed adaptor POC.

Generates a zarr fixture from pbmc3k.cxg (once) and asserts the ZarrDataset adaptor returns
the same shapes/values as the CxgDataset adaptor for the read pipeline.
"""
import os
import tempfile
import unittest

import numpy as np

from server.common.constants import Axis
from server.common.utils.data_locator import DataLocator
from server.dataset.cxg_dataset import CxgDataset
from server.dataset.zarr_dataset import ZarrDataset
from server.tests import FIXTURES_ROOT, decode_fbs
from server.tests.unit import app_config

ZARR_PATH = os.path.join(tempfile.gettempdir(), "pbmc3k_test.zarr")


class TestZarrDataset(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from scripts.cxg_to_zarr import convert

        if not os.path.exists(ZARR_PATH):
            convert(f"{FIXTURES_ROOT}/pbmc3k.cxg", ZARR_PATH)

    def setUp(self):
        config = app_config()
        self.cxg = CxgDataset(DataLocator(f"{FIXTURES_ROOT}/pbmc3k.cxg"), config)
        self.zarr = ZarrDataset(DataLocator(ZARR_PATH), config)

    def test_shape(self):
        self.assertEqual(self.zarr.get_shape(), self.cxg.get_shape())

    def test_embeddings(self):
        self.assertEqual(sorted(self.zarr.get_embedding_names()), sorted(self.cxg.get_embedding_names()))
        emb_z = self.zarr.get_embedding_array("umap", 2)
        emb_c = self.cxg.get_embedding_array("umap", 2)
        np.testing.assert_allclose(emb_z, emb_c, rtol=1e-5)

    def test_schema_structure(self):
        sz = self.zarr.get_schema()
        sc = self.cxg.get_schema()
        self.assertEqual(sz["dataframe"]["nObs"], sc["dataframe"]["nObs"])
        self.assertEqual(sz["dataframe"]["nVar"], sc["dataframe"]["nVar"])
        self.assertEqual(
            {c["name"] for c in sz["annotations"]["obs"]["columns"]},
            {c["name"] for c in sc["annotations"]["obs"]["columns"]},
        )
        self.assertEqual(sz["annotations"]["obs"]["index"], sc["annotations"]["obs"]["index"])

    def test_x_slice(self):
        var_mask = np.zeros(self.cxg.get_shape()[1], dtype=bool)
        var_mask[:5] = True
        xz = self.zarr.get_X_array(None, var_mask)
        xc = self.cxg.get_X_array(None, var_mask)
        self.assertEqual(xz.shape, xc.shape)
        np.testing.assert_allclose(xz, xc, rtol=1e-5)

    def test_obs_annotation_fbs(self):
        col = "louvain"
        fz = decode_fbs.decode_matrix_FBS(self.zarr.annotation_to_fbs_matrix(Axis.OBS, fields=[col]))
        fc = decode_fbs.decode_matrix_FBS(self.cxg.annotation_to_fbs_matrix(Axis.OBS, fields=[col]))
        self.assertEqual(list(fz["columns"][0]), list(fc["columns"][0]))

    def test_var_name_filter_expression(self):
        # exercises the base-class string filter path (regression: extension-string dtype)
        from werkzeug.datastructures import MultiDict

        from server.common.rest import _query_parameter_to_filter

        filt = _query_parameter_to_filter(MultiDict([("var:name_0", "SIK1")]))
        fz = decode_fbs.decode_matrix_FBS(self.zarr.data_frame_to_fbs_matrix(filt, Axis.VAR))
        fc = decode_fbs.decode_matrix_FBS(self.cxg.data_frame_to_fbs_matrix(filt, Axis.VAR))
        self.assertEqual(fz["n_cols"], 1)
        np.testing.assert_allclose(fz["columns"][0], fc["columns"][0], rtol=1e-5)

    def test_diffexp_parity(self):
        n_obs = self.cxg.get_shape()[0]
        maskA = np.zeros(n_obs, dtype=bool)
        maskB = np.zeros(n_obs, dtype=bool)
        maskA[: n_obs // 2] = True
        maskB[n_obs // 2 :] = True
        rz = self.zarr.compute_diffexp_ttest(maskA, maskB, top_n=10)
        rc = self.cxg.compute_diffexp_ttest(maskA, maskB, top_n=10)
        # same top gene indices
        self.assertEqual([r[0] for r in rz["positive"]], [r[0] for r in rc["positive"]])
        np.testing.assert_allclose([r[1] for r in rz["positive"]], [r[1] for r in rc["positive"]], rtol=1e-4)


if __name__ == "__main__":
    unittest.main()
