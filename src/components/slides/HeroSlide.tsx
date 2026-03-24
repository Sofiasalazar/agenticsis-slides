import type { HeroSlide as HeroSlideType, GraphicState } from '../../types/slide'
import { GraphicFrame } from '../GraphicFrame'

interface Props {
  slide: HeroSlideType
  onUpdate?: (s: HeroSlideType) => void
  graphic?: GraphicState
  onRegenerateGraphic?: (prompt?: string) => void
  onUploadImage?: (dataUrl: string) => void
  onClearGraphic?: () => void
  onSkipGraphic?: () => void
  onUnskipGraphic?: () => void
  isExporting?: boolean
  height?: string
}

export function HeroSlide({ slide, onUpdate, graphic, onRegenerateGraphic, onUploadImage, onClearGraphic, onSkipGraphic, onUnskipGraphic, isExporting, height }: Props) {
  const h = height ?? 'calc(100vh - 56px)'
  const editable = !!onUpdate && !isExporting

  return (
    <div className="slide-page" style={{
      height: h, minHeight: h, display: 'grid', gridTemplateColumns: '55fr 45fr',
      background: '#0A0A0A', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background layers */}
      <div className="grid-bg" style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '-120px', left: '-180px',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(139,92,246,0.20) 0%, transparent 65%)',
        }} />
      </div>
      <div className="accent-bar" style={{
        position: 'absolute', left: 0, top: '15%', bottom: '15%',
        width: '3px', opacity: 0.7, borderRadius: '0 2px 2px 0',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '64px 48px 64px 64px', gap: '16px',
      }}>
        {slide.badge && (
          <span style={{
            display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: '6px',
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '5px 14px', borderRadius: '999px',
            background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', color: '#8b5cf6',
          }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#84cc16', display: 'inline-block' }} />
            <span
              contentEditable={editable}
              suppressContentEditableWarning
              className={editable ? 'editable' : ''}
              onBlur={e => onUpdate?.({ ...slide, badge: e.currentTarget.textContent || slide.badge })}
            >{slide.badge}</span>
          </span>
        )}

        <h1
          contentEditable={editable}
          suppressContentEditableWarning
          className={editable ? 'editable' : ''}
          onBlur={e => onUpdate?.({ ...slide, title: e.currentTarget.textContent || slide.title })}
          style={{
            fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 700,
            letterSpacing: '-0.03em', lineHeight: 1.05, color: '#F5F5F5', outline: 'none',
          }}
        >{slide.title}</h1>

        <p
          contentEditable={editable}
          suppressContentEditableWarning
          className={editable ? 'editable' : ''}
          onBlur={e => onUpdate?.({ ...slide, subtitle: e.currentTarget.textContent || slide.subtitle })}
          style={{ fontSize: 'clamp(14px, 1.8vw, 20px)', fontWeight: 300, color: '#A3A3A3', lineHeight: 1.6, outline: 'none' }}
        >{slide.subtitle}</p>

        <div style={{
          marginTop: '4px', height: '1px', width: '60px',
          background: 'linear-gradient(90deg, #8b5cf6, transparent)',
        }} />
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

      <div style={{
        position: 'absolute', bottom: 0, left: '5%', right: '5%', height: '1px', zIndex: 1,
        background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.4), rgba(132,204,22,0.2), transparent)',
      }} />
    </div>
  )
}
