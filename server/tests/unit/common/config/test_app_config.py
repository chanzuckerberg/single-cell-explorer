import os
import tempfile
import unittest

import yaml

from server.common.config.app_config import AppConfig
from server.common.errors import ConfigurationError
from server.default_config import default_config
from server.tests import FIXTURES_ROOT
from server.tests.unit.common.config import ConfigTests


class AppConfigTest(ConfigTests):
    def setUp(self):
        self.config_file_name = f"{unittest.TestCase.id(self).split('.')[-1]}.yml"
        self.config = AppConfig()
        self.config.update_server_config(app__flask_secret_key="secret")
        self.config.update_server_config(multi_dataset__dataroot=FIXTURES_ROOT)
        self.server_config = self.config.server_config
        self.config.complete_config()

        message_list = []

        def noop(message):
            message_list.append(message)

        messagefn = noop
        self.context = dict(messagefn=messagefn, messages=message_list)

    def get_config(self, **kwargs):
        file_name = self.custom_app_config(
            dataroot=f"{FIXTURES_ROOT}", config_file_name=self.config_file_name, **kwargs
        )
        config = AppConfig()
        config.update_from_config_file(file_name)
        return config

    def test_get_default_config_correctly_reads_default_config_file(self):
        app_default_config = AppConfig().default_config

        expected_config = yaml.load(default_config, Loader=yaml.Loader)

        server_config = app_default_config["server"]
        dataset_config = app_default_config["dataset"]

        expected_server_config = expected_config["server"]
        expected_dataset_config = expected_config["dataset"]

        self.assertDictEqual(app_default_config, expected_config)
        self.assertDictEqual(server_config, expected_server_config)
        self.assertDictEqual(dataset_config, expected_dataset_config)

    def test_get_dataset_config_returns_default_dataset_config_for_single_datasets(self):
        datapath = f"{FIXTURES_ROOT}/some_dataset.cxg"
        file_name = self.custom_app_config(dataset_datapath=datapath, config_file_name=self.config_file_name)
        config = AppConfig()
        config.update_from_config_file(file_name)

        self.assertEqual(config.get_dataset_config(""), config.default_dataset_config)

    def test_update_server_config_updates_server_config_and_config_status(self):
        config = self.get_config()
        config.complete_config()
        config.check_config()
        config.update_server_config(multi_dataset__dataroot=FIXTURES_ROOT)
        with self.assertRaises(ConfigurationError):
            config.server_config.check_config()

    def test_write_config_outputs_yaml_with_all_config_vars(self):
        config = self.get_config()
        config.write_config(f"{FIXTURES_ROOT}/tmp_dir/write_config.yml")
        with open(f"{FIXTURES_ROOT}/tmp_dir/{self.config_file_name}", "r") as default_config:
            default_config_yml = yaml.safe_load(default_config)

        with open(f"{FIXTURES_ROOT}/tmp_dir/write_config.yml", "r") as output_config:
            output_config_yml = yaml.safe_load(output_config)
        self.maxDiff = None
        self.assertEqual(default_config_yml, output_config_yml)

    def test_update_app_config(self):
        config = AppConfig()
        config.update_server_config(app__verbose=True, multi_dataset__dataroot="datadir")
        vars = config.server_config.changes_from_default()
        self.assertCountEqual(vars, [("app__verbose", True, False), ("multi_dataset__dataroot", "datadir", None)])

        config = AppConfig()
        config.update_default_dataset_config(app__scripts=(), app__inline_scripts=())
        vars = config.server_config.changes_from_default()
        self.assertCountEqual(vars, [])

        config = AppConfig()
        config.update_default_dataset_config(app__scripts=[], app__inline_scripts=[])
        vars = config.default_dataset_config.changes_from_default()
        self.assertCountEqual(vars, [])

        config = AppConfig()
        config.update_default_dataset_config(app__scripts=("a", "b"), app__inline_scripts=["c", "d"])
        vars = config.default_dataset_config.changes_from_default()
        self.assertCountEqual(vars, [("app__scripts", ["a", "b"], []), ("app__inline_scripts", ["c", "d"], [])])

    def test_configfile_no_dataset_section(self):
        # test a config file without a dataset section

        with tempfile.TemporaryDirectory() as tempdir:
            configfile = os.path.join(tempdir, "config.yaml")
            with open(configfile, "w") as fconfig:
                config = """
                server:
                    app:
                        flask_secret_key: secret
                    multi_dataset:
                        dataroot: test_dataroot

                """
                fconfig.write(config)

            app_config = AppConfig()
            app_config.update_from_config_file(configfile)
            server_changes = app_config.server_config.changes_from_default()
            dataset_changes = app_config.default_dataset_config.changes_from_default()
            self.assertEqual(
                server_changes,
                [("app__flask_secret_key", "secret", None), ("multi_dataset__dataroot", "test_dataroot", None)],
            )
            self.assertEqual(dataset_changes, [])

    def test_configfile_no_server_section(self):
        with tempfile.TemporaryDirectory() as tempdir:
            configfile = os.path.join(tempdir, "config.yaml")
            with open(configfile, "w") as fconfig:
                config = """
                dataset:
                  app:
                    about_legal_tos: expected_value
                """
                fconfig.write(config)

            app_config = AppConfig()
            app_config.update_from_config_file(configfile)
            server_changes = app_config.server_config.changes_from_default()
            self.assertEqual(server_changes, [])
            single_dataset_changes = app_config.default_dataset_config.changes_from_default()
            self.assertEqual(single_dataset_changes, [("app__about_legal_tos", "expected_value", None)])

    def test_simple_update_single_config_from_path_and_value(self):
        """Update a simple config parameter"""

        config = AppConfig()
        config.server_config.multi_dataset__dataroot = dict(
            s1=dict(dataroot="my_dataroot_s1", base_url="my_baseurl_s1"),
            s2=dict(dataroot="my_dataroot_s2", base_url="my_baseurl_s2"),
        )
        config.add_dataroot_config("s1")
        config.add_dataroot_config("s2")

        # test simple value in server
        config.update_single_config_from_path_and_value(["server", "app", "flask_secret_key"], "mysecret")
        self.assertEqual(config.server_config.app__flask_secret_key, "mysecret")

        # test simple value in default dataset
        config.update_single_config_from_path_and_value(
            ["dataset", "app", "about_legal_tos"],
            "expected_value",
        )
        self.assertEqual(config.default_dataset_config.app__about_legal_tos, "expected_value")
        self.assertEqual(config.dataroot_config["s1"].app__about_legal_tos, "expected_value")
        self.assertEqual(config.dataroot_config["s2"].app__about_legal_tos, "expected_value")

        # test simple value in specific dataset
        config.update_single_config_from_path_and_value(
            ["per_dataset_config", "s1", "app", "about_legal_tos"], "expected_value_s1"
        )
        self.assertEqual(config.default_dataset_config.app__about_legal_tos, "expected_value")
        self.assertEqual(config.dataroot_config["s1"].app__about_legal_tos, "expected_value_s1")
        self.assertEqual(config.dataroot_config["s2"].app__about_legal_tos, "expected_value")

        # error checking
        bad_paths = [
            (
                ["dataset", "does", "not", "exist"],
                "unknown config parameter at path: '['dataset', 'does', 'not', 'exist']'",
            ),
            (["does", "not", "exist"], "path must start with 'server', 'dataset', or 'per_dataset_config'"),
            ([], "path must start with 'server', 'dataset', or 'per_dataset_config'"),
            (["per_dataset_config"], "missing dataroot when using per_dataset_config: got '['per_dataset_config']'"),
            (
                ["per_dataset_config", "unknown"],
                "unknown dataroot when using per_dataset_config: got '['per_dataset_config', 'unknown']',"
                " dataroots specified in config are ['s1', 's2']",
            ),
            ([1, 2, 3], "path must be a list of strings, got '[1, 2, 3]'"),
            ("string", "path must be a list of strings, got 'string'"),
        ]
        for bad_path, error_message in bad_paths:
            with self.assertRaises(ConfigurationError) as config_error:
                config.update_single_config_from_path_and_value(bad_path, "value")

            self.assertEqual(config_error.exception.message, error_message)

    def test_dict_update_single_config_from_path_and_value(self):
        """Update a config parameter that has a value of dict"""

        # the path leads to a dict config param, set the config parameter to the new value
        config = AppConfig()
        config.update_single_config_from_path_and_value(
            ["server", "adaptor", "cxg_adaptor", "tiledb_ctx"], dict(key="mykey1", max_age=100)
        )
        self.assertEqual(config.server_config.adaptor__cxg_adaptor__tiledb_ctx, dict(key="mykey1", max_age=100))

        # the path leads to an entry within a dict config param, the value is simple
        config = AppConfig()
        config.server_config.adaptor__cxg_adaptor__tiledb_ctx = dict(key="mykey1", max_age=100)
        config.update_single_config_from_path_and_value(
            ["server", "adaptor", "cxg_adaptor", "tiledb_ctx", "httponly"],
            True,
        )
        self.assertEqual(
            config.server_config.adaptor__cxg_adaptor__tiledb_ctx, dict(key="mykey1", max_age=100, httponly=True)
        )
