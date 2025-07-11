import cx from "classnames";
import * as d3 from "d3";
import { map } from "lodash/fp";
import cs from "./style.module.scss";
import { CategoricalColormap } from "./CategoricalColormap";
import ArrayUtils, { parseData } from "./ArrayUtils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: this is temporarily disabled
type $TSFixMe = any;

export const HISTOGRAM_SCALE = {
  LINEAR: "linear",
  LOG: "log",
};

const HISTOGRAM_SCALE_FUNCTIONS = {
  [HISTOGRAM_SCALE.LINEAR]: d3.scaleLinear,
  [HISTOGRAM_SCALE.LOG]: d3.scaleLog,
};

const TICK_LINE = ".tick line";
export const FILL_OPACITY = "fill-opacity";
export const FONT_WEIGHT = "font-weight";
export const TEXT_ANCHOR = "text-anchor";
export const TRANSFORM = "transform";
export const TRANSLATE = "translate";

export default class Histogram {
  barCentersToIndices: { [x: number]: [number, number] };

  barWidth: $TSFixMe;

  bins: $TSFixMe;

  container: $TSFixMe;

  data: $TSFixMe;

  g: $TSFixMe;

  lastHoveredBarX: $TSFixMe;

  margins: $TSFixMe;

  options: $TSFixMe;

  size: $TSFixMe;

  sortedBarCenters: $TSFixMe;

  svg: $TSFixMe;

  constructor(container: $TSFixMe, data: $TSFixMe, options: $TSFixMe) {
    this.g = null;
    this.container = d3.select(container);
    this.data = parseData(data);
    this.margins = options.margins || {
      top: 20,
      right: 40,
      bottom: 40,
      left: 20,
    };

    this.options = {
      barOpacity: 0.8,
      colormap: "viridis",
      innerWidth: 800,
      labelsBold: false,
      labelsLarge: false,
      labelX: "",
      labelXVerticalOffset: 10,
      labelY: "",
      labelXSubtext: "",
      labelYHorizontalOffset: 0,
      labelYVerticalOffset: 0,
      seriesNames: null,
      showStatistics: true,
      refValues: [],
      numTicksY: 2,
      // If true, the data is already binned, i.e. the data is an array of
      // { x0, length }
      skipBins: false,
      // If true, don't round domain scales to nice numbers. Currently
      // applied to x domain but can be expanded.
      skipNiceDomains: false,
      // hoverBuffer is used to determine how far away the cursor can be
      // to activate a bar's hover behavior (e.g. coverage viz).
      // If 0, then hover behavior is activated only when the bar itself
      // is directly hovered over (e.g. PLQC histograms).
      hoverBuffer: 5,
      xScaleType: HISTOGRAM_SCALE.LINEAR,
      yScaleType: HISTOGRAM_SCALE.LINEAR,
      lineWidth: 1,
      ...options,
    };

    this.size = {
      innerWidth: this.options.innerWidth,
      width: this.options.innerWidth + this.margins.left + this.margins.right,
      height: this.options.height ?? 80,
    };

    // The x-center of the last bar that was hovered over.
    // Since the histogram can take multiple data series, this is easier to store than [seriesIndex, dataIndex]
    this.lastHoveredBarX = null;
    this.barCentersToIndices = {};

    // remove any previous charts
    this.container.selectAll("svg").remove();

    this.svg = this.container
      .append("svg")
      .attr("width", this.size.width)
      .attr("height", this.size.height)
      .attr("transform", `translate(-${this.margins.left}, 0)`);
  }

