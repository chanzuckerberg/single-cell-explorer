import styled from "@emotion/styled";
import { spacesS } from "../theme";
import { getFeatureFlag } from "../../util/featureFlags/featureFlags";
import { FEATURES } from "../../util/featureFlags/features";

export const fullVerticalScreenWidth = 500;
const isTest = getFeatureFlag(FEATURES.TEST);
const isDownload = getFeatureFlag(FEATURES.DOWNLOAD);

let firstBreakpoint = "655px";
if (isTest && isDownload) {
  firstBreakpoint = "705px";
} else if (isTest || isDownload) {
  firstBreakpoint = "685px";
}

export const MenuBarWrapper = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  width: 100%;
  position: relative;
  container: menu-bar / inline-size;
`;

export const ResponsiveMenuGroupOne = styled.div`
  display: flex;
  flex-direction: row-reverse;
  flex-wrap: wrap;
  justify-content: right;
  @container menu-bar (max-width: ${fullVerticalScreenWidth}px) {
    flex-direction: column-reverse;
    position: absolute;
    top: 37px;
  }
`;

export const ResponsiveMenuGroupTwo = styled.div`
  display: flex;
  flex-direction: row-reverse;
  flex-wrap: wrap;
  justify-content: right;
  @container menu-bar (max-width: ${firstBreakpoint}) {
    flex-direction: column-reverse;
    position: absolute;
    top: 40px;
  }
  @container menu-bar (max-width: ${fullVerticalScreenWidth}px) {
    top: 172px;
  }
`;

export const EmbeddingWrapper = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: left;
  margin-top: ${spacesS}px;
`;

export const ControlsWrapper = styled.div`
  display: flex;
  flex-direction: row-reverse;
  flex-wrap: wrap;
  justify-content: right;
  align-items: flex-start;
  position: relative;
  @container menu-bar (max-width: ${fullVerticalScreenWidth}px) {
    flex-direction: column-reverse;
    align-items: flex-end;
    position: absolute;
    right: 0px;
  }
`;
