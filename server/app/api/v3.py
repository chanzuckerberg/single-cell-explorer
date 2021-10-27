import logging
from functools import wraps
from http import HTTPStatus
from urllib.parse import urlparse

from flask import (
    redirect,
    current_app,
    abort,
    Blueprint,
    request,
    send_from_directory,
)
from flask_restful import Api, Resource

import server.common.rest as common_rest
from server.app.api import ONE_WEEK, cache_control
from server.common.errors import (
    DatasetAccessError,
    DatasetNotFoundError,
    TombstoneError,
    DatasetMetadataError,
)
from server.common.health import health_check
from server.data_common.dataset_metadata import get_dataset_metadata_for_explorer_location
from server.data_common.matrix_loader import MatrixDataLoader

def get_dataset_metadata(url_dataroot: str = None, dataset: str = None):
    app_config = current_app.app_config
    dataset_metadata_manager = current_app.dataset_metadata_cache_manager
    return dataset_metadata_manager.get(
        cache_key=f"{url_dataroot}/{dataset}",
        create_data_function=get_dataset_metadata_for_explorer_location,
        create_data_args={"app_config": app_config},
    )


def get_data_adaptor(url_dataroot: str = None, dataset: str = None):
    app_config = current_app.app_config
    matrix_cache_manager = current_app.matrix_data_cache_manager
    with get_dataset_metadata(url_dataroot=url_dataroot, dataset=dataset) as dataset_metadata:
        return matrix_cache_manager.get(
            cache_key=dataset_metadata["s3_uri"],
            create_data_function=MatrixDataLoader(
                location=dataset_metadata["s3_uri"], url_dataroot=url_dataroot, app_config=app_config
            ).validate_and_open,
            create_data_args={},
        )


def evict_dataset_from_metadata_cache(url_dataroot: str = None, dataset: str = None):
    try:
        current_app.dataset_metadata_cache_manager.evict_by_key(f"{url_dataroot}/{dataset}")
    except Exception as e:
        logging.error(e)


def rest_get_data_adaptor(func):
    @wraps(func)
    def wrapped_function(self, dataset=None):
        try:
            with get_data_adaptor(self.url_dataroot, dataset) as data_adaptor:
                data_adaptor.set_uri_path(f"{self.url_dataroot}/{dataset}")
                return func(self, data_adaptor)
        except (DatasetAccessError, DatasetNotFoundError, DatasetMetadataError) as e:
            # if the dataset can not be found or accessed assume there is an issue with the stored metadata and remove
            # it from the cache
            evict_dataset_from_metadata_cache(self.url_dataroot, dataset)
            return common_rest.abort_and_log(
                e.status_code, f"Invalid dataset {dataset}: {e.message}", loglevel=logging.INFO, include_exc_info=True
            )
        except TombstoneError as e:
            parent_collection_url = (
                f"{current_app.app_config.server_config.get_web_base_url()}/collections/{e.collection_id}"  # noqa E501
            )
            return redirect(f"{parent_collection_url}?tombstoned_dataset_id={e.dataset_id}")

    return wrapped_function


# def dataroot_test_index():
#     # the following index page is meant for testing/debugging purposes
#     data = '<!doctype html><html lang="en">'
#     data += "<head><title>Hosted Cellxgene</title></head>"
#     data += "<body><H1>Welcome to cellxgene</H1>"
#
#     config = current_app.app_config
#     server_config = config.server_config
#
#     datasets = []
#     for dataroot_dict in server_config.multi_dataset__dataroot.values():
#         dataroot = dataroot_dict["dataroot"]
#         url_dataroot = dataroot_dict["base_url"]
#         locator = DataLocator(dataroot, region_name=server_config.data_locator__s3__region_name)
#         for fname in locator.ls():
#             location = path_join(dataroot, fname)
#             try:
#                 MatrixDataLoader(location, url_dataroot=url_dataroot, app_config=config)
#                 datasets.append((url_dataroot, fname))
#             except DatasetAccessError:
#                 # skip over invalid datasets
#                 pass
#
#     data += "<br/>Select one of these datasets...<br/>"
#     data += "<ul>"
#     datasets.sort()
#     for url_dataroot, dataset in datasets:
#         data += f"<li><a href={url_dataroot}/{dataset}/>{dataset}</a></li>"
#     data += "</ul>"
#     data += "</body></html>"
#
#     return make_response(data)


