from http import HTTPStatus
from flask import make_response, jsonify

from server import __version__ as cellxgene_version
from server.common.utils.data_locator import DataLocator
import warnings

def _is_accessible(path, config):
    if path is None:
        return True

    try:
        warnings.warn("IS_ACCESSIBLE CHECK")
        warnings.warn(config.data_locator__s3__region_name)
        warnings.warn(path)
        dl = DataLocator(path, region_name=config.data_locator__s3__region_name)
        return dl.exists()
    except RuntimeError:
        return False


def health_check(config):
    """
    simple health check - return HTTP response.
    See https://tools.ietf.org/id/draft-inadarei-api-health-check-01.html
    """
    health = {"status": None, "version": "1", "releaseID": cellxgene_version}

    checks = True
    server_config = config.server_config
    warnings.warn("HEALTH CHECK")
    warnings.warn(str(server_config))
    if config.is_multi_dataset():
        dataroots = [datapath_dict["dataroot"] for datapath_dict in server_config.multi_dataset__dataroot.values()]
        warnings.warn("IS_MULTI_DATASET")
        warnings.warn(str(dataroots))
        checks = all([_is_accessible(dataroot, server_config) for dataroot in dataroots])
        warnings.warn(str(checks))
    else:
        warnings.warn("IS NOT MULTI DATASET")
        checks = _is_accessible(server_config.single_dataset__datapath, server_config)
        warnings.warn(str(checks))

    health["status"] = "pass" if checks else "fail"
    code = HTTPStatus.OK if health["status"] == "pass" else HTTPStatus.BAD_REQUEST
    warnings.warn(str(code))
    response = make_response(jsonify(health), code)
    response.headers["Content-Type"] = "application/health+json"
    return response
