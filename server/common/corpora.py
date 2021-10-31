"""
Corpora schema 1.x conventions support.  Helper functions for reading.

https://github.com/chanzuckerberg/single-cell-curation/blob/main/schema/1.1.0/corpora_schema.md

https://github.com/chanzuckerberg/single-cell-curation/blob/main/schema/1.1.0/anndata_encoding.md
"""
import collections
import json

from server.cli.upgrade import validate_version_str
from server.common.utils.corpora_constants import CorporaConstants


def corpora_get_versions_from_anndata(adata):
    """
    Given an AnnData object, return:
        * None - if not a Corpora object
        * [ corpora_schema_version, corpora_encoding_version ] - if a Corpora object

    Implements the identification protocol defined in the specification.
    """

    # per Corpora AnnData spec, this is a corpora file if the following is true
    if "version" not in adata.uns_keys():
        return None
    version = adata.uns["version"]
    if not isinstance(version, collections.abc.Mapping) or "corpora_schema_version" not in version:
        return None

    corpora_schema_version = version.get("corpora_schema_version")
    corpora_encoding_version = version.get("corpora_encoding_version")

    # TODO: spec says these must be SEMVER values, so check.
    if validate_version_str(corpora_schema_version) and validate_version_str(corpora_encoding_version):
        return [corpora_schema_version, corpora_encoding_version]


def corpora_is_version_supported(corpora_schema_version, corpora_encoding_version):
    return (
        corpora_schema_version
        and corpora_encoding_version
        and corpora_schema_version.startswith("1.")
        and corpora_encoding_version.startswith("0.1.")
    )
