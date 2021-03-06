from server import display_version as cellxgene_display_version


def get_client_config(app_config, data_adaptor, current_app):
    """
    Return the configuration as required by the /config REST route
    """
    server_config = app_config.server_config
    dataset_config = data_adaptor.dataset_config

    # FIXME The current set of config is not consistently presented:
    # we have camalCase, hyphen-text, and underscore_text

    # make sure the configuration has been checked.
    app_config.check_config()

    # display_names
    title = app_config.get_title(data_adaptor)
    about = app_config.get_about(data_adaptor)

    display_names = dict(engine=data_adaptor.get_name(), dataset=title)

    # library_versions
    library_versions = {}
    library_versions.update(data_adaptor.get_library_versions())
    library_versions["cellxgene"] = cellxgene_display_version

    # links
    links = {
        "collections-home-page": server_config.get_web_base_url(),
        "about-dataset": about,
    }

    # parameters
    parameters = {
        "layout": dataset_config.embeddings__names,
        "max-category-items": dataset_config.presentation__max_categories,
        "obs_names": server_config.single_dataset__obs_names,
        "var_names": server_config.single_dataset__var_names,
        "diffexp_lfc_cutoff": dataset_config.diffexp__lfc_cutoff,
        "disable-diffexp": not dataset_config.diffexp__enable,
        "annotations_genesets": True,  # feature flag
        "annotations_genesets_readonly": True,
        "annotations_genesets_summary_methods": ["mean"],
        "custom_colors": dataset_config.presentation__custom_colors,
        "diffexp-may-be-slow": False,
        "about_legal_tos": dataset_config.app__about_legal_tos,
        "about_legal_privacy": dataset_config.app__about_legal_privacy,
    }

    # corpora dataset_props
    # TODO/Note: putting info from the dataset into the /config is not ideal.
    # However, it is definitely not part of /schema, and we do not have a top-level
    # route for data properties.  Consider creating one at some point.
    corpora_props = data_adaptor.get_corpora_props()
    if corpora_props and "default_embedding" in corpora_props:
        default_embedding = corpora_props["default_embedding"]
        if isinstance(default_embedding, str) and default_embedding.startswith("X_"):
            default_embedding = default_embedding[2:]  # drop X_ prefix
        if default_embedding in data_adaptor.get_embedding_names():
            parameters["default_embedding"] = default_embedding

    data_adaptor.update_parameters(parameters)

    # gather it all together
    client_config = {}
    config = client_config["config"] = {}
    config["displayNames"] = display_names
    config["library_versions"] = library_versions
    config["links"] = links
    config["parameters"] = parameters
    config["corpora_props"] = corpora_props
    config["limits"] = {
        "column_request_max": server_config.limits__column_request_max,
        "diffexp_cellcount_max": server_config.limits__diffexp_cellcount_max,
    }
    return client_config
