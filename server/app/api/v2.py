import logging
import os
from functools import wraps

from flask import (
    current_app,
    Blueprint,
    request,
    send_from_directory,
    redirect,
)
from flask_restful import Api, Resource

import server.common.rest as common_rest
from server.app.api import ONE_WEEK, cache_control
from server.app.api.util import get_dataset_artifact_s3_uri, get_data_adaptor
from server.common.errors import (
    DatasetAccessError,
    DatasetNotFoundError,
    DatasetMetadataError,
    TombstoneError,
)


def rest_get_data_adaptor(func):
    @wraps(func)
    def wrapped_function(self, dataset=None):
        try:
            s3_uri = get_dataset_artifact_s3_uri(self.url_dataroot, dataset)
            data_adaptor = get_data_adaptor(s3_uri, app_config=current_app.app_config)
            # HACK: Used *only* to pass the dataset_explorer_location to DatasetMeta.get_dataset_and_collection_metadata()
            data_adaptor.dataset_id = dataset
            return func(self, data_adaptor)
        except (DatasetAccessError, DatasetNotFoundError, DatasetMetadataError) as e:
            return common_rest.abort_and_log(
                e.status_code, f"Invalid s3_uri {dataset}: {e.message}", loglevel=logging.INFO, include_exc_info=True
            )
        except TombstoneError as e:
            parent_collection_url = (
                f"{current_app.app_config.server_config.get_web_base_url()}/collections/{e.collection_id}"  # noqa E501
            )
            return redirect(f"{parent_collection_url}?tombstoned_dataset_id={e.dataset_id}")

    return wrapped_function


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


# TODO: This is being used by v3 API as well. Is must always be provided the dataset_explorer_location, and never the dataset s3_uri. Move to app/app.py?
class DatasetMetadataAPI(DatasetResource):
    @cache_control(public=True, no_store=True, max_age=0)
    @rest_get_data_adaptor
    def get(self, data_adaptor):
        return common_rest.dataset_metadata_get(
            current_app.app_config, self.url_dataroot, data_adaptor.dataset_id
        )


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


def register_api_v2(app, app_config, server_config, api_url_prefix):
    api_version = "/api/v0.2"
    if app_config.is_multi_dataset():
        # NOTE:  These routes only allow the dataset to be in the directory
        # of the dataroot, and not a subdirectory.  We may want to change
        # the route format at some point
        for dataroot_dict in server_config.multi_dataset__dataroot.values():
            url_dataroot = dataroot_dict["base_url"]
            bp_dataroot = Blueprint(
                name=f"api_dataset_{url_dataroot}_{api_version}",
                import_name=__name__,
                url_prefix=(f"{api_url_prefix}/{url_dataroot}/<dataset>" + api_version).replace("//", "/"),
            )
            dataroot_resources = get_api_dataroot_resources(bp_dataroot, url_dataroot)
            app.register_blueprint(dataroot_resources.blueprint)
            app.add_url_rule(
                f"/{url_dataroot}/<string:dataset>/static/<path:filename>",
                f"static_assets_{url_dataroot}",
                view_func=lambda dataset, filename: send_from_directory("../common/web/static", filename),
                methods=["GET"],
            )
    else:
        bp_api = Blueprint("api", __name__, url_prefix=f"{api_url_prefix}{api_version}")
        resources = get_api_dataroot_resources(bp_api)
        app.register_blueprint(resources.blueprint)
        app.add_url_rule(
            "/static/<path:filename>",
            "static_assets",
            view_func=lambda filename: send_from_directory("../common/web/static", filename),
            methods=["GET"],
        )
