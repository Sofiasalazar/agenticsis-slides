/**
 * Returns relative luminance of a hex color (0 = black, 1 = white).
 * Uses the sRGB formula from WCAG 2.0.
 */
export function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16) / 255
  const g = parseInt(h.substring(2, 4), 16) / 255
  const b = parseInt(h.substring(4, 6), 16) / 255
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/** True when the background is light enough that text should be dark. */
export function isLightBg(hex: string): boolean {
  return luminance(hex) > 0.4
}

/** Returns a set of text colors appropriate for the given background. */
export function textColors(bg: string) {
  if (isLightBg(bg)) {
    return {
      text: '#0A0A0A',
      textMuted: '#525252',
      textBody: '#374151',
      textDim: '#737373',
    }
  }
  return {
    text: '#F5F5F5',
    textMuted: '#A3A3A3',
    textBody: '#D1D5DB',
    textDim: '#525252',
  }
}
