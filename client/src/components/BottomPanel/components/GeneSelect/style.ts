import styled from "@emotion/styled";

export const SelectedGenePrefix = styled.span`
  color: #767676;
  padding-right: 4px;
`;

export const SelectedGeneName = styled.span`
  @media (max-width: 1375px) {
    max-width: 120px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  }
`;
