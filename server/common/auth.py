"""Utilities for request-scoped authentication and authorization."""

from __future__ import annotations

from http import HTTPStatus
from pathlib import PurePosixPath
from typing import Optional

from flask import has_request_context, request

from server.common.constants import CUSTOM_CXG_KEY_NAME
from server.common.errors import DatasetAccessError


# Headers commonly populated by oauth2-proxy / OIDC front-ends.
_USER_HEADER_CANDIDATES = (
    "X-Auth-Request-Preferred-Username",
    "X-Forwarded-Preferred-Username",
    "X-Auth-Request-User",
    "X-Forwarded-User",
    "X-Auth-Request-Email",
    "X-Forwarded-Email",
)

# Marker for user-scoped custom CXGs (e.g. /w/custom-cxgs/userID-<id>/…)
_USER_SCOPED_MARKER = "userID-"


def _get_authenticated_user_id() -> Optional[str]:
    if not has_request_context():
        return None
    for header in _USER_HEADER_CANDIDATES:
        value = request.headers.get(header)
        if value:
            return value
    return None


def normalize_and_authorize_dataset_id(url_dataroot: str, dataset_id: str) -> str:
    """Return the dataset identifier to use for storage lookups.

    For custom (``/w``) dataroots, requests opting into user-level isolation must
    include the ``userID-`` marker in the path.  When present we: (1) ensure the
    authenticated user matches the marker, (2) normalize the identifier back to
    the underlying S3 layout where the user directory omits the marker, and
    (3) block traversal attempts.
    """

    path = PurePosixPath(dataset_id)
    if ".." in path.parts:
        raise DatasetAccessError("Invalid dataset path", status_code=HTTPStatus.FORBIDDEN)

    if url_dataroot != "w" or not path.parts:
        return dataset_id

    if path.parts[0] != CUSTOM_CXG_KEY_NAME or len(path.parts) < 2:
        return dataset_id

    owner_segment = path.parts[1]
    if not owner_segment.startswith(_USER_SCOPED_MARKER):
        return dataset_id

    user_id = owner_segment[len(_USER_SCOPED_MARKER) :]
    if not user_id:
        raise DatasetAccessError("Missing user identifier", status_code=HTTPStatus.FORBIDDEN)

    request_user = _get_authenticated_user_id()
    if request_user is None:
        if has_request_context():
            raise DatasetAccessError("Authentication required", status_code=HTTPStatus.FORBIDDEN)
    elif request_user != user_id:
        raise DatasetAccessError("Forbidden dataset access", status_code=HTTPStatus.FORBIDDEN)

    normalized_parts = (path.parts[0], user_id, *path.parts[2:])
    return PurePosixPath(*normalized_parts).as_posix()


__all__ = ["normalize_and_authorize_dataset_id"]
