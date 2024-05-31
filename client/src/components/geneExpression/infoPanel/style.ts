import styled from "@emotion/styled";
import { fontBodyXs } from "czifui";

export const InfoPanelWrapper = styled.div`
  padding-top: 300px;
  display: flex;
  flex-direction: column;
  width: 100%;
  div {
    &.hidden {
      visibility: hidden;
    }
  }
`;

export const InfoPanelContent = styled.div`
  width: 100%;
`;

export const InfoPanelHeader = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  border-top: 1px solid #ccc;
  border-bottom: 1px solid #ccc;
  padding: 10px 0px 5px 10px;
  height: 30px;
`;

export const InfoPanelTabs = styled.div`
  display: flex;
  flex-direction: row;
  width: 200px;
  justify-content: space-between;
  ${fontBodyXs}
  font-weight: 600;
  color: #767676;
  div {
    &.active {
      color: black;
      border-bottom: 3px solid #0073ff;
    }
  }
`;

export const CollapseToggle = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  width: 50px;
  padding: 0px 0px 0px 20px;
  cursor: pointer;
`;