  xAxis(g: $TSFixMe, x: $TSFixMe) {
    const axis = this.options.xTickFormat
      ? d3
          .axisBottom(x)
          .tickFormat((d: $TSFixMe) => this.options.xTickFormat(d))
      : d3.axisBottom(x);

    g.attr(
      "transform",
      `translate(0,${this.size.height - this.margins.bottom})`
    ).call(axis.tickSizeOuter(0));

    // if using log10 scale, set the number of ticks according to the size of
    // the domain (in powers of 10) to prevent extra labels from showing up
    if (this.options.xScaleType === HISTOGRAM_SCALE.LOG) {
      const nTicks = Math.log10(x.domain()[1]) + 1;
      g.call(axis.ticks(nTicks));
    }

    if (this.options.xTickValues) {
      g.call(axis.tickValues(this.options.xTickValues));
    }

    g.append("text")
      .attr("x", (this.size.innerWidth + this.margins.left) / 2 - 2)
      .attr("y", 30 + this.options.labelXVerticalOffset)
      .attr("fill", "#000")
      .attr(FONT_WEIGHT, 600)
      .attr(TEXT_ANCHOR, "end")
      .attr(
        "class",
        cx(
          "labelX",
          this.options.labelsLarge && "large",
          this.options.labelsBold && "bold"
        )
      )
      .text(this.options.labelX);

    if (this.options.labelXSubtext) {
      g.append("text")
        .attr("x", this.size.innerWidth / 2)
        .attr("y", 47 + this.options.labelXVerticalOffset)
        .attr(TEXT_ANCHOR, "middle")
        .attr("class", cs.labelXSubtext)
        .text(this.options.labelXSubtext);
    }

    g.select(".domain").attr("class", cs.xAxis);

    g.selectAll(TICK_LINE).attr("class", cs.xAxisTickLine);

    g.selectAll(".tick text").attr("class", cs.xAxisTickText);
  }

  yAxis(g: $TSFixMe, y: $TSFixMe) {
    const axis = this.options.numTicksY
      ? d3.axisLeft(y).ticks(this.options.numTicksY)
      : d3.axisLeft(y);

    if (this.options.yTickFormat) {
      axis.tickFormat(this.options.yTickFormat);
    }

    // Set tick size to 0 to remove tick lines
    axis.tickSize(0);

    if (this.options.yTickFilter) {
      let tickVals = this.options.numTicksY
        ? // TODO: (smccanny) fix these types
          (axis.scale() as d3.ScaleLinear<number, number>).ticks(
            this.options.numTicksY
          )
        : (axis.scale() as d3.ScaleLinear<number, number>).ticks();
      tickVals = tickVals.filter(this.options.yTickFilter);
      axis.tickValues(tickVals);
    }

    g.attr("transform", `translate(${this.margins.left},0)`).call(axis);

    // Keep the main y-axis line (domain) instead of removing it
    g.select(".domain").attr("class", cs.yAxis); // You may want to add this CSS class

    g.selectAll(".tick text").attr("class", cs.yAxisTickText);

    g.selectAll(TICK_LINE).remove();

    g.select(".tick:last-of-type text")
      .clone()
      .attr("x", 12 - this.options.labelYVerticalOffset)
      .attr("y", -30 - this.options.labelYHorizontalOffset)
      .attr("transform", "rotate(-90)")
      .attr(TEXT_ANCHOR, "end")
      .attr(FONT_WEIGHT, 600)
      .attr(
        "class",
        cx(
          cs.labelY,
          this.options.labelsLarge && cs.large,
          this.options.labelsBold && cs.bold
        )
      )
      .text(this.options.labelY);
  }

  renderYAxisOnly(container: $TSFixMe) {
    // Create a separate SVG just for the y-axis
    const yAxisContainer = d3.select(container);
    yAxisContainer.selectAll("svg").remove(); // Clear any existing

    const yAxisSvg = yAxisContainer
      .append("svg")
      .attr("width", 40 + this.options.lineWidth)
      .attr("height", this.size.height);

    // Calculate the same y-scale as the main chart
    const bins = this.getBins();
    const y = HISTOGRAM_SCALE_FUNCTIONS[this.options.yScaleType]();
    const yScaleMin = this.options.yScaleType === HISTOGRAM_SCALE.LOG ? 1 : 0;

    y.domain([
      yScaleMin,
      this.options.yMax ||
        d3.max(
          bins.map((seriesBins: $TSFixMe) =>
            d3.max(seriesBins, (d: $TSFixMe) => d.length)
          )
        ),
    ]).range([this.size.height - this.margins.bottom, this.margins.top]);

    // Render just the y-axis
    yAxisSvg.append("g").call(this.yAxis.bind(this), y);

    return yAxisSvg;
  }

