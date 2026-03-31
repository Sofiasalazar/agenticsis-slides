import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { Presentation, Slide, GraphicState, ThemeColors } from '../types/slide'
import { textColors } from './colors'

async function toCanvas(el: HTMLElement, bgColor: string): Promise<HTMLCanvasElement> {
  return html2canvas(el, {
    scale: 1.5,
    backgroundColor: bgColor,
    useCORS: true,
    allowTaint: true,
    logging: false,
  })
}

function slugify(title: string): string {
  return title.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()
}

function collectAnimations(el: HTMLElement): Animation[] {
  const nodes: Element[] = [el, ...Array.from(el.querySelectorAll('*'))]
  const all: Animation[] = []
  for (const node of nodes) {
    all.push(...node.getAnimations())
  }
  return all
}

function isFiniteAnimation(a: Animation): boolean {
  const timing = a.effect?.getTiming()
  if (!timing) return false
  const iters = timing.iterations
  return iters !== Infinity && iters !== undefined && (iters as number) > 0
}

// Wait for all finite animations in the element tree to complete.
// Uses a 7s minimum floor so animations that start late are still captured,
// then waits for detected animations to finish (up to 12s hard cap).
async function waitForAnimations(el: HTMLElement): Promise<void> {
  const MIN_WAIT = 8000   // floor — covers slow-starting or undetected animations
  const MAX_WAIT = 15000  // hard cap

  // Let the HTML inject and animations start before we try to detect them
  await new Promise(r => setTimeout(r, 600))

  const animationsFinished = (async () => {
    try {
      const finite = collectAnimations(el).filter(isFiniteAnimation)
      if (finite.length > 0) {
        await Promise.race([
          Promise.all(finite.map(a => a.finished.catch(() => {}))),
          new Promise(r => setTimeout(r, MAX_WAIT)),
        ])
      }
    } catch { /* ignore */ }
  })()

  // Always wait at least MIN_WAIT, plus until animations are done
  await Promise.all([
    new Promise(r => setTimeout(r, MIN_WAIT)),
    animationsFinished,
  ])
}

export async function exportPDF(
  elements: HTMLElement[],
  title: string,
  bgColor = '#0A0A0A'
): Promise<void> {
  await Promise.all(elements.map(el => waitForAnimations(el)))

  const dataUrls: string[] = []
  for (const el of elements) {
    const canvas = await toCanvas(el, bgColor)
    dataUrls.push(canvas.toDataURL('image/jpeg', 0.95))
  }

  // Use a hidden iframe so the print dialog is never blocked by popup blockers.
  // (window.open fails when called after async awaits — user gesture is lost.)
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;border:none;visibility:hidden;'
  document.body.appendChild(iframe)

  const slideHtml = dataUrls.map(url =>
    `<div class="slide"><img src="${url}" /></div>`
  ).join('\n')

  const doc = iframe.contentDocument!
  doc.open()
  doc.write(`<!DOCTYPE html><html>
<head>
<meta charset="utf-8">
<title>${title.replace(/</g, '&lt;')}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: white; }
  @page { size: 1280px 720px; margin: 0; }
  .slide { width: 100%; page-break-after: always; break-after: page; }
  .slide:last-child { page-break-after: avoid; break-after: avoid; }
  img { width: 100%; display: block; }
</style>
</head>
<body>
${slideHtml}
</body>
</html>`)
  doc.close()

  // Brief wait for images to render inside the iframe, then print
  await new Promise(r => setTimeout(r, 600))
  iframe.contentWindow!.print()
  // Remove iframe after a short delay to let the print dialog open
  setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe) }, 2000)
}

export async function exportPNG(
  elements: HTMLElement[],
  title: string,
  bgColor = '#0A0A0A'
): Promise<void> {
  // Wait for all slides' animations in parallel before capturing any
  await Promise.all(elements.map(el => waitForAnimations(el)))

  const zip = new JSZip()
  for (let i = 0; i < elements.length; i++) {
    const canvas = await toCanvas(elements[i], bgColor)
    const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/png'))
    zip.file(`slide-${String(i + 1).padStart(2, '0')}.png`, blob)
  }
  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, `${slugify(title)}-slides.zip`)
}

// ---------------------------------------------------------------------------
// Native PPTX export -- builds editable slides from structured data
// ---------------------------------------------------------------------------

/** Strip '#' from hex color for PptxGenJS (expects bare hex like 'FF0000') */
function hex(color: string): string {
  return color.replace('#', '')
}

