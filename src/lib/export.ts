import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

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

export async function exportPPTX(
  elements: HTMLElement[],
  title: string,
  bgColor = '#0A0A0A'
): Promise<void> {
  // Wait for all slides' animations in parallel before capturing any
  await Promise.all(elements.map(el => waitForAnimations(el)))

  const { default: PptxGenJS } = await import('pptxgenjs')
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'

  for (const el of elements) {
    const canvas = await toCanvas(el, bgColor)
    const data = canvas.toDataURL('image/jpeg', 0.92)
    const slide = pptx.addSlide()
    slide.addImage({ data, x: 0, y: 0, w: '100%', h: '100%' })
  }

  await pptx.writeFile({ fileName: `${slugify(title)}-slides.pptx` })
}
