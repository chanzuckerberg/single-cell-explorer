import yaml
from flatten_dict import unflatten as _unflatten, flatten as _flatten

from server.common.errors import ConfigurationError
from server.common.utils.data_locator import discover_s3_region_name
from server.common.config.config_model import Config
from server.default_config import get_default_config


def flatten(dictionary: dict) -> dict:
    return _flatten(dictionary, reducer=lambda parent, key: f"{parent}__{key}" if parent else key)


def unflatten(dictionary: dict) -> dict:
    return _unflatten(dictionary, splitter=lambda x: x.split("__"))


class AppConfig(object):
    """
    AppConfig stores all the configuration for cellxgene.
    AppConfig contains one or more DatasetConfig(s) and one ServerConfig.
    The server_config contains attributes that refer to the server process as a whole.
    The default_dataset_config refers to attributes that are associated with the features and
    presentations of a dataset.
    The dataset config attributes can be overridden depending on the url by which the
    dataset was accessed.  These are stored in dataroot_config.
    AppConfig has methods to initialize, modify, and access the configuration.
    """

    def __init__(self, default_config: str = None):

        # the default configuration (see default_config.py)
        self.default_config = default_config if default_config else get_default_config()
        self.config = self.validate_config(self.default_config)
        #   dataroot config
        self.dataroot_config = {key: value.dict() for key, value in self.config.server.multi_dataset.dataroots.items()}
        for value in self.dataroot_config.values():
            value.update(**self.default_config)

    @property
    def default_dataset_config(self):
        # the dataset config, unless overridden by an entry in dataroot_config
        return self.config.dataset.dict(by_alias=True)

    def __getattr__(self, item):
        path = item.split("__")
        node = self.config
        for p in path:
            _p = p.replace(".", "_")  # Handling a special case where a '.' is in the attribute name.
            node = getattr(node, _p)
        return node

    def validate_config(self, config: dict):
        try:
            valid_config = Config(**config)
        except ValueError as error:
            raise ConfigurationError("Invalid configuration.") from error
        else:
            return valid_config

    def get_dataset_config(self, dataroot_key: str) -> dict:
        return self.dataroot_config.get(dataroot_key, self.default_dataset_config)

    def update_server_config(self, **kw):
        _kw = {f"server__{key}": value for key, value in kw.items()}
        self.update_config(**_kw)

    def update_default_dataset_config(self, **kw):
        _kw = {f"dataset__{key}": value for key, value in kw.items()}
        self.update_config(**_kw)

    def update_config(self, **kw):
        updates = flatten(kw)
        config = self.config.dict(by_alias=True)
        config = flatten(config)
        config.update(**updates)
        new_config = unflatten(config)
        self.config = self.validate_config(new_config)
        self.dataroot_config = {key: value.dict() for key, value in self.config.server.multi_dataset.dataroots.items()}
        for value in self.dataroot_config.values():
            value = value.update(**new_config["dataset"])

    def _open_config_file(self, config_file):
        try:
            with open(config_file) as fp:
                config = yaml.load(fp, Loader=yaml.Loader)
        except yaml.YAMLError as e:
            raise ConfigurationError(f"The specified config file contained an error: {e}")
        except OSError as e:
            raise ConfigurationError(f"Issue retrieving the specified config file: {e}")
        return config

    def update_from_config_file(self, config_file):
        config = self._open_config_file(config_file)
        self.update_config(**config)

    def update_default_from_config_file(self, config_file):
        config = self._open_config_file(config_file)
        self.update_config(**config)
        self.default_config = config

    def changes_from_default(self):
        """Return all the attribute that are different from the default"""
        default_mapping = flatten(self.default_config)
        diff = []
        for attrname, defval in default_mapping.items():
            curval = getattr(self, attrname)
            if curval != defval:
                diff.append((attrname, curval, defval))
        return diff

    def complete_config(self, messagefn=None):
        """The configure options are checked, and any additional setup based on the config
        parameters is done"""
        self.handle_adaptor()
        self.handle_data_source()

    def get_title(self, data_adaptor):
        return data_adaptor.get_title()

    def get_about(self, data_adaptor):
        return data_adaptor.get_about()

    def handle_data_source(self):
        if self.config.server.multi_dataset.dataroot is None:
            raise ConfigurationError("You must specify a dataroot for multidatasets")

    def handle_adaptor(self):
        from server.dataset.cxg_dataset import CxgDataset

        CxgDataset.set_tiledb_context(
            self.config.server.adaptor.cxg_adaptor.tiledb_ctx.dict(by_alias=True, exclude_none=True)
        )

    def exceeds_limit(self, limit_name, value):
        limit_value = getattr(self, "server__limits__" + limit_name, None)
        if limit_value is None:  # disabled
            return False
        return value > limit_value

    def get_api_base_url(self):
        return
        if self.config.server.app.api_base_url == "local":
            return f"http://{self.app__host}:{self.app__port}"
        if self.config.server.app.api_base_url and self.config.server.app.api_base_url.endswith("/"):
            return self.config.server.app.api_base_url[:-1]
        return self.config.server.app.api_base_url
