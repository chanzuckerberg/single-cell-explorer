// If a globally shared type or interface doesn't have a clear owner, put it here

/*
 Set of datasets and corresponding meta.
 */
export interface Collection {
  contact_email: string;
  contact_name: string;
  datasets: Dataset[];
  description: string;
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
 Provider (person and institute) of dataset data.
 */
export interface Contributor {
  email: string;
  institution: string;
  name: string;
}

/*
 Data Portal values returned in config.
 */
export interface DataPortalProps {
  contributors: Contributor[];
  organism: string;
  preprint_doi: string;
  project_links: Link[];
  publication_doi: string;
  title: string;
  version?: CorporaVersion;
}

/*
 Basic dataset model.
 */
export interface Dataset {
  id: string;
  name: string;
  dataset_deployments: DatasetDeployment[];
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
 Type and location of a related resource. 
 */
export interface Link {
  link_name: string;
  link_type: string;
  link_url: string;
}
