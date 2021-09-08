import json
import logging

import requests
from flask import current_app

from backend.common.utils.utils import path_join
from backend.common.errors import DatasetNotFoundError, DatasetAccessError
from backend.czi_hosted.common.config.app_config import AppConfig
from backend.czi_hosted.common.config.server_config import ServerConfig


def request_dataset_metadata_from_data_portal(data_portal_api_base: str, explorer_url: str):
    """
    Check the data portal metadata api for datasets stored under the given url_path
    If present return dataset metadata object else return None
    """
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    try:
        url = f"{data_portal_api_base}/datasets/meta?url={explorer_url}"
        current_app.logger.log(logging.CRITICAL, f"url to check: {url}")

        response = requests.get(
            url=url,
            headers=headers
        )
        if response.status_code == 200:
            current_app.logger.log(logging.CRITICAL, f"Response from explorer meta endpoint: {response}")
            dataset_identifiers = json.loads(response.body)
            return dataset_identifiers
        else:
            current_app.logger.log(logging.CRITICAL, f"Response from explorer meta endpoint: {response}")
            return None
    except Exception:
        return None


def extrapolate_dataset_location_from_config(server_config: ServerConfig, dataset_explorer_location: str):
    """
    Use the dataset_explorer_location and the server config to determine where the dataset is stored
    """
    # TODO @mdunitz remove after fork, update config to remove single_dataset option, the multiroot lookup will need to
    #  remain while we support covid 19 cell atlas.
    #   See ticket https://app.zenhub.com/workspaces/single-cell-5e2a191dad828d52cc78b028/issues/chanzuckerberg/corpora-data-portal/1281 # noqa
    if server_config.single_dataset__datapath:
        datapath = server_config.single_dataset__datapath
        return datapath
    else:
        dataset_explorer_location = dataset_explorer_location.split("/")
        dataset = dataset_explorer_location.pop(-1)
        url_dataroot = "/".join(dataset_explorer_location)
        dataroot = None
        for key, dataroot_dict in server_config.multi_dataset__dataroot.items():
            if dataroot_dict["base_url"] == url_dataroot:
                dataroot = dataroot_dict["dataroot"]
                break
        if dataroot is None:
            raise DatasetAccessError(f"Invalid dataset {url_dataroot}/{dataset}")
        datapath = path_join(dataroot, dataset)
        # path_join returns a normalized path.  Therefore it is
        # sufficient to check that the datapath starts with the
        # dataroot to determine that the datapath is under the dataroot.
        if not datapath.startswith(dataroot):
            raise DatasetAccessError(f"Invalid dataset {url_dataroot}/{dataset}")
        return datapath


def get_dataset_metadata_for_explorer_location(dataset_explorer_location: str, app_config: AppConfig):
    """
    Given the dataset access location(the path to view the dataset in the explorer including the dataset root,
    also used as the cache key) and the explorer web base url (from the app_config) this function returns the location
    of the dataset, along with additional metadata.
    The dataset location is is either retrieved from the data portal, or built based on the dataroot information stored
    in the server config.
    In the case of a single dataset the dataset location is pulled directly from the server_config.
    """
    current_app.logger.log(logging.DEBUG, f"Looking for dataset: {dataset_explorer_location}")
    if app_config.server_config.data_locator__api_base:
        explorer_url_path = f"{app_config.server_config.get_web_base_url()}/{dataset_explorer_location}"
        current_app.logger.log(logging.CRITICAL, f"Looking: {explorer_url_path}")
        dataset_metadata = request_dataset_metadata_from_data_portal(
            data_portal_api_base=app_config.server_config.data_locator__api_base,
            explorer_url=explorer_url_path
        )
        if dataset_metadata:
            current_app.logger.log(logging.CRITICAL, f"Dataset Metadata: {dataset_metadata}")
            return dataset_metadata
    server_config = app_config.server_config
    dataset_metadata = {
        "collection_id": None,
        "collection_visibility": None,
        "dataset_id": None,
        "s3_uri": None,
        "tombstoned": False
    }
    dataset_metadata["s3_uri"] = extrapolate_dataset_location_from_config(
        server_config=server_config, dataset_explorer_location=dataset_explorer_location)
    if dataset_metadata["s3_uri"] is None:
        current_app.logger.log(logging.INFO, f"Dataset not found: {dataset_explorer_location}")
        raise DatasetNotFoundError(f"Dataset location not found for {dataset_explorer_location}")

    return dataset_metadata
