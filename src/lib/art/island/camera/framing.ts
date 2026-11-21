const FRAME_MARGIN = 24;
const FALLBACK_TOP = 0.28;
const FALLBACK_BOTTOM = 0.62;
const FALLBACK_CENTER_X = 0.8;

function needsFallback(height: number, heroBottom: number, footerTop: number): boolean {
  return Math.min(footerTop, height) - heroBottom <= FRAME_MARGIN * 2;
}

export function narrowFraming(width: number, height: number, heroBottom: number, footerTop: number) {
  let top = heroBottom + FRAME_MARGIN, bottom = Math.min(footerTop, height) - FRAME_MARGIN;
  if (needsFallback(height, heroBottom, footerTop)) { top = height * FALLBACK_TOP; bottom = height * FALLBACK_BOTTOM; }
  const gap = Math.max(1, bottom - top);
  return {
    vertical: Math.max(45 * height / width, 34 * height / gap),
    center: (top + bottom) / (2 * height),
  };
}

export interface HeroBounds { right: number; bottom: number }

export function restFraming(width: number, height: number, hero: HeroBounds, headerBottom: number, footerTop: number) {
  const left = hero.right + 32, right = width - 24;
  const side = width >= 700 && right - left >= width * 0.28;
  if (!side) {
    const narrow = narrowFraming(width, height, hero.bottom, footerTop);
    return { vertical: narrow.vertical, centerX: needsFallback(height, hero.bottom, footerTop) ? FALLBACK_CENTER_X : 0.5, centerY: narrow.center, side };
  }
  const top = headerBottom + 24, bottom = Math.min(height, footerTop) - 24;
  return {
    vertical: Math.max(50 * height / Math.max(1, right - left), 38 * height / Math.max(1, bottom - top)),
    centerX: (left + right) / (2 * width),
    centerY: (top + bottom) / (2 * height),
    side,
  };
}
