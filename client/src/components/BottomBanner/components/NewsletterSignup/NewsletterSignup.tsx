import React from "react";
import { Button } from "@blueprintjs/core";
import { FORM_CONTAINER_ID } from "components/BottomBanner/constants";
import cellxgeneLogoSvg from "assets/img/CellxGene.svg";
import { track } from "analytics";
import { EVENTS } from "analytics/events";
import {
  HeaderContainer,
  HiddenHubspotForm,
  NewsletterModal,
  StyledDescription,
  StyledDisclaimer,
  StyledErrorMessage,
  StyledForm,
  StyledInputText,
  StyledSubmitButton,
  StyledTitle,
} from "./style";
import { useConnect } from "../../connect";

export function NewsletterSignup({
  isOpen,
  toggleModal,
}: {
  isOpen: boolean;
  toggleModal: () => void;
}) {
  const {
    isSubmitted,
    email,
    emailValidationError,
    handleSubmit,
    emailRef,
    setError,
    setSubmitButtonEnabledOnce,
    submitButtonEnabledOnce,
    setEmail,
  } = useConnect();

  return (
    <>
      <HiddenHubspotForm id={FORM_CONTAINER_ID} />
      <NewsletterModal isOpen={isOpen} title="" onClose={() => toggleModal()}>
        <>
          <HeaderContainer>
            <img alt="CELLxGENE Logo" src={cellxgeneLogoSvg} />
            <Button
              minimal
              onClick={() => toggleModal()}
              data-testid="newsletter-modal-close-button"
            >
              x
            </Button>
          </HeaderContainer>
          <div data-testid="newsletter-modal-content">
            <StyledTitle>Join Our Newsletter</StyledTitle>

            <StyledDescription>
              {isSubmitted
                ? "Thanks for subscribing!"
                : "Get a quarterly email with the latest CELLxGENE features and data."}
            </StyledDescription>

            <StyledForm onSubmit={handleSubmit} noValidate>
              {!isSubmitted && (
                <>
                  <StyledInputText
                    intent={emailValidationError ? "error" : "default"}
                    inputRef={emailRef}
                    placeholder="Enter email address"
                    label="Email"
                    hideLabel
                    onChange={(event) => {
                      if (emailValidationError) setError("");

                      if (!submitButtonEnabledOnce) {
                        setSubmitButtonEnabledOnce(true);
                        track(EVENTS.NEWSLETTER_SUBSCRIBE_BUTTON_AVAILABLE);
                      }

                      setEmail(event.target.value);
                    }}
                    id="email-input"
                    value={email}
                    required
                    type="email"
                    inputProps={{ "data-testid": "newsletter-email-input" }}
                  />
                  <StyledSubmitButton
                    type="submit"
                    color="primary"
                    name="subscribe"
                    disabled={!email}
                    data-testid="newsletter-subscribe-button"
                  >
                    Subscribe
                  </StyledSubmitButton>
                </>
              )}
            </StyledForm>

            <StyledErrorMessage data-testid="newsletter-validation-error-message">
              {emailValidationError}
            </StyledErrorMessage>

            <StyledDisclaimer>
              {isSubmitted
                ? 'To unsubscribe, click on the "Unsubscribe" link at the bottom of the newsletter.'
                : "Unsubscribe at any time."}
            </StyledDisclaimer>
          </div>
        </>
      </NewsletterModal>
    </>
  );
}
