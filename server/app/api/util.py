import logging
from http import HTTPStatus

from flask import current_app, redirect, render_template, make_response, abort
from server.app.api import webbp, cache_control_always
from server.common import rest as common_rest
from server.common.utils.data_locator import DataLocator
from server.common.utils.utils import path_join

from server.dataset.dataset_metadata import get_dataset_metadata
from server.dataset.matrix_loader import MatrixDataLoader
from server.common.errors import DatasetAccessError, DatasetNotFoundError, TombstoneError


def get_dataset_artifact_s3_uri(url_dataroot: str = None, dataset_id: str = None):
    dataset_artifact_s3_uri = get_dataset_metadata(url_dataroot, dataset_id, current_app.app_config)["s3_uri"]
    if dataset_artifact_s3_uri:
        dataset_artifact_s3_uri = dataset_artifact_s3_uri.rstrip("/")  # remove trailing slash for cloudfront caching.
    return dataset_artifact_s3_uri


def get_data_adaptor(dataset_artifact_s3_uri: str, app_config):
    return MatrixDataLoader(location=dataset_artifact_s3_uri, app_config=app_config).validate_and_open()


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
