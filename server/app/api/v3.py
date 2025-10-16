import logging
import re
from functools import wraps
from http import HTTPStatus
from urllib.parse import unquote

from flask import (
    Blueprint,
    current_app,
    escape,
    make_response,
    redirect,
    request,
    send_from_directory,
)
from flask_restful import Api, Resource

import server.common.agent as common_agent
import server.common.rest as common_rest
from server.app.api.util import get_data_adaptor, get_dataset_artifact_s3_uri
from server.common.constants import CELLGUIDE_CXG_KEY_NAME, CUSTOM_CXG_KEY_NAME
from server.common.errors import (
    DatasetAccessError,
    DatasetMetadataError,
    DatasetNotFoundError,
    TombstoneError,
)
from server.common.utils.http_cache import ONE_YEAR, cache_control


def rest_get_s3uri_data_adaptor(func):
    @wraps(func)
    def wrapped_function(self, s3_uri=None):
        try:
            s3_uri = unquote(s3_uri) if s3_uri else s3_uri
            data_adaptor = get_data_adaptor(s3_uri)
            return func(self, data_adaptor)
        except (DatasetAccessError, DatasetNotFoundError, DatasetMetadataError) as e:
            return common_rest.abort_and_log(
                e.status_code, f"Invalid s3_uri {s3_uri}: {e.message}", loglevel=logging.INFO, include_exc_info=True
            )

    return wrapped_function


class DatasetResource(Resource):
    """Base class for all Resources that act on datasets."""

    def __init__(self, url_dataroot):
        super().__init__()
        self.url_dataroot = url_dataroot


class S3URIAPI(DatasetResource):
    @cache_control(public=True, no_store=True, max_age=0)
    def get(self, dataset):
        app_config = current_app.app_config
        return common_rest.s3_uri_get(app_config, self.url_dataroot, dataset)


class S3URIResource(Resource):
    """Base class for all Resources that act on S3 URIs."""

    def __init__(self, s3_uri_root):
        super().__init__()
        self.s3_uri_root = s3_uri_root


class SchemaAPI(S3URIResource):
    # TODO @mdunitz separate dataset schema and user schema
    # TODO: Add user-specific caching using ETags - schema can be cached per-user
    #       since user annotations only affect individual users. Consider:
    #       - ETag based on hash(base_schema + user_annotations_for_user)
    #       - Anonymous users get ETag based only on base_schema
    #       - This would allow long-term caching for read-only users while
    #         still supporting fresh data for annotation creators
    # Removed immutable cache since schema can change with user annotations
    @cache_control(no_store=True, max_age=0)
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.schema_get(data_adaptor)


class GenesetsAPI(S3URIResource):
    @cache_control(no_store=True, max_age=0)
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.genesets_get(data_adaptor)

    @cache_control(no_store=True)
    @rest_get_s3uri_data_adaptor
    def put(self, data_adaptor):
        return common_rest.genesets_put(request, data_adaptor)


class ConfigAPI(S3URIResource):
    @cache_control(immutable=True, max_age=ONE_YEAR)
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.config_get(current_app.app_config, data_adaptor)


class AnnotationsObsAPI(S3URIResource):
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        # Check if request includes user annotations to determine caching
        fields = request.args.getlist("annotation-name", None)
        user_id = common_rest._resolve_request_user_id(request)

        # Check if any requested fields are user annotations (writable=True in schema)
        includes_user_annotations = False
        if user_id:
            try:
                # Get schema with user annotations included
                schema = data_adaptor.get_schema(user_id=user_id)
                obs_columns = schema.get("annotations", {}).get("obs", {}).get("columns", [])

                # Find all user annotation names (writable=True)
                user_annotation_names = {
                    col["name"] for col in obs_columns if isinstance(col, dict) and col.get("writable", False)
                }

                if fields:
                    # Check if any requested fields are user annotations
                    includes_user_annotations = bool(set(fields) & user_annotation_names)
                else:
                    # If no specific fields requested (getting all), and user has annotations
                    includes_user_annotations = bool(user_annotation_names)
            except Exception:
                # If we can't determine, be safe and don't cache
                includes_user_annotations = True

        response = common_rest.annotations_obs_get(request, data_adaptor)

        # Apply appropriate cache headers
        if includes_user_annotations:
            # Don't cache responses that include user annotations
            response.headers["Cache-Control"] = "no-store, max-age=0"
        else:
            # Cache built-in columns forever
            response.headers["Cache-Control"] = f"immutable, max-age={ONE_YEAR}"

        return response

    @cache_control(no_store=True)
    @rest_get_s3uri_data_adaptor
    def put(self, data_adaptor):
        # Check if this is a category rename operation
        if request.args.get("rename"):
            return common_rest.annotations_obs_category_rename(request, data_adaptor)
        else:
            return common_rest.annotations_obs_put(request, data_adaptor)

    @cache_control(no_store=True)
    @rest_get_s3uri_data_adaptor
    def delete(self, data_adaptor):
        return common_rest.annotations_obs_category_delete(request, data_adaptor)


