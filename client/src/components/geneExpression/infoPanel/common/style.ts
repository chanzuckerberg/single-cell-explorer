import styled from "@emotion/styled";
import {
  fontBodyXs,
  getFontWeights,
  fontBodyS,
  getColors,
  fontHeaderL,
  fontHeaderM,
} from "czifui";
import { Icon } from "@blueprintjs/core";

import * as globals from "../../../../globals";
import * as styles from "../../util";
import { gray100, gray500, spacesM } from "../../../theme";

export const InfoWrapper = styled.div`
  display: flex;
  bottom: ${globals.bottomToolbarGutter}px;
  left: ${globals.leftSidebarWidth + globals.scatterplotMarginLeft}px;
`;

export const InfoContainer = styled.div`
  width: ${styles.width + styles.margin.left + styles.margin.right}px;
  height: "50%";
`;

export const InfoDiv = styled.div`
  margin: ${spacesM}px;
`;

export const InfoSymbol = styled.h1`
  color: black;
  ${fontHeaderL}
  ${(props) => {
    const fontWeights = getFontWeights(props);

    return `
        font-weight: ${fontWeights?.semibold};
        `;
  }}
`;

export const Content = styled.div`
  font-weight: 500;
  color: black;
  ${fontBodyXs}
  display: "-webkit_box";
  -webkit-line-clamp: 7;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export const SynHeader = styled.span`
  ${fontBodyXs}
  ${(props) => {
    const colors = getColors(props);
    const fontWeights = getFontWeights(props);

    return `
        color: ${colors?.gray[500]};
        font-weight: ${fontWeights?.regular};
        `;
  }}
`;

export const Synonyms = styled.span`
  padding: 4px;
  color: black;

  ${fontBodyXs}
  ${(props) => {
    const fontWeights = getFontWeights(props);

    return `
        font-weight: ${fontWeights?.regular};
        `;
  }}
`;

export const Link = styled.a`
  font-weight: 500;
  ${fontBodyS}
  ${(props) => {
    const colors = getColors(props);

    return `
        color: ${colors?.primary[400]};
        `;
  }}
`;

export const WarningBanner = styled.div`
  padding: 8px;
  display: flex;
  align-items: center;
  span {
    margin-left: 10px;
  }
  ${fontBodyXs}
  ${(props) => {
    const colors = getColors(props);
    return `
        background-color: ${colors?.warning[100]};
        svg {
          fill: ${colors?.warning[400]}
        }
        `;
  }}
`;

export const NoGeneSelectedDiv = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: ${gray100};
  padding: 20px;
  border-radius: 3px;
`;

export const MessageDiv = styled.div`
  ${fontBodyXs}
  font-weight: 400;
  color: ${gray500};
  padding: 10px;
  &.title {
    color: black;
    ${fontHeaderM}
    font-weight: 700;
  }
`;

export const CustomIcon = styled(Icon)`
  && {
    color: ${gray500};
  }
`;
