from enum import Enum

from server.common.utils.data_locator import DataLocator
from server.common.errors import DatasetAccessError
from http import HTTPStatus


class MatrixDataType(Enum):
    CXG = "cxg"
    UNKNOWN = "unknown"


# TODO: rename to DatasetLoader
class MatrixDataLoader(object):
    def __init__(self, location, app_config=None, matrix_data_type=None):
        """location can be a string or DataLocator"""
        self.app_config = app_config
        self.dataset_config = self.__resolve_dataset_config()
        region_name = None if app_config is None else app_config.server__data_locator__s3_region_name
        self.location = DataLocator(location, region_name=region_name)
        if not self.location.exists():
            raise DatasetAccessError("Dataset does not exist.", HTTPStatus.NOT_FOUND)

        self.matrix_data_type = matrix_data_type
        # matrix_type is a DataAdaptor type, which corresponds to the matrix_data_type
        self.matrix_type = None
        if self.matrix_data_type is None:
            self.matrix_data_type = self.__matrix_data_type()

        if not self.__matrix_data_type_allowed(app_config):
            raise DatasetAccessError("Dataset does not have an allowed type.")

        if self.matrix_data_type == MatrixDataType.CXG:
            from server.dataset.cxg_dataset import CxgDataset

            self.matrix_type = CxgDataset

    def __resolve_dataset_config(self):
        dataset_config = self.app_config.config.dataset
        if dataset_config is None:
            raise DatasetAccessError("Missing dataset config", HTTPStatus.NOT_FOUND)
        return dataset_config

    # TODO @mdunitz remove when removing conversion code, also remove server_config.multi_dataset__allowed_matrix_types
    # https://app.zenhub.com/workspaces/single-cell-5e2a191dad828d52cc78b028/issues/chanzuckerberg/corpora-data-portal/1277 # noqa
    def __matrix_data_type(self):
        if ".cxg" in self.location.path:
            return MatrixDataType.CXG
        else:
            return MatrixDataType.UNKNOWN

    def __matrix_data_type_allowed(self, app_config):
        if self.matrix_data_type == MatrixDataType.UNKNOWN:
            return False

        if not app_config:
            return True
        if len(app_config.server__multi_dataset__allowed_matrix_types) == 0:
            return True

        for val in app_config.server__multi_dataset__allowed_matrix_types:
            try:
                if self.matrix_data_type == MatrixDataType(val):
                    return True
            except ValueError:
                # Check case where multi_dataset_allowed_matrix_type does not have a
                # valid MatrixDataType value.  TODO:  Add a feature to check
                # the AppConfig for errors on startup
                return False

        return False

    def pre_load_validation(self):
        if self.matrix_data_type == MatrixDataType.UNKNOWN:
            raise DatasetAccessError("Dataset does not have a recognized type")
        self.matrix_type.pre_load_validation(self.location)

    def file_size(self):
        return self.matrix_type.file_size(self.location)

    def open(self):
        # create and return a DataAdaptor object
        return self.matrix_type.open(self.location, self.app_config)

    def validate_and_open(self):
        # create and return a DataAdaptor object
        self.pre_load_validation()
        return self.open()