class AnnotationsVarAPI(S3URIResource):
    @cache_control(immutable=True, max_age=ONE_YEAR)
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.annotations_var_get(request, data_adaptor)


class DataVarAPI(S3URIResource):
    @cache_control(no_store=True)
    @rest_get_s3uri_data_adaptor
    def put(self, data_adaptor):
        return common_rest.data_var_put(request, data_adaptor)

    @cache_control(immutable=True, max_age=ONE_YEAR)
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.data_var_get(request, data_adaptor)


class ColorsAPI(S3URIResource):
    @cache_control(immutable=True, max_age=ONE_YEAR)
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.colors_get(data_adaptor)


class DiffExpObsAPI(DatasetResource):
    @cache_control(no_store=True)
    @rest_get_s3uri_data_adaptor
    def post(self, data_adaptor):
        return common_rest.diffexp_obs_post(request, data_adaptor)


class DiffExpObs2API(DatasetResource):
    @cache_control(no_store=True)
    @rest_get_s3uri_data_adaptor
    def post(self, data_adaptor):
        return common_rest.diffex_binary_post(request, data_adaptor)


class LayoutObsAPI(S3URIResource):
    @cache_control(immutable=True, max_age=ONE_YEAR)
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.layout_obs_get(request, data_adaptor)


class SummarizeVarAPI(S3URIResource):
    @rest_get_s3uri_data_adaptor
    @cache_control(immutable=True, max_age=ONE_YEAR)
    def get(self, data_adaptor):
        return common_rest.summarize_var_get(request, data_adaptor)

    @rest_get_s3uri_data_adaptor
    @cache_control(no_store=True)
    def post(self, data_adaptor):
        return common_rest.summarize_var_post(request, data_adaptor)


class GeneInfoAPI(S3URIResource):
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.gene_info_get(request)


class CellTypeInfoAPI(S3URIResource):
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.cell_type_info_get(request)


class CellTypeListAPI(S3URIResource):
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.cell_type_list_get(request)


class VersionAPI(Resource):
    def get(self):
        return common_rest.get_deployed_version(request)


class UnsMetaAPI(DatasetResource):
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.uns_metadata_get(request, data_adaptor)


class ATACCoverageAPI(DatasetResource):
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.atac_coverage_get(request, data_adaptor)


# class ATACGeneInfoAPI(DatasetResource):
#     @rest_get_s3uri_data_adaptor
#     def get(self, data_adaptor):
#         return common_rest.atac_gene_info_get(request, data_adaptor)


class ATACCytobandAPI(DatasetResource):
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.atac_cytoband_get(request, data_adaptor)


class AgentAPI(S3URIResource):  # Inherit from S3URIResource instead of Resource
    @rest_get_s3uri_data_adaptor
    def post(self, data_adaptor):
        return common_agent.agent_step_post(request, data_adaptor)


def rest_get_dataset_explorer_location_data_adaptor(func):
    @wraps(func)
    def wrapped_function(self, dataset=None):
        try:
            s3_uri = get_dataset_artifact_s3_uri(self.url_dataroot, dataset)
            data_adaptor = get_data_adaptor(s3_uri)
            # HACK: Used *only* to pass the dataset_explorer_location to DatasetMeta.get_dataset_and_collection_
            # metadata()
            data_adaptor.dataset_id = dataset
            return func(self, data_adaptor)
        except (DatasetAccessError, DatasetNotFoundError, DatasetMetadataError) as e:
            return common_rest.abort_and_log(
                e.status_code, f"Invalid s3_uri {dataset}: {e.message}", loglevel=logging.INFO, include_exc_info=True
            )
        except TombstoneError as e:
            parent_collection_url = (
                f"{current_app.app_config.server__app__web_base_url}/collections/{e.collection_id}"  # noqa E501
            )
            return redirect(f"{parent_collection_url}?tombstoned_dataset_id={e.dataset_id}")

    return wrapped_function


