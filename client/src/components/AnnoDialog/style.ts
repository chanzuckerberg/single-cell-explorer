import styled from "@emotion/styled";

interface SecondaryTextProps {
  secondaryInstructions: string;
}

export const DialogForm = styled.form`
  margin: 0;
  padding: 0;
`;

export const DialogWrapper = styled.div`
  margin-bottom: 20px;
`;

export const SecondaryText = styled.p<SecondaryTextProps>`
  margin-top: ${(props) => (props.secondaryInstructions ? 20 : 0)};
`;
