from flask import current_app

from server.data_common.dataset_metadata import get_dataset_metadata_for_explorer_location
from server.data_common.matrix_loader import MatrixDataLoader


def get_dataset_artifact_s3_uri(url_dataroot: str = None, dataset_id: str = None):
    dataset_artifact_s3_uri = get_dataset_metadata_for_explorer_location(f"{url_dataroot}/{dataset_id}",
                                                                         current_app.app_config)["s3_uri"]
    return dataset_artifact_s3_uri


def get_data_adaptor(dataset_artifact_s3_uri: str, app_config, url_dataroot: str = None):
    return MatrixDataLoader(
            location=dataset_artifact_s3_uri,
            url_dataroot=url_dataroot,
            app_config=app_config
    ).validate_and_open()


