import styled from "@emotion/styled";
import { Button } from "@blueprintjs/core";
import { Icon } from "@czi-sds/components";
import { gray300 } from "util/theme";
import * as globals from "../../globals";

interface BottomPanelWrapperProps {
  isHidden: boolean;
  isMinimized: boolean;
}

interface BottomPanelHeaderProps {
  isMinimized: boolean;
}

export const BottomPanelWrapper = styled.div<BottomPanelWrapperProps>`
  border-top: ${(props) =>
    props.isMinimized ? "none" : `1px solid ${globals.lightGrey};`};
  box-shadow: ${(props) =>
    props.isMinimized ? `rgba(153, 153, 153, 0.2) 0px 0px 3px 2px;` : "none"};
  background-color: white;
  position: absolute;
  bottom: ${(props) => (props.isMinimized ? "12px" : "0")};
  left: ${(props) => (props.isMinimized ? "12px" : "0")};
  right: ${(props) => (props.isMinimized ? "60%" : 0)};
  z-index: 100;
  visibility: ${(props) => (props.isHidden ? "hidden" : "visible")};
  border-radius: ${(props) => (props.isMinimized ? "3px 3px 0 0" : "0")};
`;

export const BottomPanelButton = styled(Button)`
  cursor: pointer;
  border: 1px solid ${gray300} !important;
  border-radius: 4px;
  background-color: transparent;

  &:hover {
    background-color: ${globals.lightGrey};
  }

  @media (max-width: 1375px) {
    &#add-cell-type-button .bp5-button-text {
      display: none;
    }

    &#add-cell-type-button .bp5-icon {
      margin-right: 0;
    }
  }
`;

export const BottomPanelHeader = styled.div<BottomPanelHeaderProps>`
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding: ${(props) =>
    props.isMinimized ? "9px 10px" : "16px 16px 13px 16px"};
`;

export const BottomPanelHeaderTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  margin: 0;
  position: relative;
  z-index: 2;
`;

export const BottomPanelHeaderActions = styled.div`
  align-items: center;
  display: flex;
  gap: 8px;
`;

export const InfoIcon = styled(Icon)`
  width: 12px;
  height: 12px;
  margin-left: 4px;
  position: relative;
  top: -1px;
`;
