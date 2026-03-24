import type { Slide, GraphicState } from '../types/slide'
import { HeroSlide, BulletsSlide, SplitSlide, QuoteSlide, StatSlide, CtaSlide } from './slides'

interface SlideRendererProps {
  slide: Slide
  onUpdate?: (updated: Slide) => void
  graphic?: GraphicState
  onRegenerateGraphic?: (prompt?: string) => void
  onUploadImage?: (dataUrl: string) => void
  onClearGraphic?: () => void
  onSkipGraphic?: () => void
  onUnskipGraphic?: () => void
  isExporting?: boolean
  height?: string
}

export function SlideRenderer({
  slide, onUpdate, graphic, onRegenerateGraphic, onUploadImage,
  onClearGraphic, onSkipGraphic, onUnskipGraphic, isExporting, height
}: SlideRendererProps) {
  const shared = { graphic, onRegenerateGraphic, onUploadImage, onClearGraphic, onSkipGraphic, onUnskipGraphic, isExporting, height }

  switch (slide.type) {
    case 'hero':    return <HeroSlide    slide={slide} onUpdate={s => onUpdate?.(s)} {...shared} />
    case 'bullets': return <BulletsSlide slide={slide} onUpdate={s => onUpdate?.(s)} {...shared} />
    case 'split':   return <SplitSlide   slide={slide} onUpdate={s => onUpdate?.(s)} {...shared} />
    case 'quote':   return <QuoteSlide   slide={slide} onUpdate={s => onUpdate?.(s)} {...shared} />
    case 'stat':    return <StatSlide    slide={slide} onUpdate={s => onUpdate?.(s)} {...shared} />
    case 'cta':     return <CtaSlide     slide={slide} onUpdate={s => onUpdate?.(s)} {...shared} />
    default:        return null
  }
}
