import json
import os
import tempfile
import unittest
from unittest.mock import patch

from server.common.config.app_config import AppConfig
from server.common.config.base_config import BaseConfig
from server.common.errors import ConfigurationError
from server.tests import PROJECT_ROOT, FIXTURES_ROOT
from server.tests.unit.common.config import ConfigTests


class TestDatasetConfig(ConfigTests):
    def setUp(self):
        self.config_file_name = f"{unittest.TestCase.id(self).split('.')[-1]}.yml"
        self.config = AppConfig()
        self.config.update_server_config(app__flask_secret_key="secret")
        self.config.update_server_config(multi_dataset__dataroot=FIXTURES_ROOT)
        self.dataset_config = self.config.default_dataset_config
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

    def test_init_datatset_config_sets_vars_from_default_config(self):
        config = AppConfig()
        self.assertEqual(config.default_dataset_config.presentation__max_categories, 1000)
        self.assertEqual(config.default_dataset_config.diffexp__lfc_cutoff, 0.01)

    @patch("server.common.config.dataset_config.BaseConfig.validate_correct_type_of_configuration_attribute")
    def test_complete_config_checks_all_attr(self, mock_check_attrs):
        mock_check_attrs.side_effect = BaseConfig.validate_correct_type_of_configuration_attribute()
        self.dataset_config.complete_config(self.context)
        self.assertEqual(mock_check_attrs.call_count, 12)

    def test_app_sets_script_vars(self):
        config = self.get_config(scripts=["path/to/script"])
        config.default_dataset_config.handle_app()

        self.assertEqual(config.default_dataset_config.app__scripts, [{"src": "path/to/script"}])

        config = self.get_config(scripts=[{"src": "path/to/script", "more": "different/script/path"}])
        config.default_dataset_config.handle_app()
        self.assertEqual(
            config.default_dataset_config.app__scripts, [{"src": "path/to/script", "more": "different/script/path"}]
        )

        config = self.get_config(scripts=["path/to/script", "different/script/path"])
        config.default_dataset_config.handle_app()
        # TODO @madison -- is this the desired functionality?
        self.assertEqual(
            config.default_dataset_config.app__scripts, [{"src": "path/to/script"}, {"src": "different/script/path"}]
        )

        config = self.get_config(scripts=[{"more": "different/script/path"}])
        with self.assertRaises(ConfigurationError):
            config.default_dataset_config.handle_app()

    def test_handle_diffexp__raises_warning_for_large_datasets(self):
        config = self.get_config(lfc_cutoff=0.02, enable_difexp="true", top_n=15)
        config.server_config.complete_config(self.context)
        config.default_dataset_config.handle_diffexp(self.context)
        self.assertEqual(len(self.context["messages"]), 0)

    def test_multi_dataset(self):
        config = AppConfig()
        try:
            os.symlink(FIXTURES_ROOT, f"{FIXTURES_ROOT}/set2")
            os.symlink(FIXTURES_ROOT, f"{FIXTURES_ROOT}/set3")
        except FileExistsError:
            pass
        # test for illegal url_dataroots
        for illegal in ("../b", "!$*", "\\n", "", "(bad)"):
            config.update_server_config(
                app__flask_secret_key="secret",
                multi_dataset__dataroot={"tag": {"base_url": illegal, "dataroot": f"{PROJECT_ROOT}/example-dataset"}},
            )
            with self.assertRaises(ConfigurationError):
                config.complete_config()

        # test for legal url_dataroots
        for legal in ("d", "this.is-okay_", "a/b"):
            config.update_server_config(
                app__flask_secret_key="secret",
                multi_dataset__dataroot={"tag": {"base_url": legal, "dataroot": f"{PROJECT_ROOT}/example-dataset"}},
            )
            config.complete_config()

        # test that multi dataroots work end to end
        config.update_server_config(
            app__flask_secret_key="secret",
            multi_dataset__dataroot=dict(
                s1=dict(dataroot=f"{PROJECT_ROOT}/example-dataset", base_url="set1/1/2"),
                s2=dict(dataroot=f"{FIXTURES_ROOT}/set2", base_url="set2"),
                s3=dict(dataroot=f"{FIXTURES_ROOT}/set3", base_url="set3"),
            ),
        )

        # Change this default to test if the dataroot overrides below work.
        config.update_default_dataset_config(app__about_legal_tos="tos_default.html")

        config.complete_config()

        server = self.create_app(config)

        server.testing = True
        session = server.test_client()

        with self.subTest("Test config for dataroot /set1/1/2/ returns the s1 config"):
            response1 = session.get("/set1/1/2/pbmc3k.cxg/api/v0.2/config")
            data_config_set_1 = json.loads(response1.data)

            self.assertEqual(data_config_set_1["config"]["displayNames"]["dataset"], "pbmc3k")

        with self.subTest("Test config for dataroot /set2 returns the s2 config"):
            response2 = session.get("/set2/pbmc3k.cxg/api/v0.2/config")
            data_config_set_2 = json.loads(response2.data)
            self.assertEqual(data_config_set_2["config"]["displayNames"]["dataset"], "pbmc3k")

        with self.subTest("Test config for dataroot /set3/ returns the default dataset config"):
            response3 = session.get("/set3/pbmc3k.cxg/api/v0.2/config")
            data_config_set_3 = json.loads(response3.data)
            self.assertEqual(data_config_set_3["config"]["displayNames"]["dataset"], "pbmc3k")
            self.assertEqual(data_config_set_3["config"]["parameters"]["about_legal_tos"], "tos_default.html")

        response = session.get("/health")
        self.assertEqual(json.loads(response.data)["status"], "pass")
        # cleanup
        os.unlink(f"{FIXTURES_ROOT}/set2")
        os.unlink(f"{FIXTURES_ROOT}/set3")

    def test_configfile_with_specialization(self):
        # test that per_dataset_config config load the default config, then the specialized config

        with tempfile.TemporaryDirectory() as tempdir:
            configfile = os.path.join(tempdir, "config.yaml")
            with open(configfile, "w") as fconfig:
                config = """
                server:
                    multi_dataset:
                        dataroot:
                            test:
                                base_url: test
                                dataroot: fake_dataroot

                """
                fconfig.write(config)

            app_config = AppConfig()
            app_config.update_from_config_file(configfile)

            # test config from specialization
            self.assertEqual(app_config.server_config.multi_dataset__dataroot['test']['base_url'], 'test')

