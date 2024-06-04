import styled from "@emotion/styled";
import { fontBodyXs } from "czifui";
import { AnchorButton } from "@blueprintjs/core";
<<<<<<< HEAD
import { gray300 } from "../../theme";
=======
>>>>>>> 238db020 (done all but tests)

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
  height: ${(props) => (props.isMinimized ? "40px" : "auto")};
`;

export const InfoPanelContent = styled.div<InfoPanelWrapperProps>`
  width: 100%;
  padding: 30px 0px 0px 0px;
  position: relative;
  overflow-y: auto;
  max-height: ${(props) => (props.isMinimized ? "0" : "400px")};
`;

export const InfoPanelHeader = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  border-top: 1px solid ${gray300};
  border-bottom: 1px solid ${gray300};
  padding: 10px 0px 5px 10px;
  height: 38px;
  position: absolute;
  background: white;
  z-index: 1;
`;

export const StyledAnchorButton = styled(AnchorButton)`
  ${fontBodyXs}
  color: #ccc;

  &.active {
    font-weight: 600;
    color: black;
    border-bottom: 3px solid #0073ff;
    border-radius: 0px;
  }
`;

export const InfoPanelTabs = styled.div`
  display: flex;
  flex-direction: row;
  width: 200px;
  justify-content: space-between;
`;

export const CollapseToggle = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  width: 50px;
  padding: 0px 0px 0px 20px;
  cursor: pointer;
`;
