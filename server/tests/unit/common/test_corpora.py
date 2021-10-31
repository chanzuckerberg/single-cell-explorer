import json
import os
from http import HTTPStatus

from server.common.config.app_config import AppConfig
from server.tests import FIXTURES_ROOT
from server.tests.unit import BaseTest

VERSION = "v0.2"


class CorporaRESTAPITest(BaseTest):
    """Confirm endpoints reflect Corpora-specific features"""

    @classmethod
    def setUpClass(cls, app_config=None):
        if not app_config:
            app_config = AppConfig()
        app_config.update_server_config(multi_dataset__dataroot=FIXTURES_ROOT)

        super().setUpClass(app_config)
        cls.app.testing = True
        cls.client = cls.app.test_client()

    def setUp(self):
        self.session = self.client
        # TODO: Does this CXG test fixture contain corpora props?
        self.url_base = "/d/corpora-pbmc3k.cxg/api/v0.2/"

    @classmethod
    def tearDownClass(cls) -> None:
        os.remove(cls.dst)

    def test_config(self):
        endpoint = "config"
        url = f"{self.url_base}{endpoint}"
        header = {"Content-Type": "application/json"}
        result = self.session.get(url, headers=header)
        self.assertEqual(result.status_code, HTTPStatus.OK)
        self.assertEqual(result.headers["Content-Type"], "application/json")

        result_data = json.loads(result.data)
        self.assertIsInstance(result_data["config"]["corpora_props"], dict)
        self.assertIsInstance(result_data["config"]["parameters"], dict)

        corpora_props = result_data["config"]["corpora_props"]
        parameters = result_data["config"]["parameters"]

        self.assertEqual(corpora_props["version"]["corpora_schema_version"], "1.0.0")

        self.assertEqual(corpora_props["organism"], "human")
        self.assertEqual(parameters["default_embedding"], "tsne")