  getXDomain = () => {
    if (this.options.domain) {
      return this.options.domain;
    }

    const mins: string[] = [];
    const maxs: string[] = [];
    for (let i = 0; i < this.data.length; i += 1) {
      const series = this.data[i];
      const minMax = d3.extent(series);

      if (minMax[0] !== undefined && minMax[1] !== undefined) {
        mins.push(minMax[0]);
        maxs.push(minMax[1]);
      }

      // make the chart is large enough to hold reference lines
      if (this.options.refValues && this.options.refValues.length) {
        const values = this.options.refValues.map((v: $TSFixMe) =>
          parseFloat(v.values[i])
        );

        const refMin = d3.min(values);
        const refMax = d3.max(values);

        if (refMin !== undefined) mins.push(refMin);
        if (refMax !== undefined) maxs.push(refMax);
      }
      const overallMin = d3.min(mins);
      const overallMax = d3.max(maxs);

      if (overallMin === undefined || overallMax === undefined) {
        throw new Error("Histogram: could not compute min/max for xDomain");
      }
    }

    switch (this.options.xScaleType) {
      case HISTOGRAM_SCALE.LINEAR:
        return [d3.min(mins), d3.max(maxs)];
      // Due to historical reasons we return a fixed min for log scales
      case HISTOGRAM_SCALE.LOG:
        return [1, d3.max(maxs)];
      default:
        throw new Error(
          `Histogram: unknown xScaleType ${this.options.xScaleType}`
        );
    }
  };

  getBins = () => {
    if (this.options.skipBins) {
      return this.data;
    }
    // TODO: we do not currently use the Histogram without bins, so we can remove this
    // keeping this for a while incase we need to see the logic
    // const bins: Bins = [];
    // for (let i = 0; i < this.data.length; i += 1) {
    //   bins[i] = d3.bin().domain(x.domain()).thresholds(x.ticks())(this.data[i]);
    // }
    return null;
  };

  getBarWidth = (x: $TSFixMe, innerBin: $TSFixMe) => {
    if (this.options.xScaleType === HISTOGRAM_SCALE.LOG) {
      // TO INVESTIGATE: why not do this in linear scale?
      return (x(innerBin.x1) - x(innerBin.x0)) / 2;
    }

    let { numBins } = this.options;
    if (this.options.skipBins) {
      numBins =
        numBins || d3.max(map((seriesData) => seriesData.length, this.data));
    } else {
      numBins = numBins || d3.max([x.ticks().length - 1, 2]);
    }

    // If there should be gaps between the bars, subtract 1px from the bar width.
    const barInsideTicks = this.options.spacedBars ? 1 : 0;
    return (
      (this.size.width - this.margins.right - this.margins.left) / numBins -
      barInsideTicks
    );
  };

  getColors = () => {
    if (this.options.colors) {
      return this.options.colors;
    }

    return new CategoricalColormap().getNScale(this.data.length + 1);
  };

  getBarOpacity = () => this.options.barOpacity;

  onBarMouseMove = () => {
    this.options.onHistogramBarHover(d3.event.clientX, d3.event.clientY);
  };

  onBarMouseOver = (
    innerBin: $TSFixMe,
    seriesIndex: $TSFixMe,
    barIndex: $TSFixMe
  ) => {
    if (this.options.onHistogramBarEnter) {
      this.options.onHistogramBarEnter(innerBin, this.data[seriesIndex]);
    }
    if (this.options.hoverColors) {
      this.svg
        .select(`.rect-${barIndex}`)
        .attr("fill", this.options.hoverColors[seriesIndex]);
    }
  };

  onBarMouseOut = (seriesIndex: $TSFixMe, barIndex: $TSFixMe) => {
    const colors = this.getColors();
    this.svg.select(`.rect-${barIndex}`).attr("fill", colors[seriesIndex]);
    this.options.onHistogramBarHover();
  };

  onBarMouseDown = (seriesIndex: $TSFixMe, barIndex: $TSFixMe) => {
    if (this.options.clickColors) {
      this.svg
        .select(`.rect-${barIndex}`)
        .attr("fill", this.options.clickColors[seriesIndex]);
    }
  };

  onBarMouseUp = (seriesIndex: $TSFixMe, barIndex: $TSFixMe) => {
    if (this.options.hoverColors) {
      this.svg
        .select(`.rect-${barIndex}`)
        .attr("fill", this.options.hoverColors[seriesIndex]);
    }
  };

