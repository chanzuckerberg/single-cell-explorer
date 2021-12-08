import os
import unittest

import requests


@unittest.skipIf(os.getenv("CXG_API_BASE") is None, "CXG_API_BASE not defined")
class TestAPICache(unittest.TestCase):
    def setUp(self):
        self.apiUrlBase = os.environ["CXG_API_BASE"]

    def test_dataset_metadata(self):
        response = requests.get("/".join([self.apiUrlBase, "dp/v1/collections"]))
        response.raise_for_status()
        collection_id = response.json()['collections'][0]['id']
        response = requests.get("/".join([self.apiUrlBase, f"dp/v1/collections/{collection_id}"]))
        response.raise_for_status()
        dataset_id = response.json()['datasets'][0]['id']
        response = requests.head('/'.join([self.apiUrlBase, 'cellxgene/e', f"{dataset_id}.cxg", 'api/v0.3/dataset-metadata']))
        response.raise_for_status()
        cache_control = response.headers['cache-control']
        self.assertIn('no-store', cache_control)
        self.assertIn('max-age=0', cache_control)
        self.assertIn('public', cache_control)

