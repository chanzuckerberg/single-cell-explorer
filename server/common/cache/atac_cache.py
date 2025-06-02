import json
from functools import lru_cache

from server.common.utils.data_locator import DataLocator

GENE_DATA_CACHE = {}

CYTOBAND_DATA_CACHE = {}


@lru_cache(maxsize=4)
def preload_gene_data(atac_base_uri: str, genome_versions=("hg38", "mm39")):

    for version in genome_versions:
        uri = f"{atac_base_uri}/gene_data_{version}.json"
        dl = DataLocator(uri)
        try:
            with dl.open("r") as f:
                GENE_DATA_CACHE[version] = json.load(f)
        except Exception as e:
            raise RuntimeError(f"Failed to load gene data for {version}: {e}") from e


@lru_cache(maxsize=4)
def preload_cytoband_data(atac_base_uri: str, genome_versions=("hg38", "mm39")):

    for version in genome_versions:
        uri = f"{atac_base_uri}/cytoband_{version}.json"
        dl = DataLocator(uri)
        try:
            with dl.open("r") as f:
                CYTOBAND_DATA_CACHE[version] = json.load(f)
        except Exception as e:
            raise RuntimeError(f"Failed to load cytoband data for {version}: {e}") from e
