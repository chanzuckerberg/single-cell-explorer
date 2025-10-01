import React, { FC } from "react";
import { DialogTitle, Button, Icon } from "@czi-sds/components";
import { FEATURE_CARDS } from "./constants";
import {
  StyledDialog,
  StyledDialogContent,
  FeatureCardsContainer,
  FeatureCard,
  FeatureIconWrapper,
  FeatureContentWrapper,
  FeatureTitle,
  FeatureDescription,
  FeatureButtonContainer,
  ModalFooter,
  StyledIcon,
} from "./style";

interface Props {
  open: boolean;
  onClose: () => void;
}

const BYODModal: FC<Props> = ({ open, onClose }) => (
  <StyledDialog open={open} onClose={onClose} sdsSize="l">
    <DialogTitle
      title="Explore Single Cell data on the Platform — no code needed."
      onClose={onClose}
    />
    <StyledDialogContent>
      <FeatureCardsContainer>
        {FEATURE_CARDS.map(card => (
          <FeatureCard key={card.title}>
            <FeatureIconWrapper>
              <Icon sdsIcon={card.icon} sdsSize="l" sdsType="static" />
            </FeatureIconWrapper>
            <FeatureContentWrapper>
              <FeatureTitle>{card.title}</FeatureTitle>
              <FeatureDescription>{card.description}</FeatureDescription>
              <FeatureButtonContainer>
                <Button sdsType="secondary" sdsStyle="rounded">
                  {card.buttonText}
                </Button>
              </FeatureButtonContainer>
            </FeatureContentWrapper>
          </FeatureCard>
        ))}
      </FeatureCardsContainer>

      <ModalFooter>
        <Button
          sdsType="primary"
          sdsStyle="square"
          href="https://virtualcellmodels.cziscience.com/byod"
        >
          Explore on Platform
          <StyledIcon>
            <Icon sdsIcon="Open" sdsSize="s" sdsType="static" />
          </StyledIcon>
        </Button>
      </ModalFooter>
    </StyledDialogContent>
  </StyledDialog>
);

export default BYODModal;
