import json
import os
import time
from http import HTTPStatus
import hashlib
from http.client import HTTPException
from unittest.mock import patch

import requests

from server.common.config.app_config import AppConfig
from server.tests import decode_fbs, FIXTURES_ROOT
from server.tests.fixtures.fixtures import pbmc3k_colors
from server.tests.unit import BaseTest, skip_if

BAD_FILTER = {"filter": {"obs": {"annotation_value": [{"name": "xyz"}]}}}


class EndPoints(BaseTest):
    @classmethod
    def setUpClass(cls, app_config=None):
        super().setUpClass(app_config)
        cls.app.testing = True
        cls.client = cls.app.test_client()
        os.environ["SKIP_STATIC"] = "True"
        for i in range(90):
            try:
                result = cls.client.get(f"{cls.TEST_URL_BASE}schema")
                cls.schema = json.loads(result.data)
                break
            except requests.exceptions.ConnectionError:
                time.sleep(1)

    def test_initialize(self):
        endpoint = "schema"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        result = self.client.get(url)
        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/json")
        result_data = json.loads(result.data)
        self.assertEqual(result_data["schema"]["dataframe"]["nObs"], 2638)
        self.assertEqual(len(result_data["schema"]["annotations"]["obs"]), 2)
        self.assertEqual(len(result_data["schema"]["annotations"]["obs"]["columns"]), 5)

    def test_config(self):
        endpoint = "config"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        result = self.client.get(url)
        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/json")
        result_data = json.loads(result.data)
        self.assertIn("library_versions", result_data["config"])
        self.assertEqual(result_data["config"]["displayNames"]["dataset"], "pbmc3k")

    def test_get_layout_fbs(self):
        endpoint = "layout/obs"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        header = {"Accept": "application/octet-stream"}
        result = self.client.get(url, headers=header)
        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/octet-stream")
        df = decode_fbs.decode_matrix_FBS(result.data)
        self.assertEqual(df["n_rows"], 2638)
        self.assertEqual(df["n_cols"], 8)
        self.assertIsNotNone(df["columns"])
        self.assertSetEqual(
            set(df["col_idx"]),
            {"pca_0", "pca_1", "tsne_0", "tsne_1", "umap_0", "umap_1", "draw_graph_fr_0", "draw_graph_fr_1"},
        )
        self.assertIsNone(df["row_idx"])
        self.assertEqual(len(df["columns"]), df["n_cols"])

    def test_bad_filter(self):
        endpoint = "data/var"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        header = {"Accept": "application/octet-stream"}
        result = self.client.put(url, headers=header, json=BAD_FILTER)
        self.assertEqual(result.status_code, HTTPStatus.BAD_REQUEST)

    def test_get_annotations_obs_fbs(self):
        endpoint = "annotations/obs"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        header = {"Accept": "application/octet-stream"}
        result = self.client.get(url, headers=header)
        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/octet-stream")
        df = decode_fbs.decode_matrix_FBS(result.data)
        self.assertEqual(df["n_rows"], 2638)
        self.assertEqual(df["n_cols"], 5)
        self.assertIsNotNone(df["columns"])
        self.assertIsNone(df["row_idx"])
        self.assertEqual(len(df["columns"]), df["n_cols"])
        obs_index_col_name = self.schema["schema"]["annotations"]["obs"]["index"]
        self.assertCountEqual(
            df["col_idx"],
            [obs_index_col_name, "n_genes", "percent_mito", "n_counts", "louvain"],
        )

    def test_get_annotations_obs_keys_fbs(self):
        endpoint = "annotations/obs"
        query = "annotation-name=n_genes&annotation-name=percent_mito"
        url = f"{self.TEST_URL_BASE}{endpoint}?{query}"
        header = {"Accept": "application/octet-stream"}
        result = self.client.get(url, headers=header)
        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/octet-stream")
        df = decode_fbs.decode_matrix_FBS(result.data)
        self.assertEqual(df["n_rows"], 2638)
        self.assertEqual(df["n_cols"], 2)
        self.assertIsNotNone(df["columns"])
        self.assertIsNone(df["row_idx"])
        self.assertEqual(len(df["columns"]), df["n_cols"])
        self.assertCountEqual(df["col_idx"], ["n_genes", "percent_mito"])

    def test_get_annotations_obs_error(self):
        endpoint = "annotations/obs"
        query = "annotation-name=notakey"
        url = f"{self.TEST_URL_BASE}{endpoint}?{query}"
        header = {"Accept": "application/octet-stream"}
        result = self.client.get(url, headers=header)
        self.assertEqual(result.status_code, HTTPStatus.BAD_REQUEST)

    # TEMP: Testing count 15 to match hardcoded values for diffexp
    # TODO(#1281): Switch back to dynamic values
    def test_diff_exp(self):
        endpoint = "diffexp/obs"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        params = {
            "mode": "topN",
            "set1": {"filter": {"obs": {"annotation_value": [{"name": "louvain", "values": ["NK cells"]}]}}},
            "set2": {"filter": {"obs": {"annotation_value": [{"name": "louvain", "values": ["CD8 T cells"]}]}}},
            "count": 15,
        }
        result = self.client.post(url, json=params)
        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/json")
        result_data = json.loads(result.data)
        self.assertEqual(len(result_data["positive"]), 15)
        self.assertEqual(len(result_data["negative"]), 15)

    def test_diff_exp_indices(self):
        endpoint = "diffexp/obs"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        params = {
            "mode": "topN",
            "count": 15,
            "set1": {"filter": {"obs": {"index": [[0, 500]]}}},
            "set2": {"filter": {"obs": {"index": [[500, 1000]]}}},
        }
        result = self.client.post(url, json=params)
        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/json")
        result_data = json.loads(result.data)
        self.assertEqual(len(result_data["positive"]), 15)
        self.assertEqual(len(result_data["negative"]), 15)

    def test_get_annotations_var_fbs(self):
        endpoint = "annotations/var"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        header = {"Accept": "application/octet-stream"}
        result = self.client.get(url, headers=header)
        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/octet-stream")
        df = decode_fbs.decode_matrix_FBS(result.data)
        self.assertEqual(df["n_rows"], 1838)
        self.assertEqual(df["n_cols"], 2)
        self.assertIsNotNone(df["columns"])
        self.assertIsNone(df["row_idx"])
        self.assertEqual(len(df["columns"]), df["n_cols"])
        var_index_col_name = self.schema["schema"]["annotations"]["var"]["index"]
        self.assertCountEqual(df["col_idx"], [var_index_col_name, "n_cells"])

    def test_get_annotations_var_keys_fbs(self):
        endpoint = "annotations/var"
        query = "annotation-name=n_cells"
        url = f"{self.TEST_URL_BASE}{endpoint}?{query}"
        header = {"Accept": "application/octet-stream"}
        result = self.client.get(url, headers=header)
        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/octet-stream")
        df = decode_fbs.decode_matrix_FBS(result.data)
        self.assertEqual(df["n_rows"], 1838)
        self.assertEqual(df["n_cols"], 1)
        self.assertIsNotNone(df["columns"])
        self.assertIsNone(df["row_idx"])
        self.assertEqual(len(df["columns"]), df["n_cols"])
        self.assertCountEqual(df["col_idx"], ["n_cells"])

    def test_get_annotations_var_error(self):
        endpoint = "annotations/var"
        query = "annotation-name=notakey"
        url = f"{self.TEST_URL_BASE}{endpoint}?{query}"
        header = {"Accept": "application/octet-stream"}
        result = self.client.get(url, headers=header)
        self.assertEqual(result.status_code, HTTPStatus.BAD_REQUEST)

    def test_data_mimetype_error(self):
        endpoint = "data/var"
        header = {"Accept": "xxx"}
        url = f"{self.TEST_URL_BASE}{endpoint}"
        result = self.client.put(url, headers=header)
        self.assertEqual(result.status_code, HTTPStatus.NOT_ACCEPTABLE)

    def test_fbs_default(self):
        endpoint = "data/var"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        headers = {"Accept": "application/octet-stream"}
        result = self.client.put(url, headers=headers)
        self.assertEqual(result.status_code, HTTPStatus.BAD_REQUEST)

        filter = {"filter": {"var": {"index": [0, 1, 4]}}}
        result = self.client.put(url, headers=headers, json=filter)
        self.assertEqual(result.headers["Content-Type"], "application/octet-stream")

    def test_data_put_fbs(self):
        endpoint = "data/var"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        header = {"Accept": "application/octet-stream"}
        result = self.client.put(url, headers=header)
        self.assertEqual(result.status_code, HTTPStatus.BAD_REQUEST)

    def test_data_get_fbs(self):
        endpoint = "data/var"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        header = {"Accept": "application/octet-stream"}
        result = self.client.get(url, headers=header)
        self.assertEqual(result.status_code, HTTPStatus.BAD_REQUEST)

    def test_data_put_filter_fbs(self):
        endpoint = "data/var"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        header = {"Accept": "application/octet-stream"}
        filter = {"filter": {"var": {"index": [0, 1, 4]}}}
        result = self.client.put(url, headers=header, json=filter)
        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/octet-stream")
        df = decode_fbs.decode_matrix_FBS(result.data)
        self.assertEqual(df["n_rows"], 2638)
        self.assertEqual(df["n_cols"], 3)
        self.assertIsNotNone(df["columns"])
        self.assertIsNone(df["row_idx"])
        self.assertEqual(len(df["columns"]), df["n_cols"])
        self.assertListEqual(df["col_idx"].tolist(), [0, 1, 4])

    def test_data_get_filter_fbs(self):
        index_col_name = self.schema["schema"]["annotations"]["var"]["index"]
        endpoint = "data/var"
        query = f"var:{index_col_name}=SIK1"
        url = f"{self.TEST_URL_BASE}{endpoint}?{query}"
        header = {"Accept": "application/octet-stream"}
        result = self.client.get(url, headers=header)
        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/octet-stream")
        df = decode_fbs.decode_matrix_FBS(result.data)
        self.assertEqual(df["n_rows"], 2638)
        self.assertEqual(df["n_cols"], 1)

    def test_data_get_unknown_filter_fbs(self):
        index_col_name = self.schema["schema"]["annotations"]["var"]["index"]
        endpoint = "data/var"
        query = f"var:{index_col_name}=UNKNOWN"
        url = f"{self.TEST_URL_BASE}{endpoint}?{query}"
        header = {"Accept": "application/octet-stream"}
        result = self.client.get(url, headers=header)
        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/octet-stream")
        df = decode_fbs.decode_matrix_FBS(result.data)
        self.assertEqual(df["n_rows"], 2638)
        self.assertEqual(df["n_cols"], 0)

    def test_data_put_single_var(self):
        endpoint = "data/var"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        header = {"Accept": "application/octet-stream"}
        index_col_name = self.schema["schema"]["annotations"]["var"]["index"]
        var_filter = {"filter": {"var": {"annotation_value": [{"name": index_col_name, "values": ["RER1"]}]}}}
        result = self.client.put(url, headers=header, json=var_filter)
        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/octet-stream")
        df = decode_fbs.decode_matrix_FBS(result.data)
        self.assertEqual(df["n_rows"], 2638)
        self.assertEqual(df["n_cols"], 1)

    def test_colors(self):
        endpoint = "colors"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        result = self.client.get(url)
        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/json")
        result_data = json.loads(result.data)
        self.assertEqual(result_data, pbmc3k_colors)

    @skip_if(lambda x: os.getenv("SKIP_STATIC"), "Skip static test when running locally")
    def test_static(self):
        endpoint = "static"
        file = "assets/favicon.ico"
        url = f"{endpoint}/{file}"
        result = self.client.get(url)
        self.assertEqual(result.status_code, HTTPStatus.OK)

    def test_get_summaryvar(self):
        index_col_name = self.schema["schema"]["annotations"]["var"]["index"]
        endpoint = "summarize/var"

        # single column
        filter = f"var:{index_col_name}=F5"
        query = f"method=mean&{filter}"
        query_hash = hashlib.sha1(query.encode()).hexdigest()
        url = f"{self.TEST_URL_BASE}{endpoint}?{query}"
        header = {"Accept": "application/octet-stream"}
        result = self.client.get(url, headers=header)
        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/octet-stream")
        df = decode_fbs.decode_matrix_FBS(result.data)
        self.assertEqual(df["n_rows"], 2638)
        self.assertEqual(df["n_cols"], 1)
        self.assertEqual(df["col_idx"], [query_hash])
        self.assertAlmostEqual(df["columns"][0][0], -0.11505317)

        # multi-column
        col_names = ["F5", "BEB3", "SIK1"]
        filter = "&".join([f"var:{index_col_name}={name}" for name in col_names])
        query = f"method=mean&{filter}"
        query_hash = hashlib.sha1(query.encode()).hexdigest()
        url = f"{self.TEST_URL_BASE}{endpoint}?{query}"
        header = {"Accept": "application/octet-stream"}
        result = self.client.get(url, headers=header)
        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/octet-stream")
        df = decode_fbs.decode_matrix_FBS(result.data)
        self.assertEqual(df["n_rows"], 2638)
        self.assertEqual(df["n_cols"], 1)
        self.assertEqual(df["col_idx"], [query_hash])
        self.assertAlmostEqual(df["columns"][0][0], -0.16628358)

    def test_post_summaryvar(self):
        index_col_name = self.schema["schema"]["annotations"]["var"]["index"]
        endpoint = "summarize/var"
        headers = {"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/octet-stream"}

        # single column
        filter = f"var:{index_col_name}=F5"
        query = f"method=mean&{filter}"
        query_hash = hashlib.sha1(query.encode()).hexdigest()
        url = f"{self.TEST_URL_BASE}{endpoint}?key={query_hash}"
        result = self.client.post(url, headers=headers, data=query)

        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/octet-stream")
        df = decode_fbs.decode_matrix_FBS(result.data)
        self.assertEqual(df["n_rows"], 2638)
        self.assertEqual(df["n_cols"], 1)
        self.assertEqual(df["col_idx"], [query_hash])
        self.assertAlmostEqual(df["columns"][0][0], -0.11505317)

        # multi-column
        col_names = ["F5", "BEB3", "SIK1"]
        filter = "&".join([f"var:{index_col_name}={name}" for name in col_names])
        query = f"method=mean&{filter}"
        query_hash = hashlib.sha1(query.encode()).hexdigest()
        url = f"{self.TEST_URL_BASE}{endpoint}?key={query_hash}"
        result = self.client.post(url, headers=headers, data=query)
        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/octet-stream")
        df = decode_fbs.decode_matrix_FBS(result.data)
        self.assertEqual(df["n_rows"], 2638)
        self.assertEqual(df["n_cols"], 1)
        self.assertEqual(df["col_idx"], [query_hash])
        self.assertAlmostEqual(df["columns"][0][0], -0.16628358)


