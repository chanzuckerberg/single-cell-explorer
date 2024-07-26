export function truncateText(
  text: string,
  node: SVGTextElement,
  maxWidth: number
) {
  let textLength = node.getComputedTextLength();

  if (textLength <= maxWidth) return text; // No truncation needed

  // Calculate average character width and estimate visible characters
  const avgCharWidth = textLength / text.length;
  const visibleChars = Math.floor(maxWidth / avgCharWidth);

  // Initial truncation guess
  let truncatedText = `${text.slice(0, visibleChars - 1)}...`;
  node.textContent = truncatedText;
  textLength = node.getComputedTextLength();

  // Fine-tune adjustment if the text is too long
  if (textLength > maxWidth) {
    while (textLength > maxWidth && truncatedText.length > 3) {
      truncatedText = `${truncatedText.slice(0, -4)}...`;
      node.textContent = truncatedText;
      textLength = node.getComputedTextLength();
    }
  } else {
    // Fine-tune adjustment if the text is too short
    while (textLength < maxWidth && truncatedText.length < text.length) {
      const newTruncatedText = `${text.slice(
        0,
        truncatedText.length - 3 + 1
      )}...`;
      node.textContent = newTruncatedText;
      textLength = node.getComputedTextLength();
      if (textLength > maxWidth) break;
      truncatedText = newTruncatedText;
    }
  }

  return truncatedText;
}
