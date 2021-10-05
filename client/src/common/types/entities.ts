// If a globally shared type or interface doesn't have a clear owner, put it here

/*
 Collection and dataset information for the selected dataset. 
 */
export interface DatasetMetadata {
  collection_contact_email: string;
  collection_contact_name: string;
  collection_datasets: Dataset[];
  collection_description: string;
  collection_links: Link[];
  collection_name: string;
  collection_url: string;
  dataset_id: string;
  dataset_name: string;
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
