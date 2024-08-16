import styled from "@emotion/styled";
import {
  fontBodyXs,
  fontBodyS,
  fontHeaderL,
  fontHeaderM,
} from "@czi-sds/components";
import { Icon } from "@blueprintjs/core";

import * as globals from "../../../../globals";
import * as styles from "../../util";
import {
  fontWeightRegular,
  fontWeightSemibold,
  gray100,
  gray500,
  primary400,
  spacesM,
  warning100,
  warning400,
} from "../../../theme";

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

export const InfoOpenIn = styled.div`
  padding-top: 15px;
`;

export const InfoSymbol = styled.h1`
  width: 60%;
  text-overflow: ellipsis;
  color: black;
  ${fontHeaderL}
  font-weight: ${fontWeightSemibold};
`;

export const InfoTitle = styled.div`
  display: flex;
  justify-content: space-between;
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

export const ContentRow = styled.p`
  padding-bottom: 4px;
`;

export const InfoLabel = styled.span`
  ${fontBodyXs}
  color: ${gray500};
  font-weight: ${fontWeightRegular};
`;

export const Items = styled.span`
  padding: 4px;
  color: black;
  ${fontBodyXs}
  font-weight: ${fontWeightRegular};
`;

export const Link = styled.a`
  font-weight: 500;
  ${fontBodyS}
  color: ${primary400};
`;

export const WarningBanner = styled.div`
  padding: 8px;
  display: flex;
  align-items: center;
  span {
    margin-left: 10px;
  }
  ${fontBodyXs}
  background-color: ${warning100};
  svg {
    fill: ${warning400};
  }
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

  padding: 10px;
  &.title {
    color: black;
    ${fontHeaderM}
    font-weight: 700;
  }
  color: ${gray500};
`;

export const CustomIcon = styled(Icon)`
  color: ${gray500};
`;
