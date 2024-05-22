import { mat3 } from "gl-matrix";
import { toPng } from "html-to-image";
import { LayoutChoiceState } from "../../reducers/layoutChoice";

export async function captureLegend(
  colors: any,
  ctx: CanvasRenderingContext2D | null,
  PADDING: number,
  categoricalLegendImageURI: string | null
) {
  if (colors.colorMode !== null) {
    if (colors.colorMode !== "color by categorical metadata") {
      const legendNodes =
        document.getElementById("continuous_legend")?.childNodes;
      legendNodes?.forEach((node) => {
        if (node.nodeName === "CANVAS") {
          // get style from node
          const style = window.getComputedStyle(node as HTMLCanvasElement);
          const nodeWidth = parseInt(style.width, 10);
          const nodeHeight = parseInt(style.height, 10);
          const nodeLeft = parseInt(style.left, 10);
          const nodeTop = parseInt(style.top, 10);
          ctx?.drawImage(
            node as HTMLCanvasElement,
            PADDING + nodeLeft,
            PADDING + nodeTop,
            nodeWidth,
            nodeHeight
          );
        } else if (node.nodeName === "svg" || node.nodeName === "SVG") {
          const svgNode = node as SVGSVGElement;
          const xml = new XMLSerializer().serializeToString(svgNode);
          const encoder = new TextEncoder();
          const data = encoder.encode(xml);
          const svg64 = btoa(
            String.fromCharCode.apply(null, data as unknown as number[])
          );
          const b64Start = "data:image/svg+xml;base64,";
          const image64 = b64Start + svg64;
          const img = new Image();
          img.onload = () => {
            ctx?.drawImage(img, PADDING, PADDING);
          };
          img.src = image64;
        }
      });
    } else {
      const categoryName = colors.colorAccessor;
      // get category by data-testid attribute
      const categoryExpandNode = document.querySelector(
        `[data-testid='${categoryName}:category-expand']`
      ) as HTMLElement;

      const categoryAndValues = document.querySelector(
        `[data-testid='category-${categoryName}']`
      ) as HTMLElement;
      if (categoryAndValues === null)
        throw new Error(
          `Could not find category ${categoryName} in the legend`
        );

      // check if category is expanded by checking children for data-testid "category-expand-is-expanded"
      const isCategoryExpanded = categoryExpandNode?.querySelector(
        "[data-testid='category-expand-is-expanded']"
      );

      if (!isCategoryExpanded) {
        // click on node to expand category
        categoryExpandNode?.click();
      }

      categoricalLegendImageURI = await toPng(categoryAndValues, {
        backgroundColor: "white",
        // the library is having issues with loading bp3 icons, its checking `/static/static/images` for some reason
        skipFonts: true,
        filter: (filterNode: HTMLElement) =>
          !filterNode.classList?.contains("ignore-capture"),
      });
    }

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 25);
    });
  }
  return categoricalLegendImageURI;
}
/*
Simple 2D transforms control all point painting.  There are three:
  * model - convert from underlying per-point coordinate to a layout.
    Currently used to move from data to webgl coordinate system.
  * camera - apply a 2D camera transformation (pan, zoom)
  * projection - apply any transformation required for screen size and layout
*/
export function createProjectionTF({
  viewportWidth,
  viewportHeight,
  isSpatialMode,
}: {
  viewportWidth: number;
  viewportHeight: number;
  isSpatialMode: boolean;
}) {
  /**
   * the projection transform accounts for the screen size & other layout
   * (thuang): For spatial mode, we want to use the full screen width and height,
   * so the openseadragon layer can align with the canvas layer properly.
   */
  const fractionToUse = isSpatialMode ? 1 : 0.95; // fraction of min dimension to use
  const topGutterSizePx = isSpatialMode ? 0 : 32; // top gutter for tools
  const bottomGutterSizePx = isSpatialMode ? 0 : 32; // bottom gutter for tools
  const heightMinusGutter =
    viewportHeight - topGutterSizePx - bottomGutterSizePx;

  const minDim = Math.min(viewportWidth, heightMinusGutter);

  const aspectScale = new Float32Array([
    (fractionToUse * minDim) / viewportWidth,
    (fractionToUse * minDim) / viewportHeight,
  ]);

  const m = mat3.create();

  mat3.fromTranslation(m, [
    0,
    (bottomGutterSizePx - topGutterSizePx) / viewportHeight / aspectScale[1],
  ]);

  mat3.scale(m, m, aspectScale);

  return m;
}

export function createModelTF() {
  /*
  preallocate coordinate system transformation between data and gl.
  Data arrives in a [0,1] range, and we operate elsewhere in [-1,1].
  */
  const m = mat3.fromScaling(mat3.create(), [2, 2]);
  mat3.translate(m, m, [-0.5, -0.5]);
  return m;
}

export function getSpatialPrefixUrl(s3URI: string) {
  const url = getSpatialUrl(s3URI);

  return `${url}spatial_files/`;
}

export function getSpatialTileSources(s3URI: string) {
  const url = getSpatialUrl(s3URI);

  return `${url}spatial.dzi`;
}

function getSpatialUrl(s3URI: string) {
  const datasetVersionId = getDatasetVersionId(s3URI);

  const { hostname } = window.location;

  // TODO(thuang): Take rdev into account

  if (hostname.includes("dev")) {
    return `https://cellxgene.dev.single-cell.czi.technology/spatial-deep-zoom/${datasetVersionId}/`;
  }

  if (hostname.includes("staging")) {
    return `https://cellxgene.staging.single-cell.czi.technology/spatial-deep-zoom/${datasetVersionId}/`;
  }

  if (hostname.includes("prod")) {
    return `https://cellxgene.cziscience.com/spatial-deep-zoom/${datasetVersionId}/`;
  }

  return `http://localhost:5005/d/${datasetVersionId}.cxg/static/deep_zoom/`;
}

function getDatasetVersionId(s3URI: string) {
  return s3URI.split("/").at(-1)?.split(".cxg")[0];
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
}

export function downloadImage(
  imageURI: string,
  layoutChoice?: LayoutChoiceState
): void {
  const a = document.createElement("a");
  a.href = imageURI;
  a.download = layoutChoice
    ? `CELLxGENE_${layoutChoice.current.split(";;").at(-1)}_emb.png`
    : "CELLxGENE_legend.png";
  a.style.display = "none";
  document.body.append(a);
  a.click();
  // Revoke the blob URL and remove the element.
  setTimeout(() => {
    URL.revokeObjectURL(imageURI);
    a.remove();
  }, 1000);
}