  onBarClick = (seriesIndex: $TSFixMe, barIndex: $TSFixMe) => {
    if (this.options.onHistogramBarClick) {
      this.options.onHistogramBarClick(this.data[seriesIndex], barIndex);
    }
  };

  getHighlightedBar = () => {
    // svgX is an x coordinate relative to the svg container.
    // All the bar "endpoints" are within this same coordinate space.
    const svgX = d3.mouse(this.svg.node())[0];
    const closestBarCenters = ArrayUtils.findClosestNeighbors(
      this.sortedBarCenters,
      svgX
    );
    let closestX: number | null = null;

    if (closestBarCenters.length === 1) {
      closestX = closestBarCenters[0];
    } else {
      closestX =
        Math.abs(closestBarCenters[0] - svgX) <
        Math.abs(closestBarCenters[1] - svgX)
          ? closestBarCenters[0]
          : closestBarCenters[1];
    }

    // Only return if we are at most hoverBuffer away from the closest bar.
    const buffer = this.barWidth / 2 + this.options.hoverBuffer;
    const dataIndices =
      Math.abs(closestX - svgX) < buffer
        ? this.barCentersToIndices[closestX]
        : null;

    const lastDataIndices = this.lastHoveredBarX
      ? this.barCentersToIndices[this.lastHoveredBarX]
      : null;

    return { dataIndices, lastDataIndices, closestX };
  };

  // Find the bar x-center that is closest to svgX, within hoverBuffer.
  onMouseMove = () => {
    if (this.sortedBarCenters.length === 0) {
      return;
    }

    const { dataIndices, lastDataIndices, closestX } = this.getHighlightedBar();

    if (this.lastHoveredBarX !== closestX && dataIndices !== null) {
      if (this.options.onHistogramBarEnter) {
        this.options.onHistogramBarEnter(dataIndices, this.data[0]);
      }
      this.highlightBar(dataIndices, true);
      this.highlightBar(lastDataIndices, false);
      this.lastHoveredBarX = closestX;
    } else if (dataIndices === null && this.lastHoveredBarX) {
      if (this.options.onHistogramBarExit) {
        this.options.onHistogramBarExit();
      }
      this.highlightBar(lastDataIndices, false);
      this.lastHoveredBarX = null;
    }

    if (dataIndices !== null && this.options.onHistogramBarHover) {
      // Coordinates with respect to the viewport.
      this.options.onHistogramBarHover(d3.event.clientX, d3.event.clientY);
    }
  };

  onMouseLeave = () => {
    if (this.options.onHistogramBarExit) {
      this.options.onHistogramBarExit();
    }

    const lastDataIndices = this.lastHoveredBarX
      ? this.barCentersToIndices[this.lastHoveredBarX]
      : null;
    this.highlightBar(lastDataIndices, false);
    this.lastHoveredBarX = null;
  };

  highlightBar = (dataIndices: $TSFixMe, shouldHighlight: $TSFixMe) => {
    if (!dataIndices || !this.options.hoverColors) {
      return;
    }

    const [seriesIndex, barIndex] = dataIndices;

    const highlightColor = shouldHighlight
      ? this.options.hoverColors[seriesIndex]
      : this.getColors()[seriesIndex];

    this.svg
      .select(`.bar-${seriesIndex} .rect-${barIndex}`)
      .attr("fill", highlightColor);
  };

