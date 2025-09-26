from flask import current_app

from server.common.auth import normalize_and_authorize_dataset_id
from server.dataset.dataset_metadata import get_dataset_metadata
from server.dataset.matrix_loader import DataLoader


def get_dataset_artifact_s3_uri(url_dataroot: str = None, dataset_id: str = None):
    normalized_dataset_id = normalize_and_authorize_dataset_id(url_dataroot, dataset_id)
    dataset_artifact_s3_uri = get_dataset_metadata(
        url_dataroot, normalized_dataset_id, current_app.app_config
    )["s3_uri"]
    if dataset_artifact_s3_uri:
        dataset_artifact_s3_uri = dataset_artifact_s3_uri.rstrip("/")  # remove trailing slash for cloudfront caching.
    return dataset_artifact_s3_uri


def get_data_adaptor(dataset_artifact_s3_uri: str) -> DataLoader:
    return DataLoader(location=dataset_artifact_s3_uri, app_config=current_app.app_config).validate_and_open()
