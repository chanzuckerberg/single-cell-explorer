import styled from "@emotion/styled";
import { gray300 } from "../../theme";

interface InfoPanelWrapperProps {
  isHidden: boolean;
  isMinimized: boolean;
}

export const InfoPanelWrapper = styled.div<InfoPanelWrapperProps>`
  display: flex;
  flex-direction: row;
  width: 100%;
  visibility: ${(props) => (props.isHidden ? "hidden" : "visible")};
  overflow: hidden;
  position: ${(props) => (props.isMinimized ? "absolute" : "relative")};
  bottom: ${(props) => (props.isMinimized ? "0" : "auto")};
  height: ${(props) => (props.isMinimized ? "40px" : "50%")};
`;

export const InfoPanelContent = styled.div<InfoPanelWrapperProps>`
  width: 100%;
  padding-top: 30px;
  position: relative;
  overflow-y: auto;
  min-height: ${(props) => (props.isMinimized ? "0" : "50%")};
`;

export const InfoPanelHeader = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  border-top: 1px solid ${gray300};
  border-bottom: 1px solid ${gray300};
  padding: 17px 0px 8px 10px;
  height: 35px;
  position: absolute;
  background: white;
  z-index: 1;
`;

export const CollapseToggle = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  width: 50px;
  padding: 0px 0px 7px 20px;
  cursor: pointer;
`;
