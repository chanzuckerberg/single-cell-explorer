import React, { useEffect, useRef, useState } from "react";
import { Button } from "@blueprintjs/core";
import cellxgeneLogoSvg from "./CellxGene.svg";
import {
  BOTTOM_BANNER_ID,
  NewsletterModal,
  StyledBanner,
  StyledBottomBannerWrapper,
  StyledDescription,
  StyledDisclaimer,
  StyledForm,
  StyledTitle,
  StyledInputText,
  StyledLink,
  StyledSubmitButton,
  HeaderContainer,
  StyledErrorMessage,
  HiddenHubspotForm,
} from "./style";
import { EVENTS } from "../../analytics/events";
import { track } from "../../analytics";

export const FORM_CONTAINER_ID = "hubspot-form-container";
export const FORM_CONTAINER_ID_QUERY = `#${FORM_CONTAINER_ID}`;

export const SUBMIT_ISSUE_URL = "https://airtable.com/shrLwepDSEX1HI6bo";

export const FAILED_EMAIL_VALIDATION_STRING =
  "Please provide a valid email address.";

interface Props {
  includeSurveyLink: boolean;
  setIsBannerOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function BottomBanner({
  includeSurveyLink = false,
  setIsBannerOpen,
}: Props): JSX.Element {
  const [newsletterModalIsOpen, setNewsletterModalIsOpen] = useState(false);
  const [isHubSpotReady, setIsHubSpotReady] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [emailValidationError, setError] = useState("");

  // For analytics if submit button was made enabled by user input
  const [submitButtonEnabledOnce, setSubmitButtonEnabledOnce] = useState(false);

  function toggleNewsletterSignupModal() {
    // Track when modal is opened
    if (!newsletterModalIsOpen) {
      track(EVENTS.NEWSLETTER_OPEN_MODAL_CLICKED);
    }

    setError("");
    setEmail("");
    setNewsletterModalIsOpen(!newsletterModalIsOpen);
  }

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.hsforms.net/forms/v2.js";
    script.async = true;

    script.onload = () => {
      setIsHubSpotReady(true);
    };

    document.body.appendChild(script);

    // Observer to observe changes in the Hubspot embedded form, which is hidden from the user in order to use our own form view
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Loop through all added nodes that were detected
        for (let i = 0; i < mutation.addedNodes.length; i += 1) {
          const node = mutation.addedNodes.item(i);

          // Submission success flow
          if (
            node?.textContent?.includes("Thank you for joining our newsletter.")
          ) {
            setIsSubmitted(true);
            setError("");

            track(EVENTS.NEWSLETTER_SIGNUP_SUCCESS);
          }

          // Hubspot email validation failure flow
          else if (
            node?.textContent?.includes("Please enter a valid email address.")
          ) {
            // HTML email validation may pass, but may not pass validation for Hubspot
            // ex. "ashintest_04252023_invalid_email@contractor.chanzuckerberg" does not validate with Hubspot but does with HTML email validation
            setError(FAILED_EMAIL_VALIDATION_STRING);

            track(EVENTS.NEWSLETTER_SIGNUP_FAILURE);
          }
        }
      }
    });

    if (isHubSpotReady) {
      hbspt.forms.create({
        region: "na1",
        portalId: "7272273",
        formId: "eb65b811-0451-414d-8304-7b9b6f468ce5",
        target: FORM_CONTAINER_ID_QUERY,
      });

      const form = document.querySelector(FORM_CONTAINER_ID_QUERY);
      if (form) {
        observer.observe(form, {
          childList: true,
          subtree: true,
        });
      }
    }

    return () => observer.disconnect();
  }, [isHubSpotReady]);

  const emailRef = useRef<HTMLInputElement | null>(null);

  // Validates if the email is valid or missing
  const validate = () => {
    const validityState = emailRef.current?.validity;
    if (validityState?.valueMissing || validityState?.typeMismatch) {
      setError(FAILED_EMAIL_VALIDATION_STRING);

      track(EVENTS.NEWSLETTER_SIGNUP_FAILURE);

      return false;
    }
    setError(""); // email validation passed, no error
    return true;
  };

  const handleSubmit = (event: React.FormEvent) => {
    track(EVENTS.NEWSLETTER_EMAIL_SUBMITTED);

    event.preventDefault();
    const isValid = validate();
    const form: HTMLFormElement | null = isValid
      ? document.querySelector(`${FORM_CONTAINER_ID_QUERY} form`)
      : null;

    if (!isValid || !form) {
      return;
    }

    const input = form.querySelector("input");
    if (!input) {
      return;
    }

    input.value = email;
    input.dispatchEvent(new Event("input", { bubbles: true }));

    form.submit();
  };

  return (
    <>
      <HiddenHubspotForm id={FORM_CONTAINER_ID} />

      <StyledBottomBannerWrapper
        id={BOTTOM_BANNER_ID}
        data-testid="newsletter-modal-banner-wrapper"
      >
        <StyledBanner
          dismissible
          sdsType="primary"
          onClose={() => {
            setIsBannerOpen(false);
          }}
          text={
            (
              <div>
                <StyledLink
                  onClick={() => {
                    toggleNewsletterSignupModal();
                  }}
                  data-testid="newsletter-modal-open-button"
                >
                  Subscribe
                </StyledLink>{" "}
                to our newsletter to receive updates about new features.{" "}
                {includeSurveyLink && (
                  <>
                    Send us feedback with this{" "}
                    <StyledLink
                      href="https://airtable.com/shrLwepDSEX1HI6bo"
                      target="_blank"
                      rel="noopener"
                    >
                      quick survey
                    </StyledLink>
                    .
                  </>
                )}
              </div>
            ) as unknown as string // For some reason setting the "text" prop overwrites the child, so we have to set the element in the text prop but it only takes a string as the type
          }
        />

        <NewsletterModal
          isOpen={newsletterModalIsOpen}
          title=""
          onClose={() => toggleNewsletterSignupModal()}
        >
          <>
            <HeaderContainer>
              <img alt="CELLxGENE Logo" src={cellxgeneLogoSvg} />
              <Button
                minimal
                onClick={() => toggleNewsletterSignupModal()}
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
                      variant="contained"
                      disableElevation
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
      </StyledBottomBannerWrapper>
    </>
  );
}