  fixSymLogScaleTicks = (scale: $TSFixMe) => {
    // Hack to use a log scale plus an initial 0 for SymLog scales
    // Context:
    // At the time of this code, d3 symlog scales uses a linear selection of ticks positions.
    // (see issue https://github.com/d3/d3-scale/issues/162 which is still open at this time)
    // For our current purposes, just adding the zero to the scale that would be generated by a log scale
    // in the subset of the original domain that is greater than or equal to 1 works.
    // The scale will be naturally simplistic at lower values.
    const logScale = d3.scaleLog().domain([1, scale.domain()[1]]).nice();

    scale.ticks = function ticks(count: $TSFixMe) {
      const logTicks = logScale.ticks(count);
      // The log scale ticks function also does not seem to respect the count variable for lower scales.
      // For instance, with count = 2 and for a domain 0-4, it returns ticks [1, 2, 3, ... , 10]
      // Since we do not adjust the domain to this values, the axis would be larger than the chart partially overlapping the container.
      // Thus, we must trim the logTicks to values within the domain.
      // This still does not respect `count`, but at least, shows the axis with the proper size.

      // Log ticks might return:
      // * ticks all shorter than domain (returns -1), in which case we want to use all ticks
      // * more ticks than necessary (for domains <= 10), in which case we want to remove unnecessary ticks
      const firstIndexHigherThanMax = logTicks.findIndex(
        (v: $TSFixMe) => v >= this.domain()[1]
      );
      const trimmedLogTicks = logTicks.slice(
        0,
        firstIndexHigherThanMax === -1
          ? logTicks.length
          : firstIndexHigherThanMax + 1
      );
      // reset the domain to include the min/max axis - including the case where max tick is lower than max of
      this.domain([
        0,
        Math.max(
          trimmedLogTicks[trimmedLogTicks.length - 1],
          scale.domain()[1]
        ),
      ]).nice();

      return [0].concat(trimmedLogTicks);
    };
  };

