import yaml
from flatten_dict import unflatten as _unflatten, flatten as _flatten

from server.common.errors import ConfigurationError
from server.common.utils.data_locator import discover_s3_region_name
from server.common.config.config_model import Config
from server.default_config import get_default_config


def flatten(dictionary: dict) -> dict:
    return _flatten(dictionary, reducer=lambda parent, key: f"{parent}__{key}" if parent else key)


def unflatten(dictionary: dict)-> dict:
    return _unflatten(dictionary, splitter= lambda x: x.split('__'))

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
            _p = p.replace('.', '_')  # Handling a special case where a '.' is in the attribute name.
            node = getattr(node, _p)
        return node

    def validate_config(self, config: dict):
        try:
            valid_config = Config(**config)
        except ValueError as error:
            raise ConfigurationError("Invalid configuration.") from error
        else:
            return valid_config

    # def __setattr__(self, key, value):
    #     path = key.split("__")
    #     _key = path[-1]
    #     path = path[:-1]
    #     node = key.replace("__", ".")
    #     setattr(node, _key, value)

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
        config = self.config_to_dict()
        config = flatten(config)
        config.update(**updates)
        new_config = unflatten(config)
        self.config = self.validate_config(new_config)
        self.dataroot_config = {key: value.dict() for key, value in self.config.server.multi_dataset.dataroots.items()}
        for value in self.dataroot_config.values():
            value = value.update(**new_config["dataset"])


    # def _create_updates(self, kw: dict):
    #     updates = dict()
    #     def nest(levels, _value):
    #         if len(levels) > 1:
    #             return {levels[0]:nest(levels[1:], _value)}
    #         else:
    #             return {levels[0]: _value}
    #
    #     for key, value in kw.items():
    #         split = key.split('__')
    #         if len(split) == 1:
    #             updates[split[0]] = value
    #         else:
    #             updates[split[0]] = nest(split[1:], value)
    #     return updates

    # def update_single_config_from_path_and_value(self, path, value):
    #     """Update a single config parameter with the value.
    #     Path is a list of string, that gives a path to the config parameter to be updated.
    #     For example, path may be ["server","app","port"].
    #     """
    #     self.
    #     self.is_completed = False
    #     if not isinstance(path, list):
    #         raise ConfigurationError(f"path must be a list of strings, got '{str(path)}'")
    #     for part in path:
    #         if not isinstance(part, str):
    #             raise ConfigurationError(f"path must be a list of strings, got '{str(path)}'")
    #
    #     if path[0] == "server":
    #         attr = "__".join(path[1:])
    #         try:
    #             self.update_server_config(**{attr: value})
    #         except ConfigurationError:
    #             raise ConfigurationError(f"unknown config parameter at path: '{str(path)}'")
    #     elif path[0] == "dataset":
    #         attr = "__".join(path[1:])
    #         try:
    #             self.update_default_dataset_config(**{attr: value})
    #         except ConfigurationError:
    #             raise ConfigurationError(f"unknown config parameter at path: '{str(path)}'")

    def _open_config_file(self, config_file):
        try:
            with open(config_file) as fp:
                config = yaml.load(fp,  Loader=yaml.Loader)
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

    def config_to_dict(self):
        """return the configuration as an unflattened dict"""
        return self.config.dict(by_alias=True)

    # def write_config(self, config_file):
    #     """output the config to a yaml file"""
    #     config = self.config_to_dict()
    #     yaml.dump(config, open(config_file, "w"))

    def changes_from_default(self):
        """Return all the attribute that are different from the default"""
        default_mapping = flatten(self.default_config)
        diff = []
        for attrname, defval in default_mapping.items():
            curval = getattr(self, attrname)
            if curval != defval:
                diff.append((attrname, curval, defval))
        return diff


    def add_dataroot_config(self, dataroot_tag, **kw):
        """Create a new dataset config object based on the default dataset config, and kw parameters"""
        if dataroot_tag in self.dataroot_config:
            raise ConfigurationError(f"dataroot config already exists: {dataroot_tag}")
        if dataroot_tag not in self.server.app.multi_dataset.dataroots:
            raise ConfigurationError(f"The dataroot_tag ({dataroot_tag}) not found in server__multi_dataset__dataroot")

        self.is_completed = False
        config =  self.default_dataset_config
        config["tag"] = dataroot_tag
        config = flatten(config)
        self.dataroot_config[dataroot_tag] = config

    def complete_config(self, messagefn=None):
        """The configure options are checked, and any additional setup based on the config
        parameters is done"""
        pass
        # if messagefn is None:
        #
        #     def noop(message):
        #         pass
        #
        #     messagefn = noop
        #
        # # TODO: to give better error messages we can add a mapping between where each config
        # # attribute originated (e.g. command line argument or config file), then in the error
        # # messages we can give correct context for attributes with bad value.
        # context = dict(messagefn=messagefn)
        #
        # self.server_config.complete_config(context)
        # self.default_dataset_config.complete_config(context)
        # for dataroot_config in self.dataroot_config.values():
        #     dataroot_config.complete_config(context)
        #
        # self.is_completed = True
        # self.check_config()

    def is_multi_dataset(self):
        return self.config.server.multi_dataset.dataroot is not None

    def get_title(self, data_adaptor):
        return data_adaptor.get_title()

    def get_about(self, data_adaptor):
        return data_adaptor.get_about()


    def handle_data_locator(self):
        if self.config.server.data_locator.s3_region_name is True:
            path = self.config.server.multi_dataset.dataroot

            if isinstance(path, dict):
                # if multi_dataset.dataroot is a dict, then use the first key
                # that is in s3.   NOTE:  it is not supported to have dataroots
                # in different regions.
                paths = [val.dataroot for val in path.values()]
                for path in paths:
                    if path.startswith("s3://"):
                        break
            if isinstance(path, str) and path.startswith("s3://"):
                region_name = discover_s3_region_name(path)
                if region_name is None:
                    raise ConfigurationError(f"Unable to discover s3 region name from {path}")
            else:
                region_name = None
            self.config.data_locator.s3_region_name = region_name

    def handle_gene_info(self):
        pass

    def handle_data_source(self):

        if self.config.server.multi_dataset.dataroot is None:
            raise ConfigurationError("You must specify a dataroot for multidatasets")

    def handle_multi_dataset(self):
        if self.config.server.multi_dataset.dataroot is None:
            return

        if isinstance(self.config.server.multi_dataset.dataroot, str):
            default_dict = dict(base_url="d", dataroot=self.config.server.multi_dataset.dataroot)
            self.config.server.multi_dataset.dataroot = dict(d=default_dict)

        for tag, dataroot_dict in self.config.server.multi_dataset.dataroot.items():
            if "base_url" not in dataroot_dict:
                raise ConfigurationError(f"error in multi_dataset.dataroot: missing base_url for tag {tag}")
            if "dataroot" not in dataroot_dict:
                raise ConfigurationError(f"error in multi_dataset.dataroot: missing dataroot, for tag {tag}")

            base_url = dataroot_dict["base_url"]

            # sanity check for well formed base urls
            bad = False
            if not isinstance(base_url, str):
                bad = True
            elif os.path.normpath(base_url) != base_url:
                bad = True
            else:
                base_url_parts = base_url.split("/")
                if [quote_plus(part) for part in base_url_parts] != base_url_parts:
                    bad = True
                if ".." in base_url_parts:
                    bad = True
            if bad:
                raise ConfigurationError(f"error in multi_dataset.dataroot base_url {base_url} for tag {tag}")

        # verify all the base_urls are unique
        base_urls = [d["base_url"] for d in self.config.multi_dataset.dataroot.values()]
        if len(base_urls) > len(set(base_urls)):
            raise ConfigurationError("error in multi_dataset.dataroot:  base_urls must be unique")


    def handle_adaptor(self):
        from server.dataset.cxg_dataset import CxgDataset

        CxgDataset.set_tiledb_context(self.config.server.adaptor.cxg_adaptor.tiledb_ctx.dict(by_alias=True, exclude_none=True))

    def handle_limits(self):
        pass

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

    def get_web_base_url(self):
        if self.config.server.app.web_base_url == "local":
            return f"http://{self.config.server.app.host}:{self.config.server.app.port}"
        if self.config.server.app.web_base_url  is None:
            return self.get_api_base_url()
        if self.config.server.app.web_base_url .endswith("/"):
            return self.config.server.app.web_base_url [:-1]
        return self.config.server.app.web_base_url

    def get_data_locator_api_base_url(self):
        return self.config.server.data_locator.api_base

    def get_gene_info_api_base_url(self):
        return self.config.server.gene_info.api_base
