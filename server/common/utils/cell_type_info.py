from typing import Dict, List, TypedDict, cast

import requests

from server.common.constants import CELLGUIDE_BASE_URL


class CellTypeMetadata(TypedDict, total=False):
    name: str
    id: str
    clDescription: str
    synonyms: List[str]


class CellDescription(TypedDict):
    description: str
    references: List[str]


def get_latest_snapshot_identifier() -> str:
    response = requests.get(url=f"{CELLGUIDE_BASE_URL}/latest_snapshot_identifier")
    response.raise_for_status()
    return response.text.strip()


def get_celltype_metadata(snapshot_identifier: str) -> Dict[str, CellTypeMetadata]:
    response = requests.get(url=f"{CELLGUIDE_BASE_URL}/{snapshot_identifier}/celltype_metadata.json")
    response.raise_for_status()
    return cast(Dict[str, CellTypeMetadata], response.json())


def get_cell_description(cell_id: str) -> CellDescription:
    response = requests.get(url=f"{CELLGUIDE_BASE_URL}/validated_descriptions/{cell_id}.json")
    response.raise_for_status()
    return cast(CellDescription, response.json())