class TestDataLocatorMockApi(BaseTest):
    @classmethod
    @patch("server.dataset.dataset_metadata.requests.get")
    def setUpClass(cls, mock_get):
        cls.data_locator_api_base = "api.cellxgene.staging.single-cell.czi.technology/dp/v1"
        cls.config = AppConfig()
        cls.config.update_server_config(
            data_locator__api_base=cls.data_locator_api_base,
            app__web_base_url="https://cellxgene.staging.single-cell.czi.technology.com",
            multi_dataset__dataroot={"e": {"base_url": "e", "dataroot": FIXTURES_ROOT}},
            app__flask_secret_key="testing",
            app__debug=True,
            data_locator__s3__region_name="us-east-1",
        )
        super().setUpClass(cls.config)

        cls.TEST_DATASET_URL_BASE = "/e/pbmc3k_v1.cxg"
        cls.TEST_URL_BASE = f"{cls.TEST_DATASET_URL_BASE}/api/v0.2/"
        cls.config.complete_config()
        cls.response_body = json.dumps(
            {
                "collection_id": "4f098ff4-4a12-446b-a841-91ba3d8e3fa6",
                "collection_visibility": "PUBLIC",
                "dataset_id": "2fa37b10-ab4d-49c9-97a8-b4b3d80bf939",
                "s3_uri": f"{FIXTURES_ROOT}/pbmc3k.cxg",
                "tombstoned": False,
            }
        )
        mock_get.return_value = MockResponse(body=cls.response_body, status_code=200)

        cls.app.testing = True
        cls.client = cls.app.test_client()

        result = cls.client.get(f"{cls.TEST_URL_BASE}schema")
        cls.schema = json.loads(result.data)

        assert mock_get.call_count == 1
        assert (
            f"http://{mock_get._mock_call_args[1]['url']}"
            == f"http://{cls.data_locator_api_base}/datasets/meta?url={cls.config.server_config.get_web_base_url()}{cls.TEST_DATASET_URL_BASE}/"
        )  # noqa E501

    @patch("server.dataset.dataset_metadata.requests.get")
    def test_data_adaptor_uses_corpora_api(self, mock_get):
        mock_get.return_value = MockResponse(body=self.response_body, status_code=200)

        endpoint = "schema"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        result = self.client.get(url)

        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/json")

        mock_get.assert_called_once_with(
            url="api.cellxgene.staging.single-cell.czi.technology/dp/v1/datasets/meta?url=https://cellxgene.staging.single-cell.czi.technology.com/e/pbmc3k_v1.cxg/",
            headers={"Content-Type": "application/json", "Accept": "application/json"},
        )

        # Check mocked MatrixDataLoader correctly loads schema
        result_data = json.loads(result.data)
        self.assertEqual(result_data["schema"]["dataframe"]["nObs"], 2638)
        self.assertEqual(len(result_data["schema"]["annotations"]["obs"]), 2)
        self.assertEqual(len(result_data["schema"]["annotations"]["obs"]["columns"]), 5)

    @patch("server.dataset.dataset_metadata.requests.get")
    def test_config(self, mock_get):
        mock_get.return_value = MockResponse(body=self.response_body, status_code=200)
        endpoint = "config"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        result = self.client.get(url)

        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/json")
        result_data = json.loads(result.data)
        self.assertIsNotNone(result_data["config"])

        mock_get.assert_called_once_with(
            url="api.cellxgene.staging.single-cell.czi.technology/dp/v1/datasets/meta?url=https://cellxgene.staging.single-cell.czi.technology.com/e/pbmc3k_v1.cxg/",
            headers={"Content-Type": "application/json", "Accept": "application/json"},
        )

    @patch("server.dataset.dataset_metadata.requests.get")
    def test_get_annotations_obs_fbs(self, mock_get):
        mock_get.return_value = MockResponse(body=self.response_body, status_code=200)
        endpoint = "annotations/obs"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        header = {"Accept": "application/octet-stream"}
        result = self.client.get(url, headers=header)

        # check that the metadata api was called
        mock_get.assert_called_once_with(
            url="api.cellxgene.staging.single-cell.czi.technology/dp/v1/datasets/meta?url=https://cellxgene.staging.single-cell.czi.technology.com/e/pbmc3k_v1.cxg/",
            headers={"Content-Type": "application/json", "Accept": "application/json"},
        )

        # check response
        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/octet-stream")

        # TODO @madison refactor mock out s3 instead of MatrixDataLoader
        # check mocked MatrixDataLoader is returning correctly
        df = decode_fbs.decode_matrix_FBS(result.data)
        self.assertEqual(df["n_rows"], 2638)

    @patch("server.dataset.dataset_metadata.requests.get")
    def test_metadata_api_called_for_new_dataset(self, mock_get):
        self.TEST_DATASET_URL_BASE = "/e/pbmc3k_v0.cxg"
        self.TEST_URL_BASE = f"{self.TEST_DATASET_URL_BASE}/api/v0.2/"
        response_body = json.dumps(
            {
                "collection_id": "4f098ff4-4a12-446b-a841-91ba3d8e3fa6",
                "collection_visibility": "PUBLIC",
                "dataset_id": "2fa37b10-ab4d-49c9-97a8-b4b3d80bf939",
                "s3_uri": f"{FIXTURES_ROOT}/pbmc3k.cxg",
                "tombstoned": False,
            }
        )
        mock_get.return_value = MockResponse(body=response_body, status_code=200)

        endpoint = "schema"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        result = self.client.get(url)

        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/json")

        # check that the metadata api was correctly called for the new dataset
        self.assertEqual(mock_get.call_count, 1)
        self.assertEqual(
            f"http://{mock_get._mock_call_args[1]['url']}",
            "http://api.cellxgene.staging.single-cell.czi.technology/dp/v1/datasets/meta?url=https://cellxgene.staging.single-cell.czi.technology.com/e/pbmc3k_v0.cxg/",
            # noqa E501
        )

    @patch("server.dataset.dataset_metadata.requests.get")
    def test_data_locator_defaults_to_name_based_lookup_if_metadata_api_throws_error(self, mock_get):
        self.TEST_DATASET_URL_BASE = "/e/pbmc3k.cxg"
        self.TEST_URL_BASE = f"{self.TEST_DATASET_URL_BASE}/api/v0.2/"
        mock_get.side_effect = HTTPException

        endpoint = "schema"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        result = self.client.get(url)

        # check that the metadata api was correctly called for the new dataset
        self.assertEqual(mock_get.call_count, 1)
        self.assertEqual(
            f"http://{mock_get._mock_call_args[1]['url']}",
            "http://api.cellxgene.staging.single-cell.czi.technology/dp/v1/datasets/meta?url=https://cellxgene.staging.single-cell.czi.technology.com/e/pbmc3k.cxg/",
            # noqa E501
        )

        # check schema loads correctly even with metadata api exception
        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/json")
        expected_response_body = {
            "schema": {
                "annotations": {
                    "obs": {
                        "columns": [
                            {"name": "name_0", "type": "string", "writable": False},
                            {"name": "n_genes", "type": "int32", "writable": False},
                            {"name": "percent_mito", "type": "float32", "writable": False},
                            {"name": "n_counts", "type": "float32", "writable": False},
                            {
                                "categories": [
                                    "CD4 T cells",
                                    "CD14+ Monocytes",
                                    "B cells",
                                    "CD8 T cells",
                                    "NK cells",
                                    "FCGR3A+ Monocytes",
                                    "Dendritic cells",
                                    "Megakaryocytes",
                                ],
                                "name": "louvain",
                                "type": "categorical",
                                "writable": False,
                            },
                        ],
                        "index": "name_0",
                    },
                    "var": {
                        "columns": [
                            {"name": "name_0", "type": "string", "writable": False},
                            {"name": "n_cells", "type": "int32", "writable": False},
                        ],
                        "index": "name_0",
                    },
                },
                "dataframe": {"nObs": 2638, "nVar": 1838, "type": "float32"},
                "layout": {
                    "obs": [
                        {"dims": ["draw_graph_fr_0", "draw_graph_fr_1"], "name": "draw_graph_fr", "type": "float32"},
                        {"dims": ["pca_0", "pca_1"], "name": "pca", "type": "float32"},
                        {"dims": ["tsne_0", "tsne_1"], "name": "tsne", "type": "float32"},
                        {"dims": ["umap_0", "umap_1"], "name": "umap", "type": "float32"},
                    ]
                },
            }
        }
        self.assertEqual(json.loads(result.data), expected_response_body)

    def test_dataset_does_not_exist(self):
        self.TEST_DATASET_URL_BASE = "/e/no_dataset.cxg"
        self.TEST_URL_BASE = f"{self.TEST_DATASET_URL_BASE}/api/v0.2/"
        endpoint = "schema"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)

    @patch("server.dataset.dataset_metadata.requests.get")
    def test_tombstoned_datasets_redirect_to_data_portal(self, mock_get):
        response_body = json.dumps(
            {
                "collection_id": "4f098ff4-4a12-446b-a841-91ba3d8e3fa6",
                "collection_visibility": "PUBLIC",
                "dataset_id": "2fa37b10-ab4d-49c9-97a8-b4b3d80bf939",
                "s3_uri": None,
                "tombstoned": True,
            }
        )
        mock_get.return_value = MockResponse(body=response_body, status_code=200)
        endpoint = "config"
        self.TEST_DATASET_URL_BASE = "/e/pbmc3k_v2.cxg"
        url = f"{self.TEST_DATASET_URL_BASE}/api/v0.2/{endpoint}"
        result = self.client.get(url)
        self.assertEqual(result.status_code, 302)
        self.assertEqual(
            result.headers["Location"],
            "https://cellxgene.staging.single-cell.czi.technology.com/collections/4f098ff4-4a12-446b-a841-91ba3d8e3fa6?tombstoned_dataset_id=2fa37b10-ab4d-49c9-97a8-b4b3d80bf939",
        )  # noqa E501


