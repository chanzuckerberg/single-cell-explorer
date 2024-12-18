import { Position, OverlayToaster, Intent, Toaster } from "@blueprintjs/core";
import { createRoot } from "react-dom/client";

/* styles */
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module './menubar.css' or its correspo... Remove this comment to see the full error message
import styles from "./toasters.css";

/** Singleton toaster instance. Create separate instances for different options. */
let ToastTopCenter: Toaster | null = null;

/**
 * A future major version of Blueprint will drop support for React versions before
 * 18 and switch the default rendering function from ReactDOM.render to createRoot.
 * https://blueprintjs.com/docs/#core/components/toast.overlaytoaster
 */
if (typeof document !== "undefined") {
  OverlayToaster.createAsync(
    {
      className: "recipe-toaster",
      position: Position.TOP,
      maxToasts: 4,
    },
    {
      domRenderer: (toaster, containerElement) =>
        createRoot(containerElement).render(toaster),
    }
  )
    .then((toaster) => {
      ToastTopCenter = toaster;
    })
    .catch((error) => {
      console.error("Failed to create toaster:", error);
    });
}

/*
A "user" error - eg, bad input
*/
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
export const postUserErrorToast = (message: any) =>
  ToastTopCenter?.show({ message, intent: Intent.WARNING });

/*
A toast the user must dismiss manually, because they need to act on its information,
ie., 8 bulk add genes out of 40 were bad. Manually see which ones and fix.
*/
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
export const keepAroundErrorToast = (message: any) =>
  ToastTopCenter?.show({ message, timeout: 0, intent: Intent.WARNING });

/*
a hard network error
*/
export const postNetworkErrorToast = (
  message: string,
  key: string | undefined = undefined
): string | undefined =>
  ToastTopCenter?.show(
    {
      message,
      timeout: 30000,
      intent: Intent.DANGER,
    },
    key
  );

/*
Async message to user
*/
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
export const postAsyncSuccessToast = (message: any) =>
  ToastTopCenter?.show({
    message,
    timeout: 10000,
    intent: Intent.SUCCESS,
  });

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any -- - FIXME: disabled temporarily on migrate to TS.
export const postAsyncFailureToast = (message: any) =>
  ToastTopCenter?.show({
    message,
    timeout: 10000,
    intent: Intent.WARNING,
  });

/**
 * Dataset opened in new tab.
 * @param message
 * @returns string
 */
export const postExplainNewTab = (message: string): string | undefined =>
  ToastTopCenter?.show({
    className: styles.newTabToast,
    message,
    timeout: 5000,
    intent: Intent.PRIMARY,
  });
