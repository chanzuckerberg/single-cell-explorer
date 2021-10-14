/* Core dependencies */
import { Icon } from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import React, { FC, useEffect, useState } from "react";
import { connect } from "react-redux";

/* App dependencies */
import actions from "../../actions";
import { DatasetMetadata, Dataset } from "../../common/types/entities";
import DatasetMenu, { DatasetSelectedFn } from "./datasetMenu";
import { AppDispatch, RootState } from "../../reducers";
import { selectIsSeamlessEnabled } from "../../selectors/datasetMetadata";
import TruncatingBreadcrumb from "./truncatingBreadcrumb";
import TruncatingBreadcrumbs, {
  TruncatingBreadcrumbProps,
} from "./truncatingBreadcrumbs";

/**
 * Actions dispatched by dataset selector.
 */
interface DispatchProps {
  navigateCheckUserState: NavigateCheckUserState;
  selectDataset: DatasetSelectedFn;
}

/**
 * Function called on click of home and collection links.
 */
export type NavigateCheckUserState = (url: string) => void;

/**
 * Props selected from store.
 */
interface StateProps {
  datasetMetadata: DatasetMetadata;
  portalUrl: string;
  seamlessEnabled: boolean;
}

type Props = StateProps & DispatchProps;

/**
 * Map slice selected from store to props.
 */
const mapStateToProps = (state: RootState): StateProps => ({
  datasetMetadata: state.datasetMetadata?.datasetMetadata,
  portalUrl: state.datasetMetadata?.portalUrl,
  seamlessEnabled: selectIsSeamlessEnabled(state),
});

/**
 * Map actions dispatched by dataset selector to props.
 */
const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
  selectDataset: (dataset: Dataset) => dispatch(actions.selectDataset(dataset)),
  navigateCheckUserState: (url: string) =>
    dispatch(actions.navigateCheckUserState(url)),
});

// Inline styles for icons
const STYLE_ICON = { marginLeft: "5px", marginRight: 0 };

/**
 * App-level collection and dataset breadcrumbs.
 */
const DatasetSelector: FC<Props> = ({
  datasetMetadata,
  portalUrl,
  seamlessEnabled,
  selectDataset: selectDatasetFn,
  navigateCheckUserState: navigateCheckUserStateFn,
}) => {
  // Datasets that are siblings of the selected dataset
  const [siblingDatasets, setSiblingDatasets] = useState<Dataset[]>([]);

  // Set of props used to render truncating breadcrumbs.
  const [items, setItems] = useState<TruncatingBreadcrumbProps[]>([]);

  // Init state on change of props
  useEffect(() => {
    if (!datasetMetadata) return;

    const { collection_datasets: datasets, dataset_id: selectedDatasetId } =
      datasetMetadata;

    // Init the sibling datasets
    setSiblingDatasets(
      datasets?.filter(
        (datasetInCollection) => selectedDatasetId !== datasetInCollection.id
      )
    );

    // Build props backing breadcrumbs
    setItems([
      buildHomeBreadcrumbProps(portalUrl, navigateCheckUserStateFn),
      buildCollectionBreadcrumbProps(datasetMetadata, navigateCheckUserStateFn),
      buildDatasetBreadcrumbProps(
        datasetMetadata.dataset_name,
        isDatasetSingleton(datasets)
      ),
    ]);
  }, [datasetMetadata, portalUrl]);

  // Don't render if seamless features are not available.
  if (!seamlessEnabled) {
    return null;
  }

  /**
   * Renders the final dataset breadcrumb where any sibling datasets are selectable by a breadcrumb menu.
   * @param truncatingBreadcrumbProps - Breadcrumb props backing current breadcrumb.
   * @returns If dataset has siblings, returns breadcrumb menu element generated from given breadcrumb props. Otherwise
   returns disabled breadcrumb element.
   */
  const renderCurrentBreadcrumb = (
    truncatingBreadcrumbProps: TruncatingBreadcrumbProps
  ): JSX.Element => {
    const { collection_datasets: datasets } = datasetMetadata;
    return isDatasetSingleton(datasets)
      ? renderBreadcrumb(truncatingBreadcrumbProps)
      : renderBreadcrumbMenu(
          truncatingBreadcrumbProps,
          siblingDatasets,
          selectDatasetFn
        );
  };

  return (
    <TruncatingBreadcrumbs
      breadcrumbRenderer={renderBreadcrumb}
      currentBreadcrumbRenderer={renderCurrentBreadcrumb}
      items={items}
    />
  );
};

