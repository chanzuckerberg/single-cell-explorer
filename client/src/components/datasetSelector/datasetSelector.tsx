/* Core dependencies */
import { Icon } from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import React, { FC, useRef } from "react";
import { connect } from "react-redux";

/* App dependencies */
import { openDataset, switchDataset } from "../../actions";
import { DatasetMetadata, Dataset } from "../../common/types/entities";
import DatasetMenu from "./datasetMenu";
import { AppDispatch, RootState } from "../../reducers";
import { selectIsUserStateDirty } from "../../selectors/global";
import { selectIsSeamlessEnabled } from "../../selectors/datasetMetadata";
import TruncatingBreadcrumb from "./truncatingBreadcrumb";
import TruncatingBreadcrumbs, {
  TruncatingBreadcrumbMenuItemProps,
  TruncatingBreadcrumbMenuProps,
  TruncatingBreadcrumbProps,
} from "./truncatingBreadcrumbs";

/* styles */
// @ts-expect-error --- TODO revisit
import styles from "./datasetSelector.css";

/*
 Actions dispatched by dataset selector.
 */
interface DispatchProps {
  openDataset: (dataset: Dataset) => void;
  switchDataset: (dataset: Dataset) => void;
}

/*
 Props selected from store.
 */
interface StateProps {
  datasetMetadata: DatasetMetadata;
  portalUrl: string;
  seamlessEnabled: boolean;
  workInProgress: boolean;
}

type Props = StateProps & DispatchProps;

/*
 Map slice selected from store to props.
 */
const mapStateToProps = (state: RootState): StateProps => ({
  datasetMetadata: state.datasetMetadata?.datasetMetadata,
  portalUrl: state.datasetMetadata?.portalUrl,
  seamlessEnabled: selectIsSeamlessEnabled(state),
  workInProgress: selectIsUserStateDirty(state),
});

/*
 Map actions dispatched by dataset selector to props.
 */
const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
  openDataset: (dataset: Dataset) => dispatch(openDataset(dataset)),
  switchDataset: (dataset: Dataset) => dispatch(switchDataset(dataset)),
});

/*
 App-level collection and dataset breadcrumbs.
 */
const DatasetSelector: FC<Props> = ({
  datasetMetadata,
  openDataset: openFn,
  portalUrl,
  seamlessEnabled,
  switchDataset: switchFn,
  workInProgress,
}) => {
  const wip = useRef<boolean>(workInProgress);
  wip.current = workInProgress;

  if (!seamlessEnabled) {
    return null;
  }
  return (
    <div
      style={{
        marginTop: "8px", // Match margin on sibling menu buttons
        flexGrow: 1,
        overflow: "scroll",
        flex: 1,
      }}
    >
      <TruncatingBreadcrumbs
        breadcrumbRenderer={renderBreadcrumb}
        currentBreadcrumbRenderer={renderCurrentBreadcrumb}
        items={[
          buildHomeBreadcrumbProps(portalUrl),
          buildCollectionBreadcrumbProps(datasetMetadata),
          buildDatasetBreadcrumbProps(
            datasetMetadata,
            wip.current,
            switchFn,
            openFn
          ),
        ]}
      />
    </div>
  );
};

/*
 Props shared by all breadcrumbs.
 */
const defaultBreadcrumbProps: Partial<TruncatingBreadcrumbProps> = {
  className: styles.datasetBreadcrumb,
};

/*
 Returns the action dispatched when a new dataset is selected.
 Action dispatched is one of the following:
 - when datasets are to be switched in the current tab.
 - when selected dataset is to be opened in a new tab.
 @param selectedDataset - selected dataset to be viewed.
 @param workInProgress - Flag indicating if user has applied changes to visualization.
 @param switchFn - Action dispatched when datasets are to be switched in the current tab.
 @param openFn - Action dispatched when selected dataset is to be opened in a new tab.
 */
function onDatasetSelected(
  selectedDataset: Dataset,
  workInProgress: boolean,
  switchFn: (dataset: Dataset) => void,
  openFn: (dataset: Dataset) => void
) {
  if (workInProgress) {
    openFn(selectedDataset);
  } else {
    switchFn(selectedDataset);
  }
}

/*
 Determine if given props are props for a menu item.
 @param {TruncatingBreadcrumbProps} props
 @returns True if props are TruncatingBreadcrumbMenuProps.
 */
function isBreadcrumbMenu(
  props: TruncatingBreadcrumbProps
): props is TruncatingBreadcrumbMenuProps {
  return "items" in props;
}

/*
 Sort datasets by cell count, descending.
 @param d0 - First dataset to compare.
 @param d1 - Second dataset to compare.
 @returns Number indicating if first dataset is greater than, less than or equal to second dataset.
 */
function sortDatasets(d0: Dataset, d1: Dataset): number {
  return (d1.cell_count ?? 0) - (d0.cell_count ?? 0);
}