class TestDatasetMetadata(BaseTest):
    @classmethod
    def setUpClass(cls):
        cls.data_locator_api_base = "api.cellxgene.staging.single-cell.czi.technology/dp/v1"
        cls.app__web_base_url = "https://cellxgene.staging.single-cell.czi.technology/"
        cls.config = AppConfig()
        cls.config.update_server_config(
            data_locator__api_base=cls.data_locator_api_base,
            app__web_base_url=cls.app__web_base_url,
            multi_dataset__dataroot={"e": {"base_url": "e", "dataroot": FIXTURES_ROOT}},
            app__flask_secret_key="testing",
            app__debug=True,
            data_locator__s3__region_name="us-east-1",
            app__generate_cache_control_headers=True,
        )
        cls.meta_response_body = {
            "collection_id": "4f098ff4-4a12-446b-a841-91ba3d8e3fa6",
            "collection_visibility": "PUBLIC",
            "dataset_id": "2fa37b10-ab4d-49c9-97a8-b4b3d80bf939",
            "s3_uri": f"{FIXTURES_ROOT}/pbmc3k.cxg",
            "tombstoned": False,
        }
        super().setUpClass(cls.config)

        cls.app.testing = True
        cls.client = cls.app.test_client()

    def verify_response(self, result):
        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/json")
        self.assertTrue(result.cache_control.no_store)
        self.assertEqual(result.cache_control.max_age, 0)

    @patch("server.dataset.dataset_metadata.request_dataset_metadata_from_data_portal")
    @patch("server.dataset.dataset_metadata.requests.get")
    def test_dataset_metadata_api_called_for_public_collection(self, mock_get, mock_dp):
        self.TEST_DATASET_URL_BASE = "/e/pbmc3k_v0_public.cxg"
        self.TEST_URL_BASE = f"{self.TEST_DATASET_URL_BASE}/api/v0.2/"

        response_body = {
            "contact_email": "test_email",
            "contact_name": "test_user",
            "datasets": [
                {
                    "collection_visibility": "PUBLIC",
                    "id": "2fa37b10-ab4d-49c9-97a8-b4b3d80bf939",
                    "name": "Test Dataset",
                },
            ],
            "description": "test_description",
            "id": "4f098ff4-4a12-446b-a841-91ba3d8e3fa6",
            "links": [
                "http://test.link",
            ],
            "name": "Test Collection",
            "publisher_metadata": {
                "journal": "Nature",
            },
            "visibility": "PUBLIC",
        }

        mock_get.return_value = MockResponse(body=json.dumps(response_body), status_code=200)
        mock_dp.return_value = self.meta_response_body

        endpoint = "dataset-metadata"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        result = self.client.get(url)

        self.verify_response(result)

        self.assertEqual(mock_get.call_count, 1)

        response_obj = json.loads(result.data)["metadata"]

        self.assertEqual(response_obj["dataset_name"], "Test Dataset")

        expected_url = f"https://cellxgene.staging.single-cell.czi.technology/collections/{response_body['id']}"
        self.assertEqual(response_obj["dataset_id"], response_body["datasets"][0]["id"])
        self.assertEqual(response_obj["collection_url"], expected_url)
        self.assertEqual(response_obj["collection_name"], response_body["name"])
        self.assertEqual(response_obj["collection_contact_email"], response_body["contact_email"])
        self.assertEqual(response_obj["collection_contact_name"], response_body["contact_name"])
        self.assertEqual(response_obj["collection_description"], response_body["description"])
        self.assertEqual(response_obj["collection_links"], response_body["links"])
        self.assertEqual(response_obj["collection_datasets"], response_body["datasets"])
        self.assertDictEqual(response_obj["collection_publisher_metadata"], response_body["publisher_metadata"])

    @patch("server.dataset.dataset_metadata.request_dataset_metadata_from_data_portal")
    @patch("server.dataset.dataset_metadata.requests.get")
    def test_dataset_metadata_api_called_for_private_collection(self, mock_get, mock_dp):
        self.TEST_DATASET_URL_BASE = "/e/pbmc3k_v0_private.cxg"
        self.TEST_URL_BASE = f"{self.TEST_DATASET_URL_BASE}/api/v0.2/"

        response_body = {
            "contact_email": "test_email",
            "contact_name": "test_user",
            "datasets": [
                {
                    "collection_visibility": "PRIVATE",
                    "id": "2fa37b10-ab4d-49c9-97a8-b4b3d80bf939",
                    "name": "Test Dataset",
                },
            ],
            "description": "test_description",
            "id": "4f098ff4-4a12-446b-a841-91ba3d8e3fa6",
            "links": [
                "http://test.link",
            ],
            "name": "Test Collection",
            "visibility": "PRIVATE",
        }

        mock_get.return_value = MockResponse(body=json.dumps(response_body), status_code=200)
        meta_response_body_private = self.meta_response_body.copy()
        meta_response_body_private["collection_visibility"] = "PRIVATE"
        mock_dp.return_value = meta_response_body_private

        endpoint = "dataset-metadata"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        result = self.client.get(url)

        self.verify_response(result)

        self.assertEqual(mock_get.call_count, 1)

        response_obj = json.loads(result.data)["metadata"]

        self.assertEqual(response_obj["dataset_name"], "Test Dataset")

        expected_url = f"https://cellxgene.staging.single-cell.czi.technology/collections/{response_body['id']}/private"
        self.assertEqual(response_obj["dataset_id"], response_body["datasets"][0]["id"])
        self.assertEqual(response_obj["collection_url"], expected_url)
        self.assertEqual(response_obj["collection_name"], response_body["name"])
        self.assertEqual(response_obj["collection_contact_email"], response_body["contact_email"])
        self.assertEqual(response_obj["collection_contact_name"], response_body["contact_name"])
        self.assertEqual(response_obj["collection_description"], response_body["description"])
        self.assertEqual(response_obj["collection_links"], response_body["links"])
        self.assertEqual(response_obj["collection_datasets"], response_body["datasets"])

    @patch("server.dataset.dataset_metadata.request_dataset_metadata_from_data_portal")
    def test_dataset_metadata_api_fails_gracefully_on_dataset_not_found(self, mock_dp):
        # If request_dataset_metadata_from_data_portal, it always returns None
        mock_dp.return_value = None

        endpoint = "dataset-metadata"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        result = self.client.get(url)

        self.assertEqual(result.status_code, HTTPStatus.NOT_FOUND)

    @patch("server.dataset.dataset_metadata.request_dataset_metadata_from_data_portal")
    @patch("server.dataset.dataset_metadata.requests.get")
    def test_dataset_metadata_api_fails_gracefully_on_connection_failure(self, mock_get, mock_dp):
        # TODO: Shouldn't matter what we request if the request's connection fails altogether
        self.TEST_DATASET_URL_BASE = "/e/pbmc3k_v0.cxg"
        self.TEST_URL_BASE = f"{self.TEST_DATASET_URL_BASE}/api/v0.2/"

        mock_dp.return_value = self.meta_response_body
        mock_get.side_effect = Exception("Cannot connect to the data portal")

        endpoint = "dataset-metadata"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        result = self.client.get(url)

        # TODO: This doesn't seem like a valid test for connection failure. There should be *no* response at all instead of a 400 status
        self.assertEqual(result.status_code, HTTPStatus.BAD_REQUEST)


