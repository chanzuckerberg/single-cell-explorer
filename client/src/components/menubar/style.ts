import styled from "@emotion/styled";
import { spacesS } from "../theme";
import { getFeatureFlag } from "../../util/featureFlags/featureFlags";
import { FEATURES } from "../../util/featureFlags/features";

export const MAX_VERTICAL_THRESHOLD_WIDTH_PX = 500;
const isTest = getFeatureFlag(FEATURES.TEST);

const FIRST_VERTICAL_THRESHOLD_WIDTH_PX = isTest ? 705 : 685;

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
  @container menu-bar (max-width: ${MAX_VERTICAL_THRESHOLD_WIDTH_PX}px) {
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
  @container menu-bar (max-width: ${FIRST_VERTICAL_THRESHOLD_WIDTH_PX}px) {
    flex-direction: column-reverse;
    position: absolute;
    top: 40px;
  }
  @container menu-bar (max-width: ${MAX_VERTICAL_THRESHOLD_WIDTH_PX}px) {
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
  @container menu-bar (max-width: ${MAX_VERTICAL_THRESHOLD_WIDTH_PX}px) {
    flex-direction: column-reverse;
    align-items: flex-end;
    position: absolute;
    right: 0px;
  }
`;
