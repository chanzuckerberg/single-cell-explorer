const TOOLTIP_BUFFER = 10;
const TOOLTIP_MAX_WIDTH = 400;

// Display the tooltip in the top left, unless it is too close
// to the right side of the screen. If it is too close to the bottom, show it
// above the curosr.
export const getTooltipStyle = (
  location: { top: number; left: number },
  params: { buffer?: number; below?: boolean; height?: number } = {}
) => {
  const buffer = params.buffer || TOOLTIP_BUFFER;
  const topBufferSign = params.below ? 1 : -1;
  let { top } = location;

  if (params.height && top + params.height > window.innerHeight) {
    top -= params.height;
  }

  if (location.left > window.innerWidth - TOOLTIP_MAX_WIDTH) {
    const right = window.innerWidth - location.left;
    return {
      right: right + buffer,
      top: top + topBufferSign * buffer,
    };
  }
  return {
    left: location.left + buffer,
    top: top + topBufferSign * buffer,
  };
};
