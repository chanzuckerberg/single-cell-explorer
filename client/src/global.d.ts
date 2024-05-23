import { Point, Viewer, Options } from "openseadragon";

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
  openseadragon.Point = Point;

  export default openseadragon;
}
