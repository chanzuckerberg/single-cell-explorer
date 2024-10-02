import { track } from "analytics";
import { EVENTS } from "analytics/events";
import {
  FAILED_EMAIL_VALIDATION_STRING,
  FORM_CONTAINER_ID_QUERY,
  NEWSLETTER_SIGNUP_FAILURE_MESSAGE,
  NEWSLETTER_SIGNUP_SUCCESS_MESSAGE,
} from "components/BottomBanner/constants";
import { useEffect, useRef, useState } from "react";

export function useConnect() {
  const [newsletterModalIsOpen, setNewsletterModalIsOpen] = useState(false);
  const [isHubSpotReady, setIsHubSpotReady] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [emailValidationError, setError] = useState("");

  /**
   * For analytics if submit button was made enabled by user input
   */
  const [submitButtonEnabledOnce, setSubmitButtonEnabledOnce] = useState(false);

  const emailRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.hsforms.net/forms/v2.js";
    script.async = true;

    script.onload = () => {
      setIsHubSpotReady(true);
    };

    document.body.appendChild(script);

    /**
     * Observer to observe changes in the Hubspot embedded form,
     * which is hidden from the user in order to use our own form view
     */
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        /**
         * Loop through all added nodes that were detected
         */
        for (let i = 0; i < mutation.addedNodes.length; i += 1) {
          const node = mutation.addedNodes.item(i);

          /**
           *  Submission success flow
           */
          if (node?.textContent?.includes(NEWSLETTER_SIGNUP_SUCCESS_MESSAGE)) {
            setIsSubmitted(true);
            setError("");

            track(EVENTS.NEWSLETTER_SIGNUP_SUCCESS);
          } else if (
            /**
             * Hubspot email validation failure flow
             */
            node?.textContent?.includes(NEWSLETTER_SIGNUP_FAILURE_MESSAGE)
          ) {
            /**
             * HTML email validation may pass, but may not pass validation for Hubspot
             */
            setError(FAILED_EMAIL_VALIDATION_STRING);
            track(EVENTS.NEWSLETTER_SIGNUP_FAILURE);
          }
        }
      }
    });

    if (isHubSpotReady) {
      window.hbspt?.forms.create({
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

  function toggleNewsletterSignupModal() {
    if (!newsletterModalIsOpen) {
      track(EVENTS.NEWSLETTER_OPEN_MODAL_CLICKED);
    }
    setError("");
    setEmail("");
    setNewsletterModalIsOpen((prevValue) => !prevValue);
  }

  function validateEmail() {
    const validityState = emailRef?.current?.validity;
    if (validityState?.valueMissing || validityState?.typeMismatch) {
      setError(FAILED_EMAIL_VALIDATION_STRING);
      track(EVENTS.NEWSLETTER_SIGNUP_FAILURE);
      return false;
    }
    setError("");
    return true;
  }

  const handleSubmit = (event: React.FormEvent) => {
    track(EVENTS.NEWSLETTER_EMAIL_SUBMITTED);

    event.preventDefault();
    const isValid = validateEmail();
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

  return {
    newsletterModalIsOpen,
    isHubSpotReady,
    isSubmitted,
    email,
    emailRef,
    emailValidationError,
    toggleNewsletterSignupModal,
    setIsHubSpotReady,
    handleSubmit,
    submitButtonEnabledOnce,
    setSubmitButtonEnabledOnce,
    setError,
    setEmail,
  };
}
