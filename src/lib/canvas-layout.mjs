/** Horizontal and vertical breathing room around a 16:9 canvas. */
export function canvasInsetForWidth(width) {
  if (width < 640) return 24;
  if (width < 900) return 48;
  return 72;
}
