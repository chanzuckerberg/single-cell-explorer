from http import HTTPStatus

from server.common.errors import DatasetAccessError  # type: ignore
from server.common.utils.data_locator import DataLocator


class DataLoader(object):
    def __init__(self, location, app_config=None):  # type: ignore
        """location can be a string or DataLocator"""
        self.app_config = app_config
        self.dataset_config = self.__resolve_dataset_config()  # type: ignore
        region_name = None if app_config is None else app_config.server__data_locator__s3_region_name
        self.location = DataLocator(location, region_name=region_name)  # type: ignore
        if not self.location.exists():  # type: ignore
            raise DatasetAccessError("Dataset does not exist.", HTTPStatus.NOT_FOUND)

        from server.dataset.cxg_dataset import CxgDataset

        self.matrix_type = CxgDataset

    def __resolve_dataset_config(self):  # type: ignore
        dataset_config = self.app_config.default_dataset
        if dataset_config is None:
            raise DatasetAccessError("Missing dataset config", HTTPStatus.NOT_FOUND)
        return dataset_config

    def pre_load_validation(self):  # type: ignore
        self.matrix_type.pre_load_validation(self.location)  # type: ignore

    def file_size(self):  # type: ignore
        return self.matrix_type.file_size(self.location)  # type: ignore

    def open(self):  # type: ignore
        # create and return a DataAdaptor object
        return self.matrix_type.open(self.location, self.app_config)  # type: ignore

    def validate_and_open(self):  # type: ignore
        # create and return a DataAdaptor object
        self.pre_load_validation()  # type: ignore
        return self.open()  # type: ignore
