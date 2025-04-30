import styled from "@emotion/styled";
import * as globals from "../../globals";

export const BottomSidebarWrapper = styled.div`
  border-top: 1px solid ${globals.lightGrey};
  background-color: white;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;
`;

export const BottomSidebarContainer = styled.div`
  height: 200px;
  width: 100%;
`;