class TestConfigEndpoint(BaseTest):
    @classmethod
    def setUpClass(cls):
        cls.data_locator_api_base = "api.cellxgene.staging.single-cell.czi.technology/dp/v1"
        cls.app__web_base_url = "https://cellxgene.staging.single-cell.czi.technology/"
        cls.config = AppConfig()
        cls.config.update_server_config(
            data_locator__api_base=cls.data_locator_api_base,
            app__web_base_url=cls.app__web_base_url,
            multi_dataset__dataroot={"e": {"base_url": "e", "dataroot": FIXTURES_ROOT}},
            app__flask_secret_key="testing",
            app__debug=True,
            data_locator__s3__region_name="us-east-1",
        )
        super().setUpClass(cls.config)

        cls.app.testing = True
        cls.client = cls.app.test_client()

    def test_config_has_collections_home_page(self):
        self.TEST_DATASET_URL_BASE = "/e/pbmc3k_v0.cxg"
        self.TEST_URL_BASE = f"{self.TEST_DATASET_URL_BASE}/api/v0.2/"

        endpoint = "config"
        url = f"{self.TEST_URL_BASE}{endpoint}"
        # print(f"SDFSDF SDJFSF D {url}")
        result = self.client.get(url)
        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/json")
        result_data = json.loads(result.data)
        self.assertEqual(result_data["config"]["links"]["collections-home-page"], self.app__web_base_url[:-1])


class MockResponse:
    def __init__(self, body, status_code):
        self.content = body
        self.status_code = status_code

    def json(self):
        return json.loads(self.content)
