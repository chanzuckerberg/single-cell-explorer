import styled from "@emotion/styled";
import * as globals from "../../globals";

export const LeftSidebarWrapper = styled.div`
  border-right: 1px solid ${globals.lightGrey};
  display: flex;
  flex-direction: column;
  height: 100%;
`;

export const LeftSidebarContainer = styled.div`
  height: 100%;
  width: ${globals.leftSidebarWidth};
  overflow-y: auto;
`;
