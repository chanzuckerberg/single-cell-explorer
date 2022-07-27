import datetime
import hashlib
import json
import logging
import os
from http import HTTPStatus
from urllib.parse import urlparse

from flask import Flask, redirect, current_app, make_response, abort, render_template, Blueprint, request
from flask_restful import Api, Resource
from server_timing import Timing as ServerTiming

import server.common.rest as common_rest
from server.app.api import webbp, cache_control_always, cache_control
from server.app.api.util import get_dataset_artifact_s3_uri, get_data_adaptor
from server.app.api.v2 import register_api_v2
from server.app.api.v3 import register_api_v3
from server.common.errors import (
    DatasetAccessError,
    RequestException,
    DatasetNotFoundError,
    TombstoneError,
)
from server.common.health import health_check
from server.common.utils.data_locator import DataLocator
from server.common.utils.utils import path_join, Float32JSONEncoder
from server.dataset.matrix_loader import MatrixDataLoader


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
        dataset_artifact_s3_uri = get_dataset_artifact_s3_uri(url_dataroot, dataset)
        # Attempt to load the dataset to see if it exists at all
        get_data_adaptor(app_config=app_config, dataset_artifact_s3_uri=dataset_artifact_s3_uri)
    except (DatasetAccessError, DatasetNotFoundError) as e:
        return common_rest.abort_and_log(
            e.status_code, f"Invalid dataset {dataset}: {e.message}", loglevel=logging.INFO, include_exc_info=True
        )
    except TombstoneError as e:
        parent_collection_url = (
            f"{current_app.app_config.server_config.get_web_base_url()}/collections/{e.collection_id}"  # noqa E501
        )
        return redirect(f"{parent_collection_url}?tombstoned_dataset_id={e.dataset_id}")

    args = {"SCRIPTS": scripts, "INLINE_SCRIPTS": inline_scripts}
    return render_template("index.html", **args)


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
                MatrixDataLoader(location, app_config=config)
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


def get_api_base_resources(bp_base):
    """Add resources that are accessed from the api_base_url"""
    api = Api(bp_base)

    # Diagnostics routes
    api.add_resource(HealthAPI, "/health")
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

        api_base_url = server_config.get_api_base_url()
        if api_base_url:
            api_url_prefix = urlparse(api_base_url).path
        else:
            api_url_prefix = "/"

        bp_base = Blueprint("bp_base", __name__, url_prefix=api_url_prefix)
        base_resources = get_api_base_resources(bp_base)
        self.app.register_blueprint(base_resources.blueprint)

        register_api_v2(app=self.app, app_config=app_config, server_config=server_config, api_url_prefix=api_url_prefix)
        register_api_v3(app=self.app, app_config=app_config, server_config=server_config, api_url_prefix=api_url_prefix)

        if app_config.is_multi_dataset():
            # NOTE:  These routes only allow the dataset to be in the directory
            # of the dataroot, and not a subdirectory.  We may want to change
            # the route format at some point
            for dataroot_dict in server_config.multi_dataset__dataroot.values():
                url_dataroot = dataroot_dict["base_url"]
                self.app.add_url_rule(
                    f"/{url_dataroot}/<string:dataset>/",
                    f"dataset_index_{url_dataroot}/",
                    lambda dataset, url_dataroot=url_dataroot: dataset_index(url_dataroot, dataset),
                    methods=["GET"],
                )

        self.app.app_config = app_config

        @self.app.before_request
        def pre_request_logging():
            message = json.dumps(dict(url=request.path, method=request.method, schema=request.scheme))
            self.app.logger.info(message)
