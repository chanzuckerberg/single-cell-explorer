import logging
from typing import List

from pythonjsonlogger import jsonlogger

from server.app.request_id import RequestIdFilter
from server.common.config.app_config import AppConfig


def format_log_string(fields: List[str]) -> str:
    return " ".join([f"%({field})" for field in fields])


LOGGED_FIELDS = ["levelname", "asctime", "name", "message", "lineno", "pathname", "request_id"]
LOG_FORMAT = format_log_string(LOGGED_FIELDS)


DATETIME_FORMAT = "%Y-%m-%dT%H:%M:%S.%03dZ"


def configure_logging(app_config: AppConfig):
    logHandler = logging.StreamHandler()
    formatter = jsonlogger.JsonFormatter(fmt=LOG_FORMAT, datefmt=DATETIME_FORMAT)
    logHandler.setFormatter(formatter)
    logHandler.addFilter(RequestIdFilter())
    log_level = logging.INFO if not app_config.server__app__verbose else logging.ERROR
    logging.basicConfig(level=log_level, handlers=[logHandler], force=True)
    logging.getLogger("werkzeug").setLevel(log_level)
    logging.info(f"{log_level=}")