def dataroot_index():
    # Handle the base url for the cellxgene server when running in multi dataset mode
    config = current_app.app_config
    if not config.server_config.multi_dataset__index:
        abort(HTTPStatus.NOT_FOUND)
    # elif config.server_config.multi_dataset__index is True:
    #     return dataroot_test_index()
    else:
        return redirect(config.server_config.multi_dataset__index)


class HealthAPI(Resource):
    @cache_control(no_store=True)
    def get(self):
        config = current_app.app_config
        return health_check(config)


class DatasetResource(Resource):
    """Base class for all Resources that act on datasets."""

    def __init__(self, url_dataroot):
        super().__init__()
        self.url_dataroot = url_dataroot


class SchemaAPI(DatasetResource):
    # TODO @mdunitz separate dataset schema and user schema
    @cache_control(public=True, max_age=ONE_WEEK)
    @rest_get_data_adaptor
    def get(self, data_adaptor):
        return common_rest.schema_get(data_adaptor)


class DatasetMetadataAPI(DatasetResource):
    @cache_control(public=True, no_store=True, max_age=0)
    @rest_get_data_adaptor
    def get(self, data_adaptor):
        return common_rest.dataset_metadata_get(current_app.app_config, data_adaptor)


class ConfigAPI(DatasetResource):
    @cache_control(public=True, max_age=ONE_WEEK)
    @rest_get_data_adaptor
    def get(self, data_adaptor):
        return common_rest.config_get(current_app.app_config, data_adaptor)


class AnnotationsObsAPI(DatasetResource):
    @cache_control(public=True, max_age=ONE_WEEK)
    @rest_get_data_adaptor
    def get(self, data_adaptor):
        return common_rest.annotations_obs_get(request, data_adaptor)

    @cache_control(no_store=True)
    @rest_get_data_adaptor
    def put(self, data_adaptor):
        return common_rest.annotations_obs_put(request, data_adaptor)


class AnnotationsVarAPI(DatasetResource):
    @cache_control(public=True, max_age=ONE_WEEK)
    @rest_get_data_adaptor
    def get(self, data_adaptor):
        return common_rest.annotations_var_get(request, data_adaptor)


class DataVarAPI(DatasetResource):
    @cache_control(no_store=True)
    @rest_get_data_adaptor
    def put(self, data_adaptor):
        return common_rest.data_var_put(request, data_adaptor)

    @cache_control(public=True, max_age=ONE_WEEK)
    @rest_get_data_adaptor
    def get(self, data_adaptor):
        return common_rest.data_var_get(request, data_adaptor)


class ColorsAPI(DatasetResource):
    @cache_control(public=True, max_age=ONE_WEEK)
    @rest_get_data_adaptor
    def get(self, data_adaptor):
        return common_rest.colors_get(data_adaptor)


class DiffExpObsAPI(DatasetResource):
    @cache_control(no_store=True)
    @rest_get_data_adaptor
    def post(self, data_adaptor):
        return common_rest.diffexp_obs_post(request, data_adaptor)


class LayoutObsAPI(DatasetResource):
    @cache_control(public=True, max_age=ONE_WEEK)
    @rest_get_data_adaptor
    def get(self, data_adaptor):
        return common_rest.layout_obs_get(request, data_adaptor)


class GenesetsAPI(DatasetResource):
    @cache_control(public=True, max_age=ONE_WEEK)
    @rest_get_data_adaptor
    def get(self, data_adaptor):
        return common_rest.genesets_get(request, data_adaptor)


class SummarizeVarAPI(DatasetResource):
    @rest_get_data_adaptor
    @cache_control(public=True, max_age=ONE_WEEK)
    def get(self, data_adaptor):
        return common_rest.summarize_var_get(request, data_adaptor)

    @rest_get_data_adaptor
    @cache_control(no_store=True)
    def post(self, data_adaptor):
        return common_rest.summarize_var_post(request, data_adaptor)