class DatasetMetadataAPI(DatasetResource):
    @cache_control(public=True, no_store=True, max_age=0)
    @rest_get_dataset_explorer_location_data_adaptor
    def get(self, data_adaptor):
        return common_rest.dataset_metadata_get(current_app.app_config, self.url_dataroot, data_adaptor.dataset_id)


def get_api_dataroot_resources(bp_dataroot, url_dataroot=None):
    """Add resources that refer to a dataset"""
    api = Api(bp_dataroot)

    def add_resource(resource, url):
        """convenience function to make the outer function less verbose"""
        api.add_resource(resource, url, resource_class_args=(url_dataroot,))

    # Initialization routes
    add_resource(S3URIAPI, "/s3_uri")
    add_resource(DatasetMetadataAPI, "/dataset-metadata")
    return api


def get_api_s3uri_resources(bp_dataroot, s3uri_path):
    """Add resources that refer to a S3 URIs"""
    api = Api(bp_dataroot)

    def add_resource(resource, url):
        """convenience function to make the outer function less verbose"""
        api.add_resource(resource, url, resource_class_args=(s3uri_path,))

    # Initialization routes
    add_resource(SchemaAPI, "/schema")
    add_resource(ConfigAPI, "/config")
    add_resource(GenesetsAPI, "/genesets")
    # Data routes
    add_resource(AnnotationsObsAPI, "/annotations/obs")
    add_resource(AnnotationsVarAPI, "/annotations/var")
    add_resource(DataVarAPI, "/data/var")
    add_resource(CellTypeInfoAPI, "/cellinfo")
    add_resource(CellTypeListAPI, "/celltypes")
    add_resource(GeneInfoAPI, "/geneinfo")
    add_resource(SummarizeVarAPI, "/summarize/var")
    # Display routes
    add_resource(ColorsAPI, "/colors")
    # Computation routes
    add_resource(DiffExpObsAPI, "/diffexp/obs")
    add_resource(DiffExpObs2API, "/diffexp/obs2")
    add_resource(LayoutObsAPI, "/layout/obs")
    # Uns/Spatial
    add_resource(UnsMetaAPI, "/uns/meta")
    # ATAC
    add_resource(ATACCoverageAPI, "/atac/coverage")
    # add_resource(ATACGeneInfoAPI, "/atac/geneinfo")
    add_resource(ATACCytobandAPI, "/atac/cytoband")
    # Agent
    add_resource(AgentAPI, "/agent/step")
    return api


