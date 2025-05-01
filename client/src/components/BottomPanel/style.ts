import styled from "@emotion/styled";
import { Button } from "@blueprintjs/core";
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

export const BottomPanelContainer = styled.div`
  height: 200px;
  width: 100%;
`;

export const CloseButton = styled(Button)`
  position: absolute;
  top: 0;
  right: 0;
  background-color: transparent;
  border: none;
  cursor: pointer;
  padding: 10px;
  &:hover {
    background-color: ${globals.lightGrey};
  }
`;
