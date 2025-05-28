import { InputDropdown } from "@czi-sds/components";
import styled from "@emotion/styled";
import { grey500 } from "util/theme";

export const CellTypeInputDropdown = styled(InputDropdown)`
  position: absolute;
  margin-left: -8px;
  .styled-label {
    color: ${grey500} !important;
    font-weight: 500;
  }
`;
