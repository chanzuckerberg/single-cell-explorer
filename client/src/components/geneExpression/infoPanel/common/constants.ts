export const LOADING_STRING = (entity: string) => `Loading ${entity}...`;
export const NO_ENTITY_SELECTED = (entity: string) => `No ${entity} Selected`;
export const ENTITY_NOT_FOUND = (entity: string) =>
  `Sorry, this ${entity} could not be found.`;
export const OPEN_IN = (entity: string) => `Open in ${entity}`;
export const SELECT_GENE_OR_CELL_TYPE =
  "Select a gene or cell type or search the Cell Guide database";
export const NCBI_WARNING = "NCBI didn't return an exact match for this gene.";
export const SEARCH_ON_GOOGLE = "Search on Google";
export const LABELS = {
  ontologyID: "Ontology ID: ",
  Synonyms: "Synonyms: ",
  References: "References: ",
};

export const CELLGUIDE_URL = "https://cellxgene.cziscience.com/cellguide/";