/** Render a graphic (HTML or uploaded image) to a JPEG data URL for embedding */
async function graphicToDataUrl(g: GraphicState): Promise<string | null> {
  if (g.uploadedImage) return g.uploadedImage
  if (!g.html) return null

  // Render the HTML graphic off-screen, capture with html2canvas
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;height:500px;overflow:hidden;'
  container.innerHTML = g.html
  document.body.appendChild(container)
  await new Promise(r => setTimeout(r, 300)) // let CSS render
  try {
    const canvas = await html2canvas(container, {
      scale: 2, backgroundColor: null, useCORS: true, allowTaint: true, logging: false,
    })
    return canvas.toDataURL('image/png')
  } finally {
    document.body.removeChild(container)
  }
}

// Layout constants (inches) -- LAYOUT_WIDE = 13.33" x 7.5"
const W = 13.33
const H = 7.5
const PAD = 0.6          // general padding
const CONTENT_W = W * 0.55  // 55% for content side
const GRAPHIC_X = CONTENT_W
const GRAPHIC_W = W - CONTENT_W

type PptxSlide = import('pptxgenjs').default extends { addSlide(): infer S } ? S : never

async function addGraphicPanel(
  pptxSlide: PptxSlide,
  graphic: GraphicState | undefined,
  side: 'right' | 'left',
) {
  if (!graphic || graphic.skipped) return
  const dataUrl = await graphicToDataUrl(graphic)
  if (!dataUrl) return

  const x = side === 'right' ? GRAPHIC_X : 0
  const w = side === 'right' ? GRAPHIC_W : W * 0.45

  pptxSlide.addImage({
    data: dataUrl,
    x, y: 0, w, h: H,
    sizing: { type: 'contain', w, h: H },
  })
}

function buildHero(
  pptxSlide: PptxSlide, slide: Extract<Slide, { type: 'hero' }>,
  tc: ReturnType<typeof textColors>, colors: ThemeColors,
) {
  // Badge
  if (slide.badge) {
    pptxSlide.addText(slide.badge.toUpperCase(), {
      x: PAD, y: 1.2, w: CONTENT_W - PAD * 2, h: 0.35,
      fontSize: 10, fontFace: 'Arial', bold: true, letterSpacing: 1.5,
      color: hex(colors.primary),
    })
  }
  // Title
  pptxSlide.addText(slide.title, {
    x: PAD, y: slide.badge ? 1.7 : 1.8, w: CONTENT_W - PAD * 2, h: 2.5,
    fontSize: 44, fontFace: 'Arial', bold: true, color: hex(tc.text),
    lineSpacingMultiple: 0.95,
  })
  // Subtitle
  pptxSlide.addText(slide.subtitle, {
    x: PAD, y: slide.badge ? 4.3 : 4.4, w: CONTENT_W - PAD * 2, h: 1.2,
    fontSize: 18, fontFace: 'Arial', color: hex(tc.textMuted),
    lineSpacingMultiple: 1.4,
  })
  // Accent line
  pptxSlide.addShape('rect' as never, {
    x: PAD, y: 5.7, w: 0.8, h: 0.03,
    fill: { color: hex(colors.primary) },
  })
}

function buildBullets(
  pptxSlide: PptxSlide, slide: Extract<Slide, { type: 'bullets' }>,
  tc: ReturnType<typeof textColors>, colors: ThemeColors,
) {
  // Section label
  pptxSlide.addText('KEY POINTS', {
    x: PAD, y: 0.7, w: CONTENT_W - PAD * 2, h: 0.3,
    fontSize: 10, fontFace: 'Arial', bold: true, letterSpacing: 1.2,
    color: hex(colors.primary),
  })
  // Title
  pptxSlide.addText(slide.title, {
    x: PAD, y: 1.1, w: CONTENT_W - PAD * 2, h: 1.0,
    fontSize: 32, fontFace: 'Arial', bold: true, color: hex(tc.text),
  })
  // Description
  let bulletY = 2.2
  if (slide.description) {
    pptxSlide.addText(slide.description, {
      x: PAD, y: bulletY, w: CONTENT_W - PAD * 2, h: 0.6,
      fontSize: 13, fontFace: 'Arial', color: hex(tc.textMuted),
      lineSpacingMultiple: 1.4,
    })
    bulletY += 0.7
  }
  // Bullets
  const bulletRows = slide.bullets.map((b, i) => ([
    { text: `${i + 1}`, options: {
      fontSize: 10, bold: true, fontFace: 'Arial',
      color: hex(i % 2 === 0 ? colors.primary : colors.accent),
    }},
    { text: `  ${b}`, options: {
      fontSize: 14, fontFace: 'Arial', color: hex(tc.textBody),
    }},
  ]))
  for (let i = 0; i < bulletRows.length; i++) {
    pptxSlide.addText(bulletRows[i], {
      x: PAD, y: bulletY + i * 0.45, w: CONTENT_W - PAD * 2, h: 0.4,
      valign: 'middle',
    })
  }
}