/*
 Build menu items representing datasets that are siblings of the selected dataset.
 @param datasetMetadata - Dataset metadata containing selected dataset.
 @param selectedDatasetID - ID dataset currently being viewed.
 @param workInProgress - Flag indicating if user has applied changes to visualization.
 @param switchFn - Action dispatched when datasets are to be switched in the current tab.
 @param openFn - Action dispatched when selected dataset is to be opened in a new tab.
 @returns Returns set of menu items each representing sibling dataset of the current selected dataset.
*/
function buildDatasetMenuItems(
  datasetMetadata: DatasetMetadata,
  selectedDatasetID: string,
  workInProgress: boolean,
  switchFn: (dataset: Dataset) => void,
  openFn: (dataset: Dataset) => void
): TruncatingBreadcrumbMenuItemProps[] {
  return (
    [...datasetMetadata.collection_datasets]
      // Remove current dataset from the set of datasets
      .filter((dataset) => dataset.id !== selectedDatasetID)
      .sort(sortDatasets)
      // Build props for rendering dataset as menu item
      .map((dataset) => ({
        key: dataset.id,
        text: dataset.name,
        onClick: () =>
          onDatasetSelected(dataset, workInProgress, switchFn, openFn),
      }))
  );
}

/*
 Find the selected dataset from the set of datasets.
 @param selectedDatasetId - The ID of the dataset currently being viewed
 @param datasets - All datasets in the selected dataset's collection
 @returns The dataset with the given selected ID.
*/
function findDatasetById(
  selectedDatasetId: string,
  datasets: Dataset[]
): Dataset | undefined {
  return datasets.find((dataset) => dataset.id === selectedDatasetId);
}

/*
 Build "dataset" breadcrumb props for displaying a breadcrumb with a menu.
 @param datasetMetadata - Dataset metadata containing selected dataset.
 @param workInProgress - Flag indicating if user has applied changes to visualization.
 @param switchFn - Action dispatched when datasets are to be switched in the current tab.
 @param openFn - Action dispatched when selected dataset is to be opened in a new tab.
 @returns Returns breadcrumbs props for rendering the "dataset" breadcrumb.
*/
function buildDatasetBreadcrumbProps(
  datasetMetadata: DatasetMetadata,
  workInProgress: boolean,
  switchFn: (dataset: Dataset) => void,
  openFn: (dataset: Dataset) => void
): TruncatingBreadcrumbMenuProps {
  const { dataset_id: selectedDatasetId } = datasetMetadata;
  const selectedDataset = findDatasetById(
    selectedDatasetId,
    datasetMetadata.collection_datasets
  );
  const datasetMenuItems = buildDatasetMenuItems(
    datasetMetadata,
    selectedDatasetId,
    workInProgress,
    switchFn,
    openFn
  );
  const unique = datasetMenuItems.length === 0;
  return {
    ...defaultBreadcrumbProps,
    disabled: unique,
    icon: unique ? null : (
      <Icon
        icon={IconNames.CHEVRON_DOWN}
        style={{ marginLeft: "5px", marginRight: 0 }}
      />
    ),
    items: datasetMenuItems,
    key: `bc-dataset-${selectedDatasetId}`,
    shortText: "Dataset",
    text: selectedDataset ? selectedDataset.name : "Dataset",
  };
}

/*
 Build "collection" breadcrumb props, links to Portal's collection detail page.
 @param datasetMetadata - Dataset metadata containing collection information.
 @returns Returns breadcrumbs props for rendering the "collection" breadcrumb.
*/
function buildCollectionBreadcrumbProps(
  datasetMetadata: DatasetMetadata
): TruncatingBreadcrumbProps {
  return {
    ...defaultBreadcrumbProps,
    href: datasetMetadata.collection_url,
    key: `bc-collection`,
    shortText: "Collection",
    text: datasetMetadata.collection_name,
  };
}

/*
 Build "home" breadcrumb props, links to Portal's collection index page.
 @param portalUrl - URL to Portal's collection index page.
 @returns Returns breadcrumbs props for rendering the "home" breadcrumb.
*/
function buildHomeBreadcrumbProps(
  portalUrl: string
): TruncatingBreadcrumbProps {
  return {
    ...defaultBreadcrumbProps,
    href: portalUrl,
    key: "bc-home",
    shortText: "Home",
    text: "Home",
  };
}

/*
 Build Blueprint Breadcrumb element, adding menu-specific styles and elements if necessary.
 @param item - Breadcrumb props to be rendered as a breadcrumb element.
 @returns Breadcrumb element generated from given breadcrumb props.
*/
function renderBreadcrumb(item: TruncatingBreadcrumbProps): JSX.Element {
  return (
    <TruncatingBreadcrumb item={item}>
      {item.icon ? item.icon : null}
    </TruncatingBreadcrumb>
  );
}

/*
 Clicking on dataset name opens menu containing all dataset names except the current dataset name for the current
 collection.
 @param item - Breadcrumb props to be rendered as a breadcrumb element with menu.
 @returns DatasetMenu element generated from given breadcrumb props.
*/
function renderBreadcrumbMenu(
  item: TruncatingBreadcrumbMenuProps
): JSX.Element {
  return <DatasetMenu items={item.items}>{renderBreadcrumb(item)}</DatasetMenu>;
}

/*
 Renders the final dataset breadcrumb where sibling datasets are selectable by a breadcrumb menu.
 @param props - Breadcrumb props to be rendered as a breadcrumb element with menu.
 @returns If dataset has siblings, returns breadcrumb menu element generated from given breadcrumb props. Otherwise
 returns disabled breadcrumb element.
 */
function renderCurrentBreadcrumb(
  props: TruncatingBreadcrumbProps
): JSX.Element {
  return isBreadcrumbMenu(props)
    ? renderBreadcrumbMenu(props)
    : renderBreadcrumb(props);
}

export default connect(mapStateToProps, mapDispatchToProps)(DatasetSelector);