  update() {
    if (!this.data) return;

    const colors = this.getColors();
    const xDomain = this.getXDomain();

    const x = HISTOGRAM_SCALE_FUNCTIONS[this.options.xScaleType]();

    // If there are explicit tick values, don't call .nice() since it may modify the domain
    // to differ from the given ticks.
    if (this.options.tickValues || this.options.skipNiceDomains) {
      x.domain(xDomain).range([
        this.margins.left,
        this.size.width - this.margins.right,
      ]);
    } else {
      x.domain(xDomain).range([
        this.margins.left,
        this.size.width - this.margins.right,
      ]);
    }
    const bins = this.getBins();
    this.bins = bins;

    const y = HISTOGRAM_SCALE_FUNCTIONS[this.options.yScaleType]();
    const yScaleMin = this.options.yScaleType === HISTOGRAM_SCALE.LOG ? 1 : 0;
    y.domain([
      yScaleMin,
      this.options.yMax ||
        d3.max(
          bins.map((seriesBins: $TSFixMe) =>
            d3.max(seriesBins, (d: $TSFixMe) => d.length)
          )
        ),
    ]).range([this.size.height - this.margins.bottom, this.margins.top]);

    this.svg.append("g").call(this.xAxis.bind(this), x);
    // this.svg.append("g").call(this.yAxis.bind(this), y);

    this.svg.on("click", this.options.onHistogramEmptyClick);

    const barOpacity = this.getBarOpacity();

    // Maps from x-coordinate to the data plotted at that x-coordinate.
    // Used for hovering.
    const barCenters: $TSFixMe = [];

    // If there should be gaps between the bars, offset the bar positions by 1px.
    const barInsideTicks = this.options.spacedBars ? 1 : 0;

    for (let i = 0; i < bins.length; i += 1) {
      this.svg
        .append("g")
        .attr("class", `bar-${i}`)
        .attr("fill", colors[i])
        .selectAll("rect")
        .data(bins[i])
        .enter()
        .append("rect")
        .attr("class", (_: $TSFixMe, index: $TSFixMe) => `rect-${index}`)
        .attr(
          "x",
          (d: $TSFixMe) => barInsideTicks + x(d.x0) + i * this.getBarWidth(x, d)
        )
        .attr("width", (d: $TSFixMe) => this.getBarWidth(x, d))
        .attr("y", (d: $TSFixMe) => y(d.length))
        .attr("height", (d: $TSFixMe) => y(yScaleMin) - y(d.length))
        .style("opacity", barOpacity)
        .on("mousemove", this.onBarMouseMove)
        .on("mouseover", (d: $TSFixMe, index: $TSFixMe) => {
          this.onBarMouseOver(d, i, index);
        })
        .on("mouseleave", (_: $TSFixMe, index: $TSFixMe) =>
          this.onBarMouseOut(i, index)
        )
        .on("mousedown", (_: $TSFixMe, index: $TSFixMe) =>
          this.onBarMouseDown(i, index)
        )
        .on("mouseup", (_: $TSFixMe, index: $TSFixMe) =>
          this.onBarMouseUp(i, index)
        )
        .on("click", (_: $TSFixMe, index: $TSFixMe) => {
          this.onBarClick(i, index);
          d3.event.stopPropagation();
        });

      bins[i].forEach((innerBin: $TSFixMe, index: number) => {
        const barWidth = this.getBarWidth(x, innerBin);
        this.barWidth = this.getBarWidth(x, innerBin);
        const xMidpoint = x(innerBin.x0) + i * barWidth + barWidth / 2;
        this.barCentersToIndices[xMidpoint] = [i, index];
        barCenters.push(xMidpoint);
      });

      if (this.options.showStatistics) {
        const avg = d3.mean(this.data[i]) || 0;
        const dev = d3.deviation(this.data[i]) || 0;

        const stats = this.svg.append("g");

        stats
          .append("line")
          .attr("stroke", colors[i])
          .attr("x1", x(avg))
          .attr("x2", x(avg))
          .attr("y1", this.margins.top)
          .attr("y2", this.size.height - this.margins.bottom);

        const rect0 = d3.max([x(avg - dev), this.margins.left]);
        const rect1 =
          d3.min([x(avg + dev), this.size.width - this.margins.right]) || 0;
        const rectWidth = rect1 - rect0;

        stats
          .append("rect")
          .attr("fill", colors[i])
          .attr("fill-opacity", 0.2)
          .attr("x", rect0)
          .attr("width", rectWidth)
          .attr("y", this.margins.top)
          .attr(
            "height",
            this.size.height - this.margins.top - this.margins.bottom
          )
          .lower();
      }

      if (this.options.refValues && this.options.refValues.length) {
        const refs = this.svg.append("g").attr("class", "refs");

        for (const ref of this.options.refValues) {
          // cannot pass in 0 if using log scale, since log(0) is -Infinity,
          // so increment everything by 1
          const xRef = x(ref.values[i]);
          refs
            .append("line")
            .attr("stroke", colors[i])
            .style("stroke-dasharray", "4, 4")
            .attr("x1", xRef)
            .attr("x2", xRef)
            .attr("y1", this.margins.top)
            .attr("y2", this.size.height - this.margins.bottom);
          refs
            .append("text")
            .attr("x", -this.margins.top)
            .attr("y", xRef - 4)
            .attr("transform", "rotate(-90)")
            .attr(TEXT_ANCHOR, "end")
            .attr(FONT_WEIGHT, "bold")
            .attr("font-size", 10)
            .style("fill", colors[i])
            .text(ref.name);
        }
      }
    }

    this.sortedBarCenters = barCenters.sort(
      (a: $TSFixMe, b: $TSFixMe) => a - b
    );

    if (this.options.hoverBuffer > 0) {
      this.svg
        .append("rect")
        .attr("class", "hoverRect")
        .attr("fill", "transparent")
        .attr(
          "transform",
          `translate(${this.margins.left}, ${this.margins.top})`
        )
        .attr("width", this.size.width - this.margins.right - this.margins.left)
        .attr(
          "height",
          this.size.height - this.margins.top - this.margins.bottom
        )
        .on("mousemove", this.onMouseMove)
        .on("mouseleave", this.onMouseLeave);
    }

    if (this.options.seriesNames) {
      const legend = this.svg
        .append("g")
        .attr("class", "histogram__legend")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .attr(TEXT_ANCHOR, "end")
        .attr(TEXT_ANCHOR, "end")
        .selectAll("g")
        .data(this.options.seriesNames)
        .enter()
        .append("g")
        .attr(
          "transform",
          (_: $TSFixMe, i: $TSFixMe) => `translate(-20,${(i + 1) * 20})`
        );

      legend
        .append("rect")
        .attr("x", this.size.width - 5)
        .attr("width", 14)
        .attr("height", 14)
        .attr("fill", (_: $TSFixMe, i: $TSFixMe) => colors[i]);

      legend
        .append("text")
        .attr("x", this.size.width - 10)
        .attr("y", this.margins.top)
        .attr("dy", -11)
        .attr("alignment-baseline", "middle")
        .text((d: $TSFixMe) => d);
    }
  }
}
