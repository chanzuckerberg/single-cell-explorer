// If a globally shared type or interface doesn't have a clear owner, put it here

/**
 * Flags informing garbage collection-related logic.
 */
export interface GCHints {
  isHot: boolean;
}

export interface DataPortalProps {
  version: {
    corpora_schema_version: string;
    corpora_encoding_version: string;
  };
  title: string;
  contributors: { name: string; institution: string }[];
  layer_descriptions: { X: string };
  organism: string;
  organism_ontology_term_id: string;
  project_name: string;
  project_description: string;
  project_links: { link_name: string; link_type: string; link_url: string }[];
  default_embedding: string;
  preprint_doi: string;
  publication_doi: string;
  schema_version: string;
}
