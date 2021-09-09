/*
Helper functions for querying, binding and sorting Portal dataset meta and collections.
*/

/* app dependencies */
import * as globals from "../../globals";
import { DatasetIdentification } from "../../globals";

/**
 * Populate config dataset identification with default values on local. This is temporary until #47 is resolved.
 * TODO(cc) remove once #47 is resolved.
 */
export function bindDatasetIdentification(
  datasetIdentification: DatasetIdentification
): DatasetIdentification {
  if (globals.API.local) {
    return {
      collection_id: "787d970b-7da8-452a-9048-2caae8cbff50",
      collection_visibility: "PRIVATE",
      dataset_id: "8dc18651-eaae-42f3-ab2b-b6d09bbbecea",
    };
  }
  return datasetIdentification;
}

export function createAPIPrefix(
  existingPrefix: string,
  replaceWithPrefix: string
): string {
  /*
    When selecting a dataset from the dataset selector, the globals API prefix value must be updated to match the selected
    dataset's deployment URL. For example, update protocol://origin/dataRoot/current-dataset.cxg/api/v2 to
    protocol://origin/dataRoot/selected-dataset.cxg/api/v2.
    TODO(cc) revisit updating globals API prefix locally, possibly move to back end?
     */
  const newDataRootAndDeploymentId =
    bindDataRootAndDeploymentId(replaceWithPrefix);
  return existingPrefix.replace(
    /([a-z0-9_.-]+\/[a-z0-9_.-]+\.cxg)/i,
    newDataRootAndDeploymentId
  );
}

export function createDatasetUrl(deploymentUrl: string): string {
  /*
    Switch out dataset URL origin to the current location's origin. For local environments, also replace the
    data root of the given URL to /d/. For example, update protocol://origin/dataRoot/dataset.cxg to
    protocol://origin/d/dataset.cxg.
    TODO(cc) revisit special handling for canary and local environments.
     */
  const dataRoot = globals.API.local ? "d" : bindDataRoot(deploymentUrl);
  const deploymentId = bindDeploymentId(deploymentUrl);
  return `${window.location.origin}/${dataRoot}/${deploymentId}/`;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
export function sortDatasets(vm0: any, vm1: any): number {
  /*
    Sort datasets by cell count, descending.
     */
  return (vm1.cell_count ?? 0) - (vm0.cell_count ?? 0);
}

function bindDataRoot(pathOrUrl: string): string {
  /*
    read dataroot from path. given "protocol://hostname/x/any-alpha-numeric.cxg/", match on "/x/",
    read data root from path. given "protocol://origin/x/any-alpha-numeric.cxg/", match on "/x/",
    group on "x".
     */
  const matches = pathOrUrl.match(/\/([a-z0-9_.-]+)\/[a-z0-9_.-]+\.cxg\//i);
  if (!matches || matches.length < 2) {
    // Expecting at least match and one capturing group
    throw new Error(`Unable to bind data root from "${pathOrUrl}"`);
  }
  return matches[1];
}

function bindDataRootAndDeploymentId(pathOrUrl: string): string {
  /*
    Read data root and deployment ID from path. Given "protocol://origin/x/any-alpha-numeric.cxg/", match on
    "/x/any-alpha-numeric.cxg/", group on "x/any-alpha-numeric.cxg".
     */
  const matches = pathOrUrl.match(/\/([a-z0-9_.-]+\/[a-z0-9_.-]+\.cxg)\//i);
  if (!matches || matches.length < 2) {
    if (globals.API.local) {
      return "e/792d29b8-83d4-4e6e-b3ce-cad060d1a23b.cxg"; // TODO(cc) default data root and deployment ID for local (single mode)
    }
    // Expecting at least match and one capturing group
    throw new Error(
      `Unable to bind data root and deployment ID from "${pathOrUrl}"`
    );
  }
  return matches[1];
}

function bindDeploymentId(pathOrUrl: string): string {
  /*
    read name of cxg from path. given "protocol://origin/x/any-alpha-numeric.cxg/", match on "/any-alpha-numeric.cxg/",
    group on "any-alpha-numeric.cxg".
     */
  const matches = pathOrUrl.match(/\/([a-z0-9_.-]*\.cxg)\//i);
  if (!matches || matches.length < 2) {
    if (globals.API.local) {
      return "792d29b8-83d4-4e6e-b3ce-cad060d1a23b.cxg"; // TODO(cc) default dataset for local (single mode)
    }
    // Expecting at least match and one capturing group
    throw new Error(`Unable to bind deployment ID from "${pathOrUrl}"`);
  }
  return matches[1];
}
