import json
import os
from unittest.mock import patch
from urllib.parse import quote

import yaml

from server.common.errors import ConfigurationError
from server.common.config.app_config import AppConfig
from server.common.utils.type_conversion_utils import convert_string_to_value
from server.tests import FIXTURES_ROOT
from server.tests.unit.common.config import ConfigTests


class TestExternalConfig(ConfigTests):
    def test_type_convert(self):
        # The values from environment variables and aws secrets are returned as strings.
        # These values need to be converted to the proper types.

        self.assertEqual(convert_string_to_value("1"), int(1))
        self.assertEqual(convert_string_to_value("1.1"), float(1.1))
        self.assertEqual(convert_string_to_value("string"), "string")
        self.assertEqual(convert_string_to_value("true"), True)
        self.assertEqual(convert_string_to_value("True"), True)
        self.assertEqual(convert_string_to_value("false"), False)
        self.assertEqual(convert_string_to_value("False"), False)
        self.assertEqual(convert_string_to_value("null"), None)
        self.assertEqual(convert_string_to_value("None"), None)
        self.assertEqual(convert_string_to_value("{'a':10, 'b':'string'}"), dict(a=int(10), b="string"))

    def test_environment_variable(self):

        configfile = self.custom_external_config(
            environment=[
                dict(name="DATAROOT", path=["server", "multi_dataset", "dataroot"], required=True),
                dict(name="DIFFEXP", path=["dataset", "diffexp", "enable"], required=True),
            ],
            config_file_name="environment_external_config.yaml",
        )

        env = os.environ
        env["DATAROOT"] = f"{FIXTURES_ROOT}"
        env["DIFFEXP"] = "False"
        config = AppConfig()
        config.update_from_config_file(configfile)
        config.update_server_config(app__flask_secret_key="123 magic")

        server = self.create_app(config)

        server.testing = True
        session = server.test_client()

        def _get_v03_url(url):  # TODO inline and do not use an API call to generate
            response = session.get(f"{url}/api/v0.3/s3_uri")
            s3_uri = quote(quote(response.json, safe=""), safe="")
            return f"/s3_uri/{s3_uri}/api/v0.3"

        v03_url = _get_v03_url("/d/pbmc3k.cxg")
        response = session.get(f"{v03_url}/config")
        data_config = json.loads(response.data)
        self.assertEqual(data_config["config"]["displayNames"]["dataset"], "pbmc3k")
        self.assertTrue(data_config["config"]["parameters"]["disable-diffexp"])

        os.environ["DIFFEXP"] = "True"

        config = AppConfig()
        config.update_from_config_file(configfile)

        config.update_server_config(app__flask_secret_key="123 magic")

        server = self.create_app(config)

        server.testing = True
        session = server.test_client()

        v03_url = _get_v03_url("/d/pbmc3k.cxg")
        response = session.get(f"{v03_url}/config")
        data_config = json.loads(response.data)
        self.assertEqual(data_config["config"]["displayNames"]["dataset"], "pbmc3k")
        self.assertFalse(data_config["config"]["parameters"]["disable-diffexp"])

    def test_environment_variable_errors(self):
        # no name
        app_config = AppConfig()
        app_config.external_config.environment = [dict(required=True, path=["this", "is", "a", "path"])]
        with self.assertRaises(ConfigurationError) as config_error:
            app_config.complete_config()
        self.assertEqual(config_error.exception.message, "environment: 'name' is missing")

        # required has wrong type
        app_config = AppConfig()
        app_config.external_config.environment = [
            dict(name="myenvar", required="optional", path=["this", "is", "a", "path"])
        ]
        with self.assertRaises(ConfigurationError) as config_error:
            app_config.complete_config()
        self.assertEqual(config_error.exception.message, "environment: 'required' must be a bool")

        # no path
        app_config = AppConfig()
        app_config.external_config.environment = [dict(name="myenvar", required=True)]
        with self.assertRaises(ConfigurationError) as config_error:
            app_config.complete_config()
        self.assertEqual(config_error.exception.message, "environment: 'path' is missing")

        # required environment variable is not set
        app_config = AppConfig()
        app_config.external_config.environment = [
            dict(name="THIS_ENV_IS_NOT_SET", required=True, path=["this", "is", "a", "path"])
        ]
        with self.assertRaises(ConfigurationError) as config_error:
            app_config.complete_config()
        self.assertEqual(config_error.exception.message, "required environment variable 'THIS_ENV_IS_NOT_SET' not set")

    @patch("server.common.config.external_config.get_secret_key")
    def test_aws_secrets_manager(self, mock_get_secret_key):
        mock_get_secret_key.return_value = {
            "some_aws_secret_key": "a_secret_value",
        }
        configfile = self.custom_external_config(
            aws_secrets_manager_region="us-west-2",
            aws_secrets_manager_secrets=[
                dict(
                    name="my_secret",
                    values=[
                        dict(key="flask_secret_key", path=["server", "app", "flask_secret_key"], required=False),
                        dict(
                            key="some_aws_secret_key",
                            # this config path is not really something that needs to be set by a secret, but using this
                            # for our testing purposes
                            path=["server", "multi_dataset", "dataroot"],
                            required=True,
                        )
                    ],
                )
            ],
            config_file_name="secret_external_config.yaml",
        )

        app_config = AppConfig()
        app_config.update_from_config_file(configfile)
        app_config.server_config.app__flask_secret_key = "original"

        app_config.complete_config()

        self.assertEqual(app_config.server_config.app__flask_secret_key, "original")

    @patch("server.common.config.external_config.get_secret_key")
    def test_aws_secrets_manager_error(self, mock_get_secret_key):
        mock_get_secret_key.return_value = {
            "flask_secret_key": "mock_db_uri",
        }

        # no region
        app_config = AppConfig()
        app_config.external_config.aws_secrets_manager__region = None
        app_config.external_config.aws_secrets_manager__secrets = [
            dict(name="secret1", values=[dict(key="key1", required=True, path=["this", "is", "my", "path"])])
        ]
        with self.assertRaises(ConfigurationError) as config_error:
            app_config.complete_config()
        self.assertEqual(
            config_error.exception.message,
            "Invalid type for attribute: aws_secrets_manager__region, expected types (str), got NoneType",
        )

        # missing secret name
        app_config = AppConfig()
        app_config.external_config.aws_secrets_manager__region = "us-west-2"
        app_config.external_config.aws_secrets_manager__secrets = [
            dict(values=[dict(key="flask_secret_key", required=True, path=["this", "is", "my", "path"])])
        ]
        with self.assertRaises(ConfigurationError) as config_error:
            app_config.complete_config()
        self.assertEqual(config_error.exception.message, "aws_secrets_manager: 'name' is missing")

        # secret name wrong type
        app_config = AppConfig()
        app_config.external_config.aws_secrets_manager__region = "us-west-2"
        app_config.external_config.aws_secrets_manager__secrets = [
            dict(name=1, values=[dict(key="flask_secret_key", required=True, path=["this", "is", "my", "path"])])
        ]
        with self.assertRaises(ConfigurationError) as config_error:
            app_config.complete_config()
        self.assertEqual(config_error.exception.message, "aws_secrets_manager: 'name' must be a string")

        # missing values name
        app_config = AppConfig()
        app_config.external_config.aws_secrets_manager__region = "us-west-2"
        app_config.external_config.aws_secrets_manager__secrets = [dict(name="mysecret")]
        with self.assertRaises(ConfigurationError) as config_error:
            app_config.complete_config()
        self.assertEqual(config_error.exception.message, "aws_secrets_manager: 'values' is missing")

        # values wrong type
        app_config = AppConfig()
        app_config.external_config.aws_secrets_manager__region = "us-west-2"
        app_config.external_config.aws_secrets_manager__secrets = [
            dict(name="mysecret", values=dict(key="flask_secret_key", required=True, path=["this", "is", "my", "path"]))
        ]
        with self.assertRaises(ConfigurationError) as config_error:
            app_config.complete_config()
        self.assertEqual(config_error.exception.message, "aws_secrets_manager: 'values' must be a list")

        # entry missing key
        app_config = AppConfig()
        app_config.external_config.aws_secrets_manager__region = "us-west-2"
        app_config.external_config.aws_secrets_manager__secrets = [
            dict(name="mysecret", values=[dict(required=True, path=["this", "is", "my", "path"])])
        ]
        with self.assertRaises(ConfigurationError) as config_error:
            app_config.complete_config()
        self.assertEqual(config_error.exception.message, "missing 'key' in secret values: mysecret")

        # entry required is wrong type
        app_config = AppConfig()
        app_config.external_config.aws_secrets_manager__region = "us-west-2"
        app_config.external_config.aws_secrets_manager__secrets = [
            dict(name="mysecret", values=[dict(key="flask_secret_key", required="optional", path=["this", "is", "my", "path"])])
        ]
        with self.assertRaises(ConfigurationError) as config_error:
            app_config.complete_config()
        self.assertEqual(config_error.exception.message, "wrong type for 'required' in secret values: mysecret")

        # entry missing path
        app_config = AppConfig()
        app_config.external_config.aws_secrets_manager__region = "us-west-2"
        app_config.external_config.aws_secrets_manager__secrets = [
            dict(name="mysecret", values=[dict(key="flask_secret_key", required=True)])
        ]
        with self.assertRaises(ConfigurationError) as config_error:
            app_config.complete_config()
        self.assertEqual(config_error.exception.message, "missing 'path' in secret values: mysecret")

        # secret missing required key
        app_config = AppConfig()
        app_config.external_config.aws_secrets_manager__region = "us-west-2"
        app_config.external_config.aws_secrets_manager__secrets = [
            dict(
                name="mysecret",
                values=[dict(key="KEY_DOES_NOT_EXIST", required=True, path=["this", "is", "a", "path"])],
            )
        ]
        with self.assertRaises(ConfigurationError) as config_error:
            app_config.complete_config()
        self.assertEqual(config_error.exception.message, "required secret 'mysecret:KEY_DOES_NOT_EXIST' not set")
