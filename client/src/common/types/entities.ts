// If a globally shared type or interface doesn't have a clear owner, put it here

/*
 Set of datasets and corresponding meta.
 */
export interface Collection {
  contact_email: string;
  contact_name: string;
  datasets: Dataset[];
  description: string;
  id: string;
  links: Link[];
  name: string;
}

/*
 Corpora encoding and schema versioning.
 */
interface CorporaVersion {
  corpora_encoding_version: string;
  corpora_schema_version: string;
}

/*
 Basic dataset model.
 */
export interface Dataset {
  id: string;
  cell_count: number;
  dataset_deployments: DatasetDeployment[];
  name: string;
}

/*
 Deployment location of dataset.
 */
export interface DatasetDeployment {
  url: string;
}

/**
 * Flags informing garbage collection-related logic.
 */
export interface GCHints {
  isHot: boolean;
}

/*
 Rough Data Portal values returned in config.
 */
export interface DataPortalProps {
  version: CorporaVersion;
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

/*
 Type and location of a related resource.
 */
export interface Link {
  link_name: string;
  link_type: string;
  link_url: string;
}