def register_api_v3(app, app_config, api_url_prefix):
    api_version = "/api/v0.3"

    s3uri_api_path = "s3_uri"
    bp_s3uri = Blueprint(
        f"api_dataset_{s3uri_api_path}_{api_version.replace('.',',')}",
        __name__,
        url_prefix=(f"{api_url_prefix}/{s3uri_api_path}/<s3_uri>" + api_version).replace("//", "/"),
    )
    s3uri_resources = get_api_s3uri_resources(bp_s3uri, s3uri_api_path)
    app.register_blueprint(s3uri_resources.blueprint)

    Api(app).add_resource(VersionAPI, "/deployed_version")

    for dataroot_dict in app_config.server__multi_dataset__dataroots.values():
        url_dataroot = dataroot_dict["base_url"]

        # Regular datasets
        bp_dataroot = Blueprint(
            name=f"api_dataset_{url_dataroot}_{api_version.replace('.',',')}",
            import_name=__name__,
            url_prefix=(f"{api_url_prefix}/{url_dataroot}/<string:dataset>" + api_version).replace("//", "/"),
        )
        dataroot_resources = get_api_dataroot_resources(bp_dataroot, url_dataroot)
        app.register_blueprint(dataroot_resources.blueprint)

        # Cellguide CXGs
        bp_dataroot_cg = Blueprint(
            name=f"api_dataset_{url_dataroot}_cellguide_cxgs_{api_version.replace('.',',')}",
            import_name=__name__,
            url_prefix=(
                f"{api_url_prefix}/{url_dataroot}/{CELLGUIDE_CXG_KEY_NAME}/<path:dataset>.cxg" + api_version
            ).replace("//", "/"),
        )
        dataroot_resources_cg = get_api_dataroot_resources(bp_dataroot_cg, url_dataroot)
        app.register_blueprint(dataroot_resources_cg.blueprint)

        # Custom CXGs (only for "w" dataroot)
        if url_dataroot == "w":
            # Add authorization check before processing any /w/ requests
            @app.before_request
            def _check_w_dataroot_access(dataroot=url_dataroot):
                # Check both direct /w/ paths and /s3_uri/ paths that contain /w/
                url_path = request.path
                should_check = url_path.startswith(f"/{dataroot}/") or (
                    "/s3_uri/" in url_path and f"/{dataroot}/" in unquote(url_path)
                )

                if should_check:
                    # Skip authentication for OPTIONS requests (CORS preflight)
                    if request.method == "OPTIONS":
                        return None

                    try:
                        user_id = common_rest._resolve_request_user_id(request)
                        if user_id is None:
                            # No user ID means auth is disabled, which should not have access to /w/
                            return make_response("Unauthorized access to /w/ dataroot", HTTPStatus.UNAUTHORIZED)

                        # Skip user ID path validation for local-dev-user (development/testing)
                        if not user_id.startswith(common_rest.LOCAL_DEV_USER_PREFIX):
                            # Check if the user_id from header matches the user_id in the URL path
                            # For s3_uri paths, also check the decoded URL
                            user_id_pattern = f"/{re.escape(user_id)}/"
                            decoded_path = unquote(url_path)

                            if not (re.search(user_id_pattern, url_path) or re.search(user_id_pattern, decoded_path)):
                                return make_response(
                                    f"User ID mismatch: authenticated user '{escape(user_id)}' does not match URL path",
                                    HTTPStatus.FORBIDDEN,
                                )
                    except Exception:
                        # If we can't resolve user ID (e.g., not in VCP deployment), deny access
                        return make_response("Unauthorized access to /w/ dataroot", HTTPStatus.UNAUTHORIZED)

            bp_dataroot_custom = Blueprint(
                name=f"api_dataset_{url_dataroot}_custom_cxgs_{api_version.replace('.',',')}",
                import_name=__name__,
                url_prefix=(
                    f"{api_url_prefix}/{url_dataroot}/{CUSTOM_CXG_KEY_NAME}/<path:dataset>.cxg" + api_version
                ).replace("//", "/"),
            )
            dataroot_resources_custom = get_api_dataroot_resources(bp_dataroot_custom, url_dataroot)
            app.register_blueprint(dataroot_resources_custom.blueprint)

        # Static asset routes
        app.add_url_rule(
            f"/{url_dataroot}/<string:dataset>/static/<path:filename>",
            f"static_assets_{url_dataroot}",
            view_func=lambda dataset, filename: send_from_directory("../common/web/static", filename),
            methods=["GET"],
        )
        app.add_url_rule(
            f"/{url_dataroot}/{CELLGUIDE_CXG_KEY_NAME}/<path:dataset>.cxg/static/<path:filename>",
            f"static_assets_{url_dataroot}_cellguide_cxgs/",
            view_func=lambda dataset, filename: send_from_directory("../common/web/static", filename),
            methods=["GET"],
        )
        if url_dataroot == "w":
            app.add_url_rule(
                f"/{url_dataroot}/{CUSTOM_CXG_KEY_NAME}/<path:dataset>.cxg/static/<path:filename>",
                f"static_assets_{url_dataroot}_custom_cxgs/",
                view_func=lambda dataset, filename: send_from_directory("../common/web/static", filename),
                methods=["GET"],
            )

        # Add agent endpoint for each dataroot
        app.add_url_rule(
            f"{api_url_prefix}/{url_dataroot}/<string:dataset>/api/v0.3/agent/step",
            f"agent_step_{url_dataroot}",
            view_func=lambda: common_agent.agent_step_post(request),
            methods=["POST"],
        )
