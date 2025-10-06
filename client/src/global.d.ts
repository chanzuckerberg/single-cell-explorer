import { Viewer, Options } from "openseadragon";

/**
 * We use v4, but the types are for v3. This is a temporary workaround.
 * https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/openseadragon
 */
declare module "openseadragon" {
  interface Viewer {
    scalebar: (options: ScalebarOptions) => void;
  }

  interface ScalebarOptions {
    type?: string;
    pixelsPerMeter?: number;
    minWidth?: string;
    yOffset?: number;
    xOffset?: number;
    location?: string;
    color?: string;
    fontColor?: string;
    backgroundColor?: string;
    barThickness?: number;
  }

  const ScalebarType: {
    MICROSCOPY: string;
    MAP: string;
  };

  const ScalebarLocation: {
    BOTTOM_LEFT: string;
    BOTTOM_RIGHT: string;
  };
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
    hbspt: HubSpotFormAPI.HubSpot;
  }
}

declare module "@tanstack/react-query";
