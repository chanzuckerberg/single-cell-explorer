import * as d3 from "d3";
import { Colors } from "@blueprintjs/core";
import { sidePanelAttributeNameChange } from "./util";

type LassoFunction = (
  svg: d3.Selection<SVGGElement, unknown, HTMLElement, any>
) => void;

export type LassoFunctionWithAttributes = LassoFunction & {
  move: (polygon: [number, number][]) => void;
  reset: () => void;
  on: (
    type: string,
    callback: (polygon: [number, number][]) => void | (() => void)
  ) => LassoFunctionWithAttributes;
};

const Lasso = () => {
  const dispatch = d3.dispatch("start", "end", "cancel");

  // (seve): I really can't seem to correctly type this function with dynamic attributes
  const lasso: LassoFunctionWithAttributes = <LassoFunctionWithAttributes>((
    svg,
    isSidePanel = false
  ) => {
    const svgNode = svg.node()!;
    let lassoPolygon: [number, number][] | null;
    let lassoPath: d3.Selection<SVGPathElement, any, any, any> | null;
    let closePath: d3.Selection<SVGLineElement, any, any, any> | null;
    let lassoInProgress: boolean;

    const polygonToPath = (polygon: number[][]) =>
      `M${polygon.map((d) => d.join(",")).join("L")}`;

    const distance = (pt1: [number, number], pt2: [number, number]) =>
      Math.sqrt((pt2[0] - pt1[0]) ** 2 + (pt2[1] - pt1[1]) ** 2);

    // distance last point has to be to first point before it auto closes when mouse is released
    const closeDistance = 75;
    const lassoPathColor = Colors.BLUE5;

    const handleDragStart = () => {
      const point = d3.mouse(svgNode);
      lassoPolygon = [point]; // current x y of mouse within element

      if (lassoPath) {
        // If the existing path is in progress
        if (lassoInProgress) {
          // cancel the existing lasso
          handleCancel();
          // Don't continue with current drag start
          return;
        }

        lassoPath.remove();
      }
      // We're starting a new drag
      lassoInProgress = true;

      lassoPath = g
        .append("path")
        .attr(
          "data-testid",
          sidePanelAttributeNameChange("lasso-element", isSidePanel)
        )
        .attr("fill-opacity", 0.1)
        .attr("stroke-dasharray", "3, 3");

      closePath = g
        .append("line")
        .attr("x2", lassoPolygon[0][0])
        .attr("y2", lassoPolygon[0][1])
        .attr("stroke-dasharray", "3, 3");

      dispatch.call("start", lasso, lassoPolygon);
    };

    const handleDrag = () => {
      if (!(lassoPath && closePath && lassoPolygon)) return;
      const point = d3.mouse(svgNode);
      lassoPolygon.push(point);
      lassoPath.attr("d", polygonToPath(lassoPolygon));

      // indicate if we are within closing distance
      if (
        distance(lassoPolygon[0], lassoPolygon[lassoPolygon.length - 1]) <
        closeDistance
      ) {
        const closePathColor = Colors.GREEN5;
        closePath
          .attr("x1", point[0])
          .attr("y1", point[1])
          .attr("opacity", 1)
          .attr("stroke", closePathColor)
          .attr("fill", closePathColor);
        lassoPath.attr("stroke", closePathColor).attr("fill", closePathColor);
      } else {
        closePath.attr("opacity", 0);
        lassoPath.attr("stroke", lassoPathColor).attr("fill", lassoPathColor);
      }
    };

    const handleCancel = () => {
      if (!(lassoPath && lassoPolygon)) return;
      lassoPath.remove();
      if (closePath) closePath = closePath?.remove();
      lassoPath = null;
      lassoPolygon = null;
      closePath = null;
      dispatch.call("cancel");
    };

    const handleDragEnd = () => {
      if (!(lassoPath && closePath && lassoPolygon)) return;
      // remove the close path
      closePath.remove();
      closePath = null;

      // successfully closed
      if (
        distance(lassoPolygon[0], lassoPolygon[lassoPolygon.length - 1]) <
        closeDistance
      ) {
        lassoInProgress = false;

        lassoPath.attr("d", `${polygonToPath(lassoPolygon)}Z`);
        dispatch.call("end", lasso, lassoPolygon);

        // otherwise cancel
      } else {
        handleCancel();
      }
    };

    // append a <g> with a rect
    const g = svg
      .append("g")
      .attr("class", sidePanelAttributeNameChange("lasso-group", isSidePanel));
    const bbox = svgNode.getBoundingClientRect();
    const area = g
      .append("rect")
      .attr("width", bbox.width)
      .attr("height", bbox.height)
      .attr("opacity", 0);
    const drag = d3
      .drag<SVGRectElement, any, any>()
      .on("start", handleDragStart)
      .on("drag", handleDrag)
      .on("end", handleDragEnd);

    area.call(drag);

    lasso.reset = () => {
      if (lassoPath) {
        lassoPath.remove();
        lassoPath = null;
      }
      lassoPolygon = null;
      if (closePath) {
        closePath.remove();
        closePath = null;
      }
    };

    lasso.move = (polygon: [number, number][]) => {
      if (polygon !== lassoPolygon || polygon.length !== lassoPolygon?.length) {
        lasso.reset();
        lassoPolygon = polygon;
        lassoPath = g
          .append("path")
          .attr(
            "data-testid",
            sidePanelAttributeNameChange("lasso-element", isSidePanel)
          )
          .attr("fill", lassoPathColor)
          .attr("fill-opacity", 0.1)
          .attr("stroke", lassoPathColor)
          .attr("stroke-dasharray", "3, 3");
        if (!lassoPath) return;
        lassoPath.attr("d", `${polygonToPath(lassoPolygon)}Z`);
      }
    };
  });
  lasso.on = (
    type: string,
    callback: (polygon: [number, number][]) => void | (() => void)
  ) => {
    dispatch.on(type, callback);
    return lasso;
  };

  return lasso;
};

export default Lasso;
