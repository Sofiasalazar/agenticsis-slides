import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

async function toCanvas(el: HTMLElement): Promise<HTMLCanvasElement> {
  return html2canvas(el, {
    scale: 1.5,
    backgroundColor: '#0A0A0A',
    useCORS: true,
    allowTaint: true,
    logging: false,
  })
}

function slugify(title: string): string {
  return title.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()
}

export async function exportPNG(elements: HTMLElement[], title: string): Promise<void> {
  const zip = new JSZip()
  for (let i = 0; i < elements.length; i++) {
    const canvas = await toCanvas(elements[i])
    const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/png'))
    zip.file(`slide-${String(i + 1).padStart(2, '0')}.png`, blob)
  }
  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, `${slugify(title)}-slides.zip`)
}

export async function exportPPTX(elements: HTMLElement[], title: string): Promise<void> {
  const { default: PptxGenJS } = await import('pptxgenjs')
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'

  for (const el of elements) {
    const canvas = await toCanvas(el)
    const data = canvas.toDataURL('image/jpeg', 0.92)
    const slide = pptx.addSlide()
    slide.addImage({ data, x: 0, y: 0, w: '100%', h: '100%' })
  }

  await pptx.writeFile({ fileName: `${slugify(title)}-slides.pptx` })
}
