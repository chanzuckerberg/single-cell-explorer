import { Viewer, Options } from "openseadragon";

declare module "*.svg" {
  const content: string;
  export default content;
}

/**
 * We use v4, but the types are for v3. This is a temporary workaround.
 * https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/openseadragon
 */
declare module "openseadragon" {
  function openseadragon(options: Options): Viewer;

  export default openseadragon;
}

namespace HubSpotFormAPI {
  /**
   * HubSpot form creation options.
   * https://legacydocs.hubspot.com/docs/methods/forms/advanced_form_options
   */
  export interface CreateFormOptions {
    region: string;
    portalId: string;
    formId: string;
    target?: string;
  }

  export interface HubSpotForm {
    create(options: CreateFormOptions): void;
  }
  export interface HubSpot {
    forms: HubSpotForm;
  }
}

declare global {
  interface Window {
    hbspt: HubSpotFormAPI.HubSpot; // Or provide a more specific type if you know it
  }
}
