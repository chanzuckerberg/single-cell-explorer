import { Viewer, Options } from "openseadragon";

declare module "*.svg" {
  const content: string;
  export default content;
}

/**
 * We use v4, but the types are for v3. This is a temporary workaround.
 * https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/openseadragon
 */ declare module "openseadragon" {
  interface Viewer {
    scalebar: (options: ScalebarOptions) => void;
  }

  interface ScalebarOptions {
    type?: string;
    pixelsPerMeter?: number;
    minWidth?: string;
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
