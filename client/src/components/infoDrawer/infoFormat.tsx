// Core dependencies
import { H3, HTMLTable, Classes, Tooltip, Position } from "@blueprintjs/core";
import React, { CSSProperties } from "react";

// App dependencies
import {
  DatasetMetadata,
  Link,
  ONTOLOGY_KEY,
} from "../../common/types/entities";
import { Category } from "../../common/types/schema";

const COLLECTION_LINK_ORDER_BY = [
  "DOI",
  "DATA_SOURCE",
  "RAW_DATA",
  "PROTOCOL",
  "LAB_WEBSITE",
  "OTHER",
];

interface LinkView {
  name: string;
  type: string;
  url: string;
}

interface MetadataView {
  key: string;
  value: string;
  tip?: Category;
}

interface Props {
  datasetMetadata: DatasetMetadata;
  singleValueCategories: SingleValueCategories;
}

export type SingleValueCategories = Map<string, Category>;

/**
 * Sort collection links by custom sort order, create view-friendly model of link types.
 * @returns Array of link objects formatted for display.
 */
const buildCollectionLinks = (links: Link[]): LinkView[] => {
  const sortedLinks = [...links].sort(sortCollectionLinks);
  return sortedLinks.map((link) => {
    const { link_name: name, link_type: type, link_url: url } = link;
    return {
      name: buildLinkName(name, type, url),
      type: transformLinkTypeToDisplay(type),
      url,
    };
  });
};

/**
 * Determine name to display for collection link.
 * @param name - Link display name
 * @param type - Link type (e.g. DOI)
 * @param url - Link URL
 * @returns Pathname if link type is DOI otherwise host.
 */
const buildLinkName = (name: string, type: string, url: string): string => {
  if (name) {
    return name;
  }
  let validUrl;
  try {
    validUrl = new URL(url);
  } catch (e) {
    return url;
  }
  if (type === "DOI") {
    return validUrl.pathname.substring(1);
  }
  return validUrl.host;
};

/**
 * Generate inline styles to be applied to collections and meta tables.
 * @returns Inline style object.
 */
const getTableStyles = (): CSSProperties => ({
  tableLayout: "fixed",
  width: "100%",
});

/**
 * Render collection contact and links.
 * @param datasetMetadata - Dataset metadata containing collection link information to be displayed
 * @returns Markup displaying contact and collection-related links.
 */
const renderCollectionLinks = (
  datasetMetadata: DatasetMetadata
): JSX.Element => {
  const links = buildCollectionLinks(datasetMetadata.collection_links);
  const {
    collection_contact_name: contactName,
    collection_contact_email: contactEmail,
  } = datasetMetadata;
  return (
    <>
      {renderSectionTitle("Collection")}
      <HTMLTable style={getTableStyles()}>
        <tbody>
          <tr>
            <td>Contact</td>
            <td>{renderCollectionContactLink(contactName, contactEmail)}</td>
          </tr>
          {links.map(({ name, type, url }, i) => (
            <tr {...{ key: i }}>
              <td>{type}</td>
              <td>
                <a href={url} rel="noopener" target="_blank">
                  {name}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </HTMLTable>
    </>
  );
};

/**
 * Display collection contact's name with a link to their associated email.
 * @param name - Collection contact's name
 * @param email - Collection contact's email
 * @returns Mailto link if possible otherwise the contact's name.
 */
const renderCollectionContactLink = (
  name: string,
  email: string
): JSX.Element | string | null => {
  if (!name && !email) {
    return null;
  }
  if (email) {
    return <a href={`mailto:${email}`}>{name}</a>;
  }
  return name;
};

/**
 * Render dataset metadata. That is, attributes found in categorical fields.
 * @param singleValueCategories - Attributes from categorical fields
 * @returns Markup for displaying meta in table format.
 */
const renderDatasetMetadata = (
  singleValueCategories: SingleValueCategories
): JSX.Element | null => {
  if (singleValueCategories.size === 0) {
    return null;
  }
  const metadataViews = buildDatasetMetadataViews(singleValueCategories);
  metadataViews.sort(sortDatasetMetadata);
  return (
    <>
      {renderSectionTitle("Dataset")}
      <HTMLTable style={getTableStyles()}>
        <tbody>
          {metadataViews.map(({ key, value, tip }) => (
            <tr {...{ key }}>
              <td>{key}</td>
              <td>
                <Tooltip
                  content={String(tip)}
                  disabled={!tip}
                  minimal
                  modifiers={{ flip: { enabled: false } }}
                  position={Position.TOP}
                >
                  {value}
                </Tooltip>
              </td>
            </tr>
          ))}
        </tbody>
      </HTMLTable>
    </>
  );
};

/**
 * Create DOM elements for displaying section title.
 * @param title - Section title to display
 * @returns Styled markup representation displaying section title.
 */
const renderSectionTitle = (title: string): JSX.Element => (
  <p style={{ margin: "24px 0 8px" }}>
    <strong>{title}</strong>
  </p>
);

/**
 * Compare function for sorting collection links by custom link type order.
 * @param link0 - First link to compare
 * @param link1 - Second link value to compare
 * @returns Number indicating sort precedence of link0 vs link1.
 */
const sortCollectionLinks = (link0: Link, link1: Link): number =>
  COLLECTION_LINK_ORDER_BY.indexOf(link0.link_type) -
  COLLECTION_LINK_ORDER_BY.indexOf(link1.link_type);

/**
 * Compare function for metadata key value pairs by key - alpha, ascending.
 * @param m0 - First metadata value to compare
 * @param m1 - Second metadata value to compare
 * @returns Number indicating sort precedence of m0 vs m1.
 */
const sortDatasetMetadata = (m0: MetadataView, m1: MetadataView) => {
  if (m0.key < m1.key) {
    return -1;
  }
  if (m0.key > m1.key) {
    return 1;
  }
  return 0;
};

/**
 * Convert link type from upper snake case to title case.
 * @param type - Link type to transform.
 * @returns Transformed link type ready for display.
 */
const transformLinkTypeToDisplay = (type: string): string => {
  const tokens = type.split("_");
  return tokens
    .map((token) => token.charAt(0) + token.slice(1).toLowerCase())
    .join(" ");
};

/**
 * Build array of view model objects from given single value categories map, ignoring ontology terms or metadata
 * without values. Add ontology terms as tooltips of their corresponding values.
 * @param singleValueCategories - Attributes from categorical fields
 * @returns  Array of metadata key/value pairs.
 */
const buildDatasetMetadataViews = (
  singleValueCategories: SingleValueCategories
): MetadataView[] =>
  Array.from(singleValueCategories.entries())
    .filter(([key, value]) => {
      if (key.indexOf(ONTOLOGY_KEY) >= 0) {
        // skip ontology terms
        return false;
      }
      // skip metadata without values
      return value;
    })
    .map(([key, value]) => {
      const viewModel: MetadataView = { key, value: String(value) };
      // add ontology term as tool tip if specified
      const tip = singleValueCategories.get(`${key}_${ONTOLOGY_KEY}`);
      if (tip) {
        viewModel.tip = tip;
      }
      return viewModel;
    });

const InfoFormat = React.memo<Props>(
  ({ datasetMetadata, singleValueCategories }) => (
    <div className={Classes.DRAWER_BODY}>
      <div className={Classes.DIALOG_BODY}>
        <H3>{datasetMetadata.collection_name}</H3>
        <p>{datasetMetadata.collection_description}</p>
        {renderCollectionLinks(datasetMetadata)}
        {renderDatasetMetadata(singleValueCategories)}
      </div>
    </div>
  )
);

export default InfoFormat;
