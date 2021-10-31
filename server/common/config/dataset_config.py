from server.common.config.base_config import BaseConfig
from server.common.errors import ConfigurationError


class DatasetConfig(BaseConfig):
    """Manages the config attribute associated with a dataset."""

    def __init__(self, tag, app_config, default_config):
        super().__init__(app_config, default_config)
        self.tag = tag
        try:
            self.app__scripts = default_config["app"]["scripts"]
            self.app__inline_scripts = default_config["app"]["inline_scripts"]
            self.app__about_legal_tos = default_config["app"]["about_legal_tos"]
            self.app__about_legal_privacy = default_config["app"]["about_legal_privacy"]

            self.presentation__max_categories = default_config["presentation"]["max_categories"]
            self.presentation__custom_colors = default_config["presentation"]["custom_colors"]

            self.embeddings__names = default_config["embeddings"]["names"]

            self.diffexp__enable = default_config["diffexp"]["enable"]
            self.diffexp__lfc_cutoff = default_config["diffexp"]["lfc_cutoff"]
            self.diffexp__top_n = default_config["diffexp"]["top_n"]

            self.X_approximate_distribution = default_config["X_approximate_distribution"]

        except KeyError as e:
            raise ConfigurationError(f"Unexpected config: {str(e)}")


    def complete_config(self, context):
        self.handle_app()
        self.handle_presentation()
        self.handle_embeddings()
        self.handle_diffexp(context)
        self.handle_X_approximate_distribution()

    def handle_app(self):
        self.validate_correct_type_of_configuration_attribute("app__scripts", list)
        self.validate_correct_type_of_configuration_attribute("app__inline_scripts", list)
        self.validate_correct_type_of_configuration_attribute("app__about_legal_tos", (type(None), str))
        self.validate_correct_type_of_configuration_attribute("app__about_legal_privacy", (type(None), str))

        # scripts can be string (filename) or dict (attributes). Convert string to dict.
        scripts = []
        for script in self.app__scripts:
            try:
                if isinstance(script, str):
                    scripts.append({"src": script})
                elif isinstance(script, dict) and isinstance(script["src"], str):
                    scripts.append(script)
                else:
                    raise Exception
            except Exception as e:
                raise ConfigurationError(f"Scripts must be string or a dict containing an src key: {e}")

        self.app__scripts = scripts

    def handle_presentation(self):
        self.validate_correct_type_of_configuration_attribute("presentation__max_categories", int)
        self.validate_correct_type_of_configuration_attribute("presentation__custom_colors", bool)

    def handle_embeddings(self):
        self.validate_correct_type_of_configuration_attribute("embeddings__names", list)

    def handle_diffexp(self, context):
        self.validate_correct_type_of_configuration_attribute("diffexp__enable", bool)
        self.validate_correct_type_of_configuration_attribute("diffexp__lfc_cutoff", float)
        self.validate_correct_type_of_configuration_attribute("diffexp__top_n", int)

        server_config = self.app_config.server_config
        if server_config.single_dataset__datapath:
            if self.diffexp__enable:
                context["messagefn"](
                    "CAUTION: due to the size of your dataset, "
                    "running differential expression may take longer or fail."
                )

    def handle_X_approximate_distribution(self):
        self.validate_correct_type_of_configuration_attribute("X_approximate_distribution", str)
        if self.X_approximate_distribution not in ["normal", "count"]:
            raise ConfigurationError("X_approximate_distribution has unknown value -- must be 'normal' or 'count'.")
