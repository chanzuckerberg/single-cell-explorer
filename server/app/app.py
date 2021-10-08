import datetime
import logging
from functools import wraps
from http import HTTPStatus
from urllib.parse import urlparse
import hashlib
import os

from flask import (
    Flask,
    redirect,
    current_app,
    make_response,
    render_template,
    abort,
    Blueprint,
    request,
    send_from_directory,
)
from flask_restful import Api, Resource
from server_timing import Timing as ServerTiming

import server.common.rest as common_rest
from server.common.utils.data_locator import DataLocator
from server.common.errors import (
    DatasetAccessError,
    RequestException,
    DatasetNotFoundError,
    TombstoneError,
    DatasetMetadataError,
)
from server.common.health import health_check
from server.common.utils.utils import path_join, Float32JSONEncoder
from server.data_common.dataset_metadata import get_dataset_metadata_for_explorer_location
from server.data_common.matrix_loader import MatrixDataLoader

webbp = Blueprint("webapp", "server.common.web", template_folder="templates")

ONE_WEEK = 7 * 24 * 60 * 60


def _cache_control(always, **cache_kwargs):
    """
    Used to easily manage cache control headers on responses.
    See Werkzeug for attributes that can be set, eg, no_cache, private, max_age, etc.
    https://werkzeug.palletsprojects.com/en/1.0.x/datastructures/#werkzeug.datastructures.ResponseCacheControl
    """

    def inner_cache_control(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            response = make_response(f(*args, **kwargs))
            if not always and not current_app.app_config.server_config.app__generate_cache_control_headers:
                return response
            if response.status_code >= 400:
                return response
            for k, v in cache_kwargs.items():
                setattr(response.cache_control, k, v)
            return response

        return wrapper

    return inner_cache_control


def cache_control(**cache_kwargs):
    """config driven"""
    return _cache_control(False, **cache_kwargs)


def cache_control_always(**cache_kwargs):
    """always generate headers, regardless of the config"""
    return _cache_control(True, **cache_kwargs)


@webbp.errorhandler(RequestException)
def handle_request_exception(error):
    return common_rest.abort_and_log(error.status_code, error.message, loglevel=logging.INFO, include_exc_info=True)


# tell the client and CDN not to cache the index.html page, so that changes to the
# app work on redeployment. Note that the bulk of the data needed by the
# client (datasets) will still be cached
# https://web.dev/http-cache/#flowchart
@webbp.route("/", methods=["GET"])
@cache_control_always(no_store=True)
def dataset_index(url_dataroot=None, dataset=None):
    app_config = current_app.app_config
    server_config = app_config.server_config
    if dataset is None:
        if app_config.is_multi_dataset():
            return dataroot_index()
        else:
            dataset = server_config.single_dataset__datapath

    dataset_config = app_config.get_dataset_config(url_dataroot)
    scripts = dataset_config.app__scripts
    inline_scripts = dataset_config.app__inline_scripts

    try:
        with get_data_adaptor(url_dataroot=url_dataroot, dataset=dataset) as data_adaptor:
            data_adaptor.set_uri_path(f"{url_dataroot}/{dataset}")
            args = {"SCRIPTS": scripts, "INLINE_SCRIPTS": inline_scripts}
            return render_template("index.html", **args)

    except (DatasetAccessError, DatasetNotFoundError) as e:
        return common_rest.abort_and_log(
            e.status_code, f"Invalid dataset {dataset}: {e.message}", loglevel=logging.INFO, include_exc_info=True
        )
    except TombstoneError as e:
        parent_collection_url = f"{current_app.app_config.server_config.get_web_base_url()}/collections/{e.collection_id}"  # noqa E501
        return redirect(f"{parent_collection_url}?tombstoned_dataset_id={e.dataset_id}")


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
            parent_collection_url = f"{current_app.app_config.server_config.get_web_base_url()}/collections/{e.collection_id}"  # noqa E501
            return redirect(f"{parent_collection_url}?tombstoned_dataset_id={e.dataset_id}")

    return wrapped_function


def dataroot_test_index():
    # the following index page is meant for testing/debugging purposes
    data = '<!doctype html><html lang="en">'
    data += "<head><title>Hosted Cellxgene</title></head>"
    data += "<body><H1>Welcome to cellxgene</H1>"

    config = current_app.app_config
    server_config = config.server_config

    datasets = []
    for dataroot_dict in server_config.multi_dataset__dataroot.values():
        dataroot = dataroot_dict["dataroot"]
        url_dataroot = dataroot_dict["base_url"]
        locator = DataLocator(dataroot, region_name=server_config.data_locator__s3__region_name)
        for fname in locator.ls():
            location = path_join(dataroot, fname)
            try:
                MatrixDataLoader(location, url_dataroot=url_dataroot, app_config=config)
                datasets.append((url_dataroot, fname))
            except DatasetAccessError:
                # skip over invalid datasets
                pass

    data += "<br/>Select one of these datasets...<br/>"
    data += "<ul>"
    datasets.sort()
    for url_dataroot, dataset in datasets:
        data += f"<li><a href={url_dataroot}/{dataset}/>{dataset}</a></li>"
    data += "</ul>"
    data += "</body></html>"

    return make_response(data)


def dataroot_index():
    # Handle the base url for the cellxgene server when running in multi dataset mode
    config = current_app.app_config
    if not config.server_config.multi_dataset__index:
        abort(HTTPStatus.NOT_FOUND)
    elif config.server_config.multi_dataset__index is True:
        return dataroot_test_index()
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
    @cache_control(public=True, max_age=ONE_WEEK)
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


def handle_api_base_url(app, app_config):
    """If an api_base_url is provided, then an inline script is generated to
    handle the new API prefix"""
    api_base_url = app_config.server_config.get_api_base_url()
    if not api_base_url:
        return

    sha256 = hashlib.sha256(api_base_url.encode()).hexdigest()
    script_name = f"api_base_url-{sha256}.js"
    script_path = os.path.join(app.root_path, "../common/web/templates", script_name)
    with open(script_path, "w") as fout:
        fout.write("window.CELLXGENE.API.prefix = `" + api_base_url + "${location.pathname}api/`;\n")

    dataset_configs = [app_config.default_dataset_config] + list(app_config.dataroot_config.values())
    for dataset_config in dataset_configs:
        inline_scripts = dataset_config.app__inline_scripts
        inline_scripts.append(script_name)


class Server:
    @staticmethod
    def _before_adding_routes(app, app_config):
        """will be called before routes are added, during __init__.  Subclass protocol"""
        pass

    def __init__(self, app_config):
        self.app = Flask(__name__, static_folder=None)
        handle_api_base_url(self.app, app_config)
        self._before_adding_routes(self.app, app_config)
        self.app.json_encoder = Float32JSONEncoder
        server_config = app_config.server_config
        if server_config.app__server_timing_headers:
            ServerTiming(self.app, force_debug=True)

        # enable session data
        self.app.permanent_session_lifetime = datetime.timedelta(days=50 * 365)

        # Config
        secret_key = server_config.app__flask_secret_key
        self.app.config.update(SECRET_KEY=secret_key)

        self.app.register_blueprint(webbp)

        api_version = "/api/v0.2"
        api_base_url = server_config.get_api_base_url()
        api_path = "/"
        if api_base_url:
            parse = urlparse(api_base_url)
            api_path = parse.path


        bp_base = Blueprint("bp_base", __name__, url_prefix=api_path)
        base_resources = get_api_base_resources(bp_base)
        self.app.register_blueprint(base_resources.blueprint)

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
                self.app.register_blueprint(dataroot_resources.blueprint)

                # TODO: see the following issue regarding the commented-out url rule immediately below:
                # https://app.zenhub.com/workspaces/single-cell-5e2a191dad828d52cc78b028/issues/chanzuckerberg/single-cell-explorer/110

                # self.app.add_url_rule(
                #     f"/{url_dataroot}/<string:dataset>",
                #     f"dataset_index_{url_dataroot}",
                #     lambda dataset, url_dataroot=url_dataroot: dataset_index(url_dataroot, dataset),
                #     methods=["GET"],
                # )
                self.app.add_url_rule(
                    f"/{url_dataroot}/<string:dataset>/",
                    f"dataset_index_{url_dataroot}/",
                    lambda dataset, url_dataroot=url_dataroot: dataset_index(url_dataroot, dataset),
                    methods=["GET"],
                )
                self.app.add_url_rule(
                    f"/{url_dataroot}/<string:dataset>/static/<path:filename>",
                    f"static_assets_{url_dataroot}",
                    view_func=lambda dataset, filename: send_from_directory("../common/web/static", filename),
                    methods=["GET"],
                )

        else:
            bp_api = Blueprint("api", __name__, url_prefix=f"{api_path}{api_version}")
            resources = get_api_dataroot_resources(bp_api)
            self.app.register_blueprint(resources.blueprint)
            self.app.add_url_rule(
                "/static/<path:filename>",
                "static_assets",
                view_func=lambda filename: send_from_directory("../common/web/static", filename),
                methods=["GET"],
            )

        self.app.matrix_data_cache_manager = server_config.matrix_data_cache_manager
        self.app.dataset_metadata_cache_manager = server_config.dataset_metadata_cache_manager

        self.app.app_config = app_config
