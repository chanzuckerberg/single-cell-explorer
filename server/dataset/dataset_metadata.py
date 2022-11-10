import json
import logging
from typing import Union

import requests
from flask import current_app

from server.common.utils.utils import path_join
from server.common.errors import DatasetAccessError, DatasetMetadataError, TombstoneError
from server.common.config.app_config import AppConfig


def request_dataset_metadata_from_data_portal(data_portal_api_base: str, explorer_url: str):
    """
    Check the data portal metadata api for datasets stored under the given url_path
    If present return dataset metadata object else return None
    """
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    try:
        response = requests.get(url=f"{data_portal_api_base}/datasets/meta?url={explorer_url}/", headers=headers)

        if response.status_code == 200:
            dataset_identifiers = json.loads(response.content)
            return dataset_identifiers
        else:
            return None
    except Exception:
        return None


def infer_dataset_s3_uri(app_config: AppConfig, dataset_root: str, dataset_id: str) -> Union[str, None]:
    """
    Use the dataset_root, dataset_id, and the server config to infer the physical S3 URI for an Explorer dataset
    artifact
    """
    #   See ticket https://app.zenhub.com/workspaces/single-cell-5e2a191dad828d52cc78b028/issues/chanzuckerberg/corpora-data-portal/1281 # noqa

    for dataroot in app_config.server__multi_dataset__dataroots.values():
        if dataroot.base_url == dataset_root:
            dataroot = dataroot.dataroot
            break
    if dataroot is None:
        raise DatasetAccessError(f"Invalid dataset root {dataset_root}")

    s3_uri = path_join(dataroot, dataset_id)

    # TODO: Is the check still necessary?
    # path_join returns a normalized path.  Therefore it is
    # sufficient to check that the datapath starts with the
    # dataroot to determine that the datapath is under the dataroot.
    if not s3_uri.startswith(dataroot):
        raise DatasetAccessError(f"Invalid dataset {s3_uri}")
    return s3_uri


def get_dataset_metadata(dataset_root: str, dataset_id: str, app_config: AppConfig) -> dict:
    """
    Given the dataset root and dataset_id and the explorer web base url (from the app_config), returns the metadata for
    the dataset, including the s3 URI of the dataset artifact.

    The dataset location is is either retrieved from the data portal, or inferred from the dataset_root, dataset_id,
    and the server config.

    In the case of a single dataset the dataset location is pulled directly from the server_config.
    """
    explorer_url_path = f"{app_config.get_web_base_url()}/{dataset_root}/{dataset_id}"

    if app_config.server__data_locator__api_base:
        dataset_metadata = request_dataset_metadata_from_data_portal(
            data_portal_api_base=app_config.server__data_locator__api_base, explorer_url=explorer_url_path
        )

        if dataset_metadata:
            if dataset_metadata["tombstoned"]:
                dataset_id = dataset_metadata["dataset_id"]
                collection_id = dataset_metadata["collection_id"]
                msg = (
                    f"Dataset {dataset_id} from collection {collection_id} has been tombstoned and is no "
                    "longer available"
                )

                current_app.logger.log(logging.INFO, msg)
                raise TombstoneError(message=msg, collection_id=collection_id, dataset_id=dataset_id)
            return dataset_metadata

    current_app.logger.log(
        logging.INFO,
        f"Dataset not found by Data Portal: {explorer_url_path}. "
        "Falling back to deriving S3 location from request URL.",
    )

    s3_uri = infer_dataset_s3_uri(
        app_config=app_config, dataset_root=dataset_root, dataset_id=dataset_id
    )

    return {
        "collection_id": None,
        "collection_visibility": None,
        "dataset_id": None,
        "s3_uri": s3_uri,
        "tombstoned": False,
    }


def get_dataset_and_collection_metadata(dataset_root: str, dataset_id: str, app_config: AppConfig):
    data_locator_base_url = app_config.server__get_data_locator_api_base_url()

    try:
        base_metadata = get_dataset_metadata(dataset_root, dataset_id, app_config)

        collection_id = base_metadata.get("collection_id")
        if collection_id is None:
            return None

        dataset_id = base_metadata["dataset_id"]
        collection_visibility = base_metadata["collection_visibility"]

        suffix = "?visibility=PRIVATE" if collection_visibility == "PRIVATE" else ""
        suffix_for_url = "/private" if collection_visibility == "PRIVATE" else ""

        res = requests.get(f"{data_locator_base_url}/collections/{collection_id}{suffix}").json()

        web_base_url = app_config.get_web_base_url()
        metadata = {
            "dataset_name": [dataset["name"] for dataset in res["datasets"] if dataset["id"] == dataset_id][0],
            "dataset_id": dataset_id,
            "collection_url": f"{web_base_url}/collections/{collection_id}{suffix_for_url}",
            "collection_name": res["name"],
            "collection_description": res["description"],
            "collection_contact_email": res["contact_email"],
            "collection_contact_name": res["contact_name"],
            "collection_links": res["links"],
            "collection_datasets": res["datasets"],
        }

        if res.get("publisher_metadata"):
            metadata["collection_publisher_metadata"] = res["publisher_metadata"]

        return metadata

    except Exception as ex:
        raise DatasetMetadataError("Error retrieving dataset metadata") from ex