function buildSplit(
  pptxSlide: PptxSlide, slide: Extract<Slide, { type: 'split' }>,
  tc: ReturnType<typeof textColors>, colors: ThemeColors,
) {
  // Title
  pptxSlide.addText(slide.title, {
    x: PAD, y: 0.8, w: CONTENT_W - PAD * 2, h: 1.0,
    fontSize: 30, fontFace: 'Arial', bold: true, color: hex(tc.text),
  })
  const colW = (CONTENT_W - PAD * 2 - 0.2) / 2
  // Left box
  pptxSlide.addShape('roundRect' as never, {
    x: PAD, y: 2.1, w: colW, h: 4.2, rectRadius: 0.15,
    fill: { color: hex(colors.primary), transparency: 90 },
    line: { color: hex(colors.primary), transparency: 70, width: 1 },
  })
  if (slide.leftLabel) {
    pptxSlide.addText(slide.leftLabel.toUpperCase(), {
      x: PAD + 0.2, y: 2.3, w: colW - 0.4, h: 0.3,
      fontSize: 9, fontFace: 'Arial', bold: true, letterSpacing: 1.2,
      color: hex(colors.primary),
    })
  }
  pptxSlide.addText(slide.left, {
    x: PAD + 0.2, y: slide.leftLabel ? 2.7 : 2.4, w: colW - 0.4, h: 3.2,
    fontSize: 12, fontFace: 'Arial', color: hex(tc.textBody),
    lineSpacingMultiple: 1.5, valign: 'top',
  })
  // Right box
  const rightX = PAD + colW + 0.2
  pptxSlide.addShape('roundRect' as never, {
    x: rightX, y: 2.1, w: colW, h: 4.2, rectRadius: 0.15,
    fill: { color: hex(colors.accent), transparency: 92 },
    line: { color: hex(colors.accent), transparency: 75, width: 1 },
  })
  if (slide.rightLabel) {
    pptxSlide.addText(slide.rightLabel.toUpperCase(), {
      x: rightX + 0.2, y: 2.3, w: colW - 0.4, h: 0.3,
      fontSize: 9, fontFace: 'Arial', bold: true, letterSpacing: 1.2,
      color: hex(colors.accent),
    })
  }
  pptxSlide.addText(slide.right, {
    x: rightX + 0.2, y: slide.rightLabel ? 2.7 : 2.4, w: colW - 0.4, h: 3.2,
    fontSize: 12, fontFace: 'Arial', color: hex(tc.textBody),
    lineSpacingMultiple: 1.5, valign: 'top',
  })
}

function buildQuote(
  pptxSlide: PptxSlide, slide: Extract<Slide, { type: 'quote' }>,
  tc: ReturnType<typeof textColors>, colors: ThemeColors,
) {
  // Opening quotation mark
  pptxSlide.addText('\u201C', {
    x: PAD, y: 1.0, w: 1, h: 1,
    fontSize: 72, fontFace: 'Georgia', color: hex(colors.primary),
    transparency: 40,
  })
  // Quote text
  pptxSlide.addText(slide.quote, {
    x: PAD, y: 2.0, w: CONTENT_W - PAD * 2, h: 2.8,
    fontSize: 22, fontFace: 'Arial', color: hex(tc.text),
    lineSpacingMultiple: 1.4, italic: true, valign: 'top',
  })
  // Attribution
  if (slide.attribution) {
    pptxSlide.addText(`\u2014 ${slide.attribution}`, {
      x: PAD, y: 5.0, w: CONTENT_W - PAD * 2, h: 0.4,
      fontSize: 12, fontFace: 'Arial', bold: true, color: hex(colors.primary),
    })
  }
  if (slide.context) {
    pptxSlide.addText(slide.context, {
      x: PAD, y: 5.4, w: CONTENT_W - PAD * 2, h: 0.4,
      fontSize: 11, fontFace: 'Arial', color: hex(tc.textDim),
    })
  }
}