/**
 * Build "dataset" breadcrumb props for displaying a breadcrumb with a menu.
 * @param datasetName - Name of dataset currently being viewed.
 * @param singletonDataset - True if dataset has no siblings.
 * @returns Returns breadcrumbs props for rendering the "dataset" breadcrumb.
 */
function buildDatasetBreadcrumbProps(
  datasetName: string,
  singletonDataset: boolean
): TruncatingBreadcrumbProps {
  return {
    disabled: singletonDataset,
    icon: singletonDataset ? null : (
      <Icon icon={IconNames.CHEVRON_DOWN} style={STYLE_ICON} />
    ),
    shortText: "Dataset",
    text: datasetName,
  };
}

/**
 * Build "collection" breadcrumb props, links to Portal's collection detail page.
 * @param datasetMetadata - Dataset metadata containing collection information.
 * @param navigateCheckUserStateFn - Function called on click of collection breadcrumb.
 * @returns Returns breadcrumbs props for rendering the "collection" breadcrumb.
 */
function buildCollectionBreadcrumbProps(
  datasetMetadata: DatasetMetadata,
  navigateCheckUserStateFn: NavigateCheckUserState
): TruncatingBreadcrumbProps {
  return {
    onClick: () => navigateCheckUserStateFn(datasetMetadata.collection_url),
    shortText: "Collection",
    text: datasetMetadata.collection_name,
  };
}

/**
 * Build "home" breadcrumb props, links to Portal's collection index page.
 * @param portalUrl - URL to Portal's collection index page.
 * @param navigateCheckUserStateFn - Function called on click of home breadcrumb.
 * @returns Returns breadcrumbs props for rendering the "home" breadcrumb.
 */
function buildHomeBreadcrumbProps(
  portalUrl: string,
  navigateCheckUserStateFn: NavigateCheckUserState
): TruncatingBreadcrumbProps {
  return {
    onClick: () => navigateCheckUserStateFn(portalUrl),
    shortText: "Home",
    text: "Home",
  };
}

/**
 * Determine if selected dataset has any sibling datasets.
 * @param datasets - All datasets in the collection of the current dataset.
 * @returns True if is more than one dataset.
 */
function isDatasetSingleton(datasets: Dataset[]): boolean {
  return datasets.length === 1;
}

/**
 * Build Blueprint Breadcrumb element.
 * @param item - Breadcrumb props to be rendered as a breadcrumb element.
 * @returns Breadcrumb element generated from given breadcrumb props.
 */
function renderBreadcrumb(item: TruncatingBreadcrumbProps): JSX.Element {
  return <TruncatingBreadcrumb item={item} />;
}

/**
 * Clicking on dataset name opens menu containing all dataset names except the current dataset name for the current
 * collection.
 * @param item - Breadcrumb props to be rendered as a breadcrumb element with menu.
 * @param siblingDatasets - Datasets in the collection of the current dataset, except the selected dataset itself.
 * @param selectDatasetFn - Function invoked on click of dataset menu item.
 * @returns DatasetMenu element generated from given breadcrumb props and state.
 */
function renderBreadcrumbMenu(
  item: TruncatingBreadcrumbProps,
  siblingDatasets: Dataset[],
  selectDatasetFn: DatasetSelectedFn
): JSX.Element {
  return (
    <DatasetMenu
      datasets={siblingDatasets}
      onDatasetSelected={(dataset: Dataset) => {
        selectDatasetFn(dataset);
      }}
    >
      {renderBreadcrumb(item)}
    </DatasetMenu>
  );
}

export default connect(mapStateToProps, mapDispatchToProps)(DatasetSelector);
