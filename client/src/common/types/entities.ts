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
 Type and location of a related resource.
 */
export interface Link {
  link_name: string;
  link_type: string;
  link_url: string;
}
