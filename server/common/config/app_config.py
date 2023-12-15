import copy
import logging

import yaml
from envyaml import EnvYAML
from flatten_dict import flatten as _flatten
from flatten_dict import unflatten as _unflatten

from server.common.config.config_model import AppConfigModel
from server.common.errors import ConfigurationError  # type: ignore
from server.default_config import get_default_config


def flatten(dictionary: dict) -> dict:  # type: ignore
    return _flatten(dictionary, reducer=lambda parent, key: f"{parent}__{key}" if parent else key)  # type: ignore


def unflatten(dictionary: dict) -> dict:  # type: ignore
    return _unflatten(dictionary, splitter=lambda x: x.split("__"))  # type: ignore


class AppConfig(object):
    """
    AppConfig stores all the configuration for cellxgene and has methods to initialize, modify,
    and access the configuration.
    The `self.server` contains attributes that refer to the server process as a whole.
    The `self.default_dataset` refers to attributes that are associated with the features and
    presentations of a dataset.
    The dataset config attributes can be overridden depending on the url by which the
    dataset was accessed.  These are stored in `self.dataroot_config`.
    `self.default_config` is the dataset config, unless overridden by an entry in `self.dataroot_config`.
    """

    def __init__(self, config_file_path: str = None):  # type: ignore
        # the default configuration (see default_config.py)
        self.default_config: dict = get_default_config()  # type: ignore
        # TODO @madison -- if we always read from the default config (hard coded path) can we set those values as
        #  defaults within the config class?
        self.config: dict = AppConfigModel(**copy.deepcopy(self.default_config)).dict(by_alias=True)  # type: ignore
        self.dataroot_config = {}  # type: ignore
        if config_file_path:
            self.update_from_config_file(config_file_path)
        # Set to true when config_completed is called. Set to false when the config is modified.
        self.is_completed = False

    def __getattr__(self, item):  # type: ignore
        path = item.split("__")
        node = self.config
        for p in path:
            node = node[p]
        return node

    def check_config(self, config: dict) -> dict:  # type: ignore
        """Verify all the attributes in the config have been checked"""
        try:
            valid_config = AppConfigModel(**config)
        except ValueError as error:
            raise ConfigurationError("Invalid configuration.") from error
        else:
            return valid_config.dict(by_alias=True)

    def update_server_config(self, **kw):  # type: ignore
        _kw = {f"server__{key}": value for key, value in kw.items()}
        self.update_config(**_kw)  # type: ignore

    def update_default_dataset_config(self, **kw):  # type: ignore
        _kw = {f"default_dataset__{key}": value for key, value in kw.items()}
        self.update_config(**_kw)  # type: ignore

    def update_config(self, **kw):  # type: ignore
        """
        Update multiple configuration parameters.
        The key in kw should be a string using {parent}__{child}... when modifying nested configuration parameters.
        """
        updates = unflatten(kw)
        config = copy.deepcopy(self.config)

        # handle dataroots as special case since the naming of keys are user defined.
        dataroots_updates = dict(
            dataroot=updates.get("server", {}).get("multi_dataset", {}).pop("dataroot", ""),
            dataroots=updates.get("server", {}).get("multi_dataset", {}).pop("dataroots", {}),
        )
        if any(list(dataroots_updates.values())):
            # dataroots are completely replaced if provided.
            config["server"]["multi_dataset"].update(**dataroots_updates)

        updates = flatten(updates)
        config = flatten(config)
        config.update(**updates)
        new_config = unflatten(config)
        self.config = self.check_config(new_config)
        self.dataroot_config = copy.deepcopy(
            {key: value for key, value in self.server__multi_dataset__dataroots.items()}
        )
        for value in self.dataroot_config.values():
            value = value.update(**new_config["default_dataset"])
        self.is_completed = False
        logging.info("Configuration updated")

    def update_from_config_file(self, config_file: str):  # type: ignore
        try:
            config = EnvYAML(config_file)
        except yaml.YAMLError as e:
            raise ConfigurationError(f"The specified config file contained an error: {e}") from None
        except OSError as e:
            raise ConfigurationError(f"Issue retrieving the specified config file: {e}") from None
        self.update_config(**config)  # type: ignore

    def changes_from_default(self):  # type: ignore
        """Return all the attribute that are different from the default"""
        default_mapping = flatten(self.default_config)
        diff = []
        for attrname, defval in default_mapping.items():
            curval = getattr(self, attrname)
            if curval != defval:
                diff.append((attrname, curval, defval))
        return diff

    def complete_config(self):  # type: ignore
        """The configure options are checked, and any additional setup based on the config
        parameters is done"""
        if not self.is_completed:
            self.config = self.check_config(self.config)
        self.handle_adaptor()  # type: ignore
        self.handle_data_source()  # type: ignore
        self.is_completed = True
        logging.info("Configuration complete.")

    def get_dataset_config(self, dataroot_key: str) -> dict:  # type: ignore
        return self.dataroot_config.get(dataroot_key, self.default_dataset)  # type: ignore

    def handle_data_source(self):  # type: ignore
        if not self.server__multi_dataset__dataroots:
            raise ConfigurationError("You must specify a dataroot for multidatasets")

    def handle_adaptor(self):  # type: ignore
        from server.dataset.cxg_dataset import CxgDataset

        CxgDataset.set_tiledb_context(self.server__adaptor__cxg_adaptor__tiledb_ctx)  # type: ignore

    def exceeds_limit(self, limit_name, value):  # type: ignore
        limit_value = getattr(self, "server__limits__" + limit_name, None)
        if limit_value is None:  # disabled
            return False
        return value > limit_value
