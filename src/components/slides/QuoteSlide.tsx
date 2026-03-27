import type { QuoteSlide as QuoteSlideType, GraphicState } from '../../types/slide'
import { GraphicFrame } from '../GraphicFrame'

interface Props {
  slide: QuoteSlideType
  onUpdate?: (s: QuoteSlideType) => void
  graphic?: GraphicState
  onRegenerateGraphic?: (prompt?: string) => void
  onUploadImage?: (dataUrl: string) => void
  onClearGraphic?: () => void
  onSkipGraphic?: () => void
  onUnskipGraphic?: () => void
  isExporting?: boolean
  height?: string
}

export function QuoteSlide({ slide, onUpdate, graphic, onRegenerateGraphic, onUploadImage, onClearGraphic, onSkipGraphic, onUnskipGraphic, isExporting, height }: Props) {
  const h = height ?? 'calc(100vh - 56px)'
  const editable = !!onUpdate && !isExporting

  return (
    <div className="slide-page" style={{
      height: h, minHeight: h, display: 'grid', gridTemplateColumns: '55fr 45fr',
      background: 'var(--color-bg, #0A0A0A)', position: 'relative', overflow: 'hidden',
    }}>
      {/* Radial bg */}
      <div style={{
        position: 'absolute', top: '50%', left: '27%', transform: 'translate(-50%, -50%)',
        width: '500px', height: '500px', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(139,92,246,0.09) 0%, transparent 70%)',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '64px 48px 64px 64px',
      }}>
        <div style={{
          fontSize: '64px', lineHeight: 0.8, marginBottom: '16px',
          fontFamily: 'Georgia, serif', userSelect: 'none',
          background: 'linear-gradient(90deg, #8b5cf6, #84cc16)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text', opacity: 0.7,
        }}>"</div>

        <blockquote
          contentEditable={editable}
          suppressContentEditableWarning
          className={editable ? 'editable' : ''}
          onBlur={e => onUpdate?.({ ...slide, quote: e.currentTarget.textContent || slide.quote })}
          style={{
            fontSize: 'clamp(18px, 2.2vw, 28px)', fontWeight: 500,
            color: 'var(--color-text, #F5F5F5)', lineHeight: 1.55, letterSpacing: '-0.01em',
            marginBottom: '28px', outline: 'none',
          }}
        >{slide.quote}</blockquote>

        {slide.attribution && (
          <p
            contentEditable={editable}
            suppressContentEditableWarning
            className={editable ? 'editable' : ''}
            onBlur={e => onUpdate?.({ ...slide, attribution: e.currentTarget.textContent || '' })}
            style={{ fontSize: '13px', fontWeight: 600, color: '#8b5cf6', marginBottom: '4px', outline: 'none' }}
          >— {slide.attribution}</p>
        )}
        {slide.context && (
          <p
            contentEditable={editable}
            suppressContentEditableWarning
            className={editable ? 'editable' : ''}
            onBlur={e => onUpdate?.({ ...slide, context: e.currentTarget.textContent || '' })}
            style={{ fontSize: '12px', color: 'var(--color-text-dim, #525252)', outline: 'none' }}
          >{slide.context}</p>
        )}
      </div>

      {/* Graphic panel */}
      <div style={{ position: 'relative', zIndex: 1, borderLeft: '1px solid #1a1a1a', overflow: 'hidden' }}>
        {graphic && (
          <GraphicFrame
            graphic={graphic}
            onGenerate={p => onRegenerateGraphic?.(p)}
            onUpload={d => onUploadImage?.(d)}
            onClear={() => onClearGraphic?.()}
            onSkip={() => onSkipGraphic?.()}
            onUnskip={() => onUnskipGraphic?.()}
            isExporting={isExporting}
          />
        )}
      </div>
    </div>
  )
}
