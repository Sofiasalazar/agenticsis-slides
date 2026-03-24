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
// Falls back to maxWaitMs if anything goes wrong or animations run long.
async function waitForAnimations(el: HTMLElement, maxWaitMs = 9000): Promise<void> {
  // Small pause so injected HTML graphics have time to start their animations
  await new Promise(r => setTimeout(r, 100))
  try {
    const finite = collectAnimations(el).filter(isFiniteAnimation)
    if (finite.length === 0) return
    await Promise.race([
      Promise.all(finite.map(a => a.finished.catch(() => {}))),
      new Promise(r => setTimeout(r, maxWaitMs)),
    ])
  } catch {
    await new Promise(r => setTimeout(r, maxWaitMs))
  }
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
