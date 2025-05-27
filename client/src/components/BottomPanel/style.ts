import styled from "@emotion/styled";
import { Button } from "@blueprintjs/core";
import { gray300 } from "util/theme";
import * as globals from "../../globals";

interface BottomPanelWrapperProps {
  isHidden: boolean;
}

export const BottomPanelWrapper = styled.div<BottomPanelWrapperProps>`
  border-top: 1px solid ${globals.lightGrey};
  background-color: white;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;
  visibility: ${(props) => (props.isHidden ? "hidden" : "visible")};
`;

export const BottomPanelButton = styled(Button)`
  cursor: pointer;
  border: 1px solid ${gray300} !important;
  border-radius: 4px;
  background-color: transparent;

  &:hover {
    background-color: ${globals.lightGrey};
  }
`;

export const BottomPanelHeader = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding: 16px;
`;

export const BottomPanelHeaderTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  margin: 0;
`;

export const BottomPanelHeaderActions = styled.div`
  align-items: center;
  display: flex;
  gap: 8px;
`;