function buildStat(
  pptxSlide: PptxSlide, slide: Extract<Slide, { type: 'stat' }>,
  tc: ReturnType<typeof textColors>, colors: ThemeColors,
) {
  // Section label
  pptxSlide.addText('BY THE NUMBERS', {
    x: PAD, y: 0.7, w: CONTENT_W - PAD * 2, h: 0.3,
    fontSize: 10, fontFace: 'Arial', bold: true, letterSpacing: 1.2,
    color: hex(colors.accent),
  })
  // Title
  pptxSlide.addText(slide.title, {
    x: PAD, y: 1.1, w: CONTENT_W - PAD * 2, h: 1.0,
    fontSize: 30, fontFace: 'Arial', bold: true, color: hex(tc.text),
  })
  // Stat cards in a 2-column grid
  const cols = Math.min(2, slide.stats.length)
  const cardW = (CONTENT_W - PAD * 2 - 0.15 * (cols - 1)) / cols
  slide.stats.forEach((stat, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx = PAD + col * (cardW + 0.15)
    const cy = 2.3 + row * 1.8
    // Card background
    pptxSlide.addShape('roundRect' as never, {
      x: cx, y: cy, w: cardW, h: 1.6, rectRadius: 0.15,
      fill: { color: 'FFFFFF', transparency: 95 },
    })
    // Value
    pptxSlide.addText(stat.value, {
      x: cx + 0.15, y: cy + 0.15, w: cardW - 0.3, h: 0.7,
      fontSize: 32, fontFace: 'Arial', bold: true,
      color: hex(i % 2 === 0 ? colors.primary : colors.accent),
    })
    // Label
    pptxSlide.addText(stat.label, {
      x: cx + 0.15, y: cy + 0.85, w: cardW - 0.3, h: 0.35,
      fontSize: 12, fontFace: 'Arial', bold: true, color: hex(tc.text),
    })
    // Note
    if (stat.note) {
      pptxSlide.addText(stat.note, {
        x: cx + 0.15, y: cy + 1.2, w: cardW - 0.3, h: 0.3,
        fontSize: 10, fontFace: 'Arial', color: hex(tc.textDim),
      })
    }
  })
}

function buildCta(
  pptxSlide: PptxSlide, slide: Extract<Slide, { type: 'cta' }>,
  tc: ReturnType<typeof textColors>, colors: ThemeColors,
) {
  // CTA has graphic on the LEFT (45%) and content on the RIGHT (55%)
  const contentX = W * 0.45
  const contentW = W * 0.55

  // Accent bar
  pptxSlide.addShape('rect' as never, {
    x: contentX + PAD, y: 2.2, w: 0.5, h: 0.04,
    fill: { color: hex(colors.primary) },
  })
  // Headline
  pptxSlide.addText(slide.headline, {
    x: contentX + PAD, y: 2.5, w: contentW - PAD * 2, h: 1.8,
    fontSize: 36, fontFace: 'Arial', bold: true, color: hex(tc.text),
    lineSpacingMultiple: 1.0,
  })
  // Subtext
  pptxSlide.addText(slide.subtext, {
    x: contentX + PAD, y: 4.4, w: contentW - PAD * 2, h: 1.0,
    fontSize: 15, fontFace: 'Arial', color: hex(tc.textMuted),
    lineSpacingMultiple: 1.5,
  })
  // Action button
  pptxSlide.addShape('roundRect' as never, {
    x: contentX + PAD, y: 5.6, w: 2.5, h: 0.55, rectRadius: 0.1,
    fill: { color: hex(colors.primary) },
  })
  pptxSlide.addText(`${slide.action}  \u2192`, {
    x: contentX + PAD, y: 5.6, w: 2.5, h: 0.55,
    fontSize: 13, fontFace: 'Arial', bold: true, color: 'F5F5F5',
    align: 'center', valign: 'middle',
  })
}

export async function exportPPTX(
  presentation: Presentation,
  graphics: Record<number, GraphicState>,
  colors: ThemeColors,
): Promise<void> {
  const { default: PptxGenJS } = await import('pptxgenjs')
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.title = presentation.title
  pptx.author = 'Agenticsis'

  const tc = textColors(colors.bg)

  for (let i = 0; i < presentation.slides.length; i++) {
    const slideData = presentation.slides[i]
    const pptxSlide = pptx.addSlide()

    // Background
    pptxSlide.background = { color: hex(colors.bg) }

    // Build native content based on slide type
    switch (slideData.type) {
      case 'hero':   buildHero(pptxSlide, slideData, tc, colors); break
      case 'bullets': buildBullets(pptxSlide, slideData, tc, colors); break
      case 'split':  buildSplit(pptxSlide, slideData, tc, colors); break
      case 'quote':  buildQuote(pptxSlide, slideData, tc, colors); break
      case 'stat':   buildStat(pptxSlide, slideData, tc, colors); break
      case 'cta':    buildCta(pptxSlide, slideData, tc, colors); break
    }

    // Add graphic panel (right side for most, left side for CTA)
    const g = graphics[i]
    const side = slideData.type === 'cta' ? 'left' : 'right'
    await addGraphicPanel(pptxSlide, g, side)
  }

  await pptx.writeFile({ fileName: `${slugify(presentation.title)}-slides.pptx` })
}
