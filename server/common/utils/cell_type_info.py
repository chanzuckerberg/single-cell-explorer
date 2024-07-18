import requests

from server.common.constants import CELLGUIDE_BASE_URL


def get_latest_snapshot_identifier() -> str:
    response = requests.get(url=f"{CELLGUIDE_BASE_URL}/latest_snapshot_identifier")
    response.raise_for_status()
    return response.text.strip()


def get_celltype_metadata(snapshot_identifier: str) -> dict:
    response = requests.get(url=f"{CELLGUIDE_BASE_URL}/{snapshot_identifier}/celltype_metadata.json")
    response.raise_for_status()
    return response.json()


def get_cell_description(cell_id: str) -> dict:
    response = requests.get(url=f"{CELLGUIDE_BASE_URL}/validated_descriptions/{cell_id}.json")
    response.raise_for_status()
    return response.json()
