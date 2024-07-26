import styled from "@emotion/styled";
import { spacesS } from "../theme";
import { getFeatureFlag } from "../../util/featureFlags/featureFlags";
import { FEATURES } from "../../util/featureFlags/features";

export const fullVerticalScreenWidth = "1275px";
const isTest = getFeatureFlag(FEATURES.TEST);
const isDownload = getFeatureFlag(FEATURES.DOWNLOAD);

let firstBreakpoint = "1400px";
if (isTest && isDownload) {
  firstBreakpoint = "1455px";
} else if (isTest || isDownload) {
  firstBreakpoint = "1430px";
}

export const MenuBarWrapper = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  width: 100%;
  position: relative;
`;

export const ResponsiveMenuGroupOne = styled.div`
  display: flex;
  flex-direction: row-reverse;
  flex-wrap: wrap;
  justify-content: right;
  @media screen and (max-width: ${fullVerticalScreenWidth}) {
    flex-direction: column-reverse;
  }
`;

export const ResponsiveMenuGroupTwo = styled.div`
  display: flex;
  flex-direction: row-reverse;
  flex-wrap: wrap;
  justify-content: right;
  @media screen and (max-width: ${firstBreakpoint}) {
    flex-direction: column-reverse;
    position: absolute;
    top: 40px;
  }
  @media screen and (max-width: ${fullVerticalScreenWidth}) {
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
  @media screen and (max-width: ${fullVerticalScreenWidth}) {
    flex-direction: column-reverse;
    align-items: flex-end;
    position: absolute;
    right: 0px;
  }
`;
