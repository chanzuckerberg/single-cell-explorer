import json
import unittest

import numpy as np
import pandas as pd
from werkzeug.datastructures import MultiDict

from server.common.rest import _query_parameter_to_filter
from server.common.utils.data_locator import DataLocator
from server.dataset.cxg_dataset import CxgDataset
from server.tests import FIXTURES_ROOT, decode_fbs
from server.tests.fixtures.fixtures import pbmc3k_colors
from server.tests.unit import app_config


class TestCxgDataset(unittest.TestCase):
    def test_get_colors(self):
        data = self.get_data("pbmc3k.cxg")
        self.assertDictEqual(data.get_colors(), pbmc3k_colors)
        data = self.get_data("pbmc3k_v0.cxg")
        self.assertDictEqual(data.get_colors(), dict())

    def get_data(self, fixture):
        # FIXTURES_ROOT = "/home/ec2-user/server/tests/fixtures"
        data_locator = f"{FIXTURES_ROOT}/{fixture}"
        config = app_config()
        return CxgDataset(DataLocator(data_locator), config)

    def test_schema_filters_int64(self):
        data = self.get_data("dataset_with_int64.cxg")
        schema = data.get_schema()
        with open(f"{FIXTURES_ROOT}/schema_without_int64.json", "r") as json_file:
            expected_schema = json.load(json_file)
            self.assertEqual(json.dumps(schema), json.dumps(expected_schema))

    def test_tdb_bug(self):
        """
        This gives different results on 0.12.4 vs 0.13.1. Reported to TileDB
        and fixed in 0.13.2. Test case remains in case of regression.
        """
        for dataset in ["pbmc3k.cxg", "pbmc3k_sparse.cxg"]:
            with self.subTest(dataset=dataset):
                data = self.get_data(dataset)
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

                expected_subset = {"n_rows": 2638, "n_cols": 1, "row_idx": None}
                actual_subset = {key: summary[key] for key in expected_subset if key in summary}

                self.assertEqual(expected_subset, actual_subset)
                self.assertIs(type(summary["columns"]), list)
                self.assertEqual(len(summary["columns"]), 1)
                self.assertEqual(len(summary["columns"][0]), 2638)
                self.assertEqual(summary["columns"][0].sum(), np.float32(-19.00301))

    def test_tdb_bug_lossy(self):
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
        dat = data.summarize_var("mean", filt, 0, 500)
        summary = decode_fbs.decode_matrix_FBS(dat)

        expected_subset = {"n_rows": 2638, "n_cols": 1, "row_idx": None}
        actual_subset = {key: summary[key] for key in expected_subset if key in summary}

        self.assertEqual(expected_subset, actual_subset)
        self.assertIs(type(summary["columns"]), list)
        self.assertEqual(len(summary["columns"]), 1)
        self.assertEqual(len(summary["columns"][0]), 2638)
        self.assertEqual(summary["columns"][0].sum(), np.float32(-35.90116))

    def test_save_obs_annotations_roundtrip(self):
        data = self.get_data("pbmc3k.cxg")
        collection = "unit-test-obs"
        n_obs, _ = data.get_shape()
        df = pd.DataFrame({"user_label": ["label"] * n_obs})

        data.save_obs_annotations(df, collection_name=collection)
        saved = data.get_saved_obs_annotations(collection)
        self.assertIsNotNone(saved)
        self.assertTrue(df.equals(saved))

    def test_save_gene_sets_tid_flow(self):
        data = self.get_data("pbmc3k.cxg")
        collection = "unit-test-genes"
        genesets = [
            {
                "geneset_name": "my_set",
                "geneset_description": "",
                "genes": [{"gene_symbol": "FOO", "gene_description": ""}],
            }
        ]

        data.save_gene_sets(genesets, tid=1, collection_name=collection)
        saved = data.get_saved_gene_sets(collection)
        self.assertIsNotNone(saved)
        self.assertEqual(saved["tid"], 1)
        self.assertEqual(saved["genesets"], genesets)

        with self.assertRaises(ValueError):
            data.save_gene_sets(genesets, tid=1, collection_name=collection)

        data.save_gene_sets(genesets, tid=2, collection_name=collection)
        saved_again = data.get_saved_gene_sets(collection)
        self.assertEqual(saved_again["tid"], 2)
        self.assertEqual(saved_again["genesets"], genesets)

        data.save_gene_sets(genesets, tid=None, collection_name=f"{collection}-auto")
        auto_saved = data.get_saved_gene_sets(f"{collection}-auto")
        self.assertEqual(auto_saved["tid"], 1)
