import unittest

from werkzeug.datastructures import MultiDict

from server.common.rest import _query_parameter_to_filter
from server.common.utils.data_locator import DataLocator
from server.dataset.cxg_dataset import CxgDataset
from server.tests.unit import app_config
from server.tests import FIXTURES_ROOT, decode_fbs
from server.tests.fixtures.fixtures import pbmc3k_colors

import tiledb
import numpy as np


class TestCxgDataset(unittest.TestCase):
    def test_get_colors(self):
        data = self.get_data("pbmc3k.cxg")
        self.assertDictEqual(data.get_colors(), pbmc3k_colors)
        data = self.get_data("pbmc3k_v0.cxg")
        self.assertDictEqual(data.get_colors(), dict())

    def get_data(self, fixture):
        # FIXTURES_ROOT = "/home/ec2-user/server/tests/fixtures"
        data_locator = f"{FIXTURES_ROOT}/{fixture}"
        config = app_config(data_locator)
        return CxgDataset(DataLocator(data_locator), config)

    def test_tdb_bug(self):
        """
        This gives different results on 0.12.4 vs 0.13.1. Reported to TileDB
        and fixed in 0.13.2. Test case remains in case of regression.
        """
        data = self.get_data("pbmc3k.cxg")
        filt = _query_parameter_to_filter(
            MultiDict(
                [
                    ("var:name_0", "F5"),
                    ("var:name_0", "BEB3"),
                    ("var:name_0", "SIK1"),
                ]
            )
        )
        dat = data.summarize_var("mean", filt, 0)
        summary = decode_fbs.decode_matrix_FBS(dat)
        self.assertDictContainsSubset({"n_rows": 2638, "n_cols": 1, "row_idx": None}, summary)
        self.assertIs(type(summary["columns"]), list)
        self.assertEqual(len(summary["columns"]), 1)
        self.assertEqual(len(summary["columns"][0]), 2638)
        self.assertEqual(summary["columns"][0].sum(), np.float32(-19.00301))