def get_api_base_resources(bp_base):
    """Add resources that are accessed from the api_base_url"""
    api = Api(bp_base)

    # Diagnostics routes
    api.add_resource(HealthAPI, "/health")
    return api


def get_api_dataroot_resources(bp_dataroot, url_dataroot=None):
    """Add resources that refer to a dataset"""
    api = Api(bp_dataroot)

    def add_resource(resource, url):
        """convenience function to make the outer function less verbose"""
        api.add_resource(resource, url, resource_class_args=(url_dataroot,))

    # Initialization routes
    add_resource(SchemaAPI, "/schema")
    add_resource(DatasetMetadataAPI, "/dataset-metadata")
    add_resource(ConfigAPI, "/config")
    # Data routes
    add_resource(AnnotationsObsAPI, "/annotations/obs")
    add_resource(AnnotationsVarAPI, "/annotations/var")
    add_resource(DataVarAPI, "/data/var")
    add_resource(GenesetsAPI, "/genesets")
    add_resource(SummarizeVarAPI, "/summarize/var")
    # Display routes
    add_resource(ColorsAPI, "/colors")
    # Computation routes
    add_resource(DiffExpObsAPI, "/diffexp/obs")
    add_resource(LayoutObsAPI, "/layout/obs")
    return api


def register_api_v3(app, app_config, server_config):
    api_version = "/api/v0.3"
    api_base_url = server_config.get_api_base_url()
    api_path = "/"
    if api_base_url:
        parse = urlparse(api_base_url)
        api_path = parse.path

    bp_base_v3 = Blueprint("bp_base_v3", __name__, url_prefix=api_path)
    base_resources = get_api_base_resources(bp_base_v3)
    app.register_blueprint(base_resources.blueprint)

    if app_config.is_multi_dataset():
        # NOTE:  These routes only allow the dataset to be in the directory
        # of the dataroot, and not a subdirectory.  We may want to change
        # the route format at some point
        for dataroot_dict in server_config.multi_dataset__dataroot.values():
            url_dataroot = dataroot_dict["base_url"]
            bp_dataroot = Blueprint(
                f"api_dataset_{url_dataroot}",
                __name__,
                url_prefix=(f"{api_path}/{url_dataroot}/<dataset>" + api_version).replace("//", "/"),
            )
            dataroot_resources = get_api_dataroot_resources(bp_dataroot, url_dataroot)
            app.register_blueprint(dataroot_resources.blueprint)

            # TODO: see the following issue regarding the commented-out url rule immediately below:
            # https://app.zenhub.com/workspaces/single-cell-5e2a191dad828d52cc78b028/issues/chanzuckerberg/single-cell-explorer/110

            # self.app.add_url_rule(
            #     f"/{url_dataroot}/<string:dataset>",
            #     f"dataset_index_{url_dataroot}",
            #     lambda dataset, url_dataroot=url_dataroot: dataset_index(url_dataroot, dataset),
            #     methods=["GET"],
            # )
            # app.add_url_rule(
            #     f"/{url_dataroot}/<string:dataset>/",
            #     f"dataset_index_{url_dataroot}/",
            #     lambda dataset, url_dataroot=url_dataroot: dataset_index(url_dataroot, dataset),
            #     methods=["GET"],
            # )
            app.add_url_rule(
                f"/{url_dataroot}/<string:dataset>/static/<path:filename>",
                f"static_assets_{url_dataroot}",
                view_func=lambda dataset, filename: send_from_directory("../common/web/static", filename),
                methods=["GET"],
            )

    else:
        bp_api = Blueprint("api", __name__, url_prefix=f"{api_path}{api_version}")
        resources = get_api_dataroot_resources(bp_api)
        app.register_blueprint(resources.blueprint)
        app.add_url_rule(
            "/static/<path:filename>",
            "static_assets",
            view_func=lambda filename: send_from_directory("../common/web/static", filename),
            methods=["GET"],
        )
