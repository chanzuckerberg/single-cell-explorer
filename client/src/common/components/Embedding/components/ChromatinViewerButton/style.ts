import { CommonThemeProps } from "@czi-sds/components";
import styled from "@emotion/styled";
import { primary400 } from "util/theme";

interface ChromatinIconContainerProps extends CommonThemeProps {
  active: boolean;
}

export const ChromatinIconContainer = styled.div<ChromatinIconContainerProps>`
  .bp5-icon svg {
    color: ${(props) => (props.active ? primary400 : "unset")};
  }
`;
