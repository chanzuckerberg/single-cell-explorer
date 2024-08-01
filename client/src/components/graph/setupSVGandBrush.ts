import * as d3 from "d3";
import Lasso, { LassoFunctionWithAttributes } from "./setupLasso";
import { sidePanelAttributeNameChange } from "./util";

/******************************************
*******************************************
          put svg & brush in DOM
*******************************************
******************************************/
export function setupBrush({
  handleStartAction,
  handleDragAction,
  handleEndAction,
  viewport,
}: {
  selectionToolType: "brush";
  handleStartAction: () => void;
  handleDragAction: () => void;
  handleEndAction: () => void;
  handleCancelAction: undefined;
  viewport: { width: number; height: number };
}): {
  svg?: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
  container?: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
  tool?: d3.BrushBehavior<unknown>;
} {
  const svg: d3.Selection<SVGGElement, unknown, HTMLElement, any> = d3
    .select("#graph-wrapper")
    .select("#lasso-layer");
  if (svg.empty()) {
    return {};
  }
  const brush = d3
    .brush()
    .extent([
      [0, 0],
      [viewport.width, viewport.height],
    ])
    .on("start", handleStartAction)
    .on("brush", handleDragAction)
    // FYI, brush doesn't generate cancel
    .on("end", handleEndAction);

  const brushContainer = svg
    .append("g")
    .attr("class", "graph_brush")
    .call(brush);

  return { svg, container: brushContainer, tool: brush };
}

export function setupLasso({
  handleStartAction,
  handleEndAction,
  handleCancelAction,
  isSidePanel,
}: {
  selectionToolType: "lasso";
  handleStartAction: () => void;
  handleEndAction: (polygon: [number, number][]) => void;
  handleCancelAction: () => void;
  isSidePanel: boolean;
}): {
  svg?: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
  container?: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
  tool?: LassoFunctionWithAttributes;
} {
  const svg: d3.Selection<SVGGElement, unknown, HTMLElement, any> = d3
    .select(sidePanelAttributeNameChange("#graph-wrapper", isSidePanel))
    .select(sidePanelAttributeNameChange("#lasso-layer", isSidePanel));
  if (svg.empty()) {
    return {};
  }
  const lasso = Lasso()
    .on("end", handleEndAction)
    // FYI, Lasso doesn't generate drag
    .on("start", handleStartAction)
    .on("cancel", handleCancelAction);

  const lassoContainer = svg.call(lasso, isSidePanel);

  return { svg, container: lassoContainer, tool: lasso };
}
