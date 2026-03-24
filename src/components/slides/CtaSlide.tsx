import type { CtaSlide as CtaSlideType, GraphicState } from '../../types/slide'
import { GraphicFrame } from '../GraphicFrame'

interface Props {
  slide: CtaSlideType
  onUpdate?: (s: CtaSlideType) => void
  graphic?: GraphicState
  onRegenerateGraphic?: (prompt?: string) => void
  onUploadImage?: (dataUrl: string) => void
  onClearGraphic?: () => void
  isExporting?: boolean
  height?: string
}

export function CtaSlide({ slide, onUpdate, graphic, onRegenerateGraphic, onUploadImage, onClearGraphic, isExporting, height }: Props) {
  const h = height ?? 'calc(100vh - 56px)'
  const editable = !!onUpdate && !isExporting

  return (
    <div className="slide-page" style={{
      height: h, minHeight: h, display: 'grid', gridTemplateColumns: '45fr 55fr',
      background: '#0A0A0A', position: 'relative', overflow: 'hidden',
    }}>
      {/* Graphic panel — left side */}
      <div style={{ borderRight: '1px solid #1a1a1a', overflow: 'hidden' }}>
        {graphic && (
          <GraphicFrame
            graphic={graphic}
            onGenerate={p => onRegenerateGraphic?.(p)}
            onUpload={d => onUploadImage?.(d)}
            onClear={() => onClearGraphic?.()}
            isExporting={isExporting}
          />
        )}
      </div>

      {/* Content — right side */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '64px 64px 64px 48px', textAlign: 'left',
      }}>
        {/* Radial bg */}
        <div style={{
          position: 'absolute', top: '-40px', right: '-80px', pointerEvents: 'none',
          width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(132,204,22,0.10) 0%, transparent 65%)',
        }} />

        <div className="accent-bar" style={{
          width: '40px', height: '3px', borderRadius: '999px', marginBottom: '28px',
        }} />

        <h2
          contentEditable={editable}
          suppressContentEditableWarning
          className={editable ? 'editable' : ''}
          onBlur={e => onUpdate?.({ ...slide, headline: e.currentTarget.textContent || slide.headline })}
          style={{
            fontSize: 'clamp(26px, 4vw, 52px)', fontWeight: 700,
            letterSpacing: '-0.03em', lineHeight: 1.08,
            color: '#F5F5F5', marginBottom: '16px', outline: 'none',
          }}
        >{slide.headline}</h2>

        <p
          contentEditable={editable}
          suppressContentEditableWarning
          className={editable ? 'editable' : ''}
          onBlur={e => onUpdate?.({ ...slide, subtext: e.currentTarget.textContent || slide.subtext })}
          style={{
            fontSize: 'clamp(13px, 1.5vw, 18px)', fontWeight: 300,
            color: '#A3A3A3', lineHeight: 1.65, marginBottom: '36px', outline: 'none',
          }}
        >{slide.subtext}</p>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px',
          padding: '12px 28px', borderRadius: '12px', alignSelf: 'flex-start',
          background: 'linear-gradient(135deg, #8b5cf6, #9333ea)',
          border: '1px solid rgba(139,92,246,0.4)',
          boxShadow: '0 0 32px rgba(139,92,246,0.20)',
        }}>
          <span
            contentEditable={editable}
            suppressContentEditableWarning
            className={editable ? 'editable' : ''}
            onBlur={e => onUpdate?.({ ...slide, action: e.currentTarget.textContent || slide.action })}
            style={{ fontWeight: 700, fontSize: '14px', color: '#F5F5F5', outline: 'none' }}
          >{slide.action}</span>
          <span style={{ fontSize: '16px', color: '#F5F5F5' }}>→</span>
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 0, left: '5%', right: '5%', height: '1px', zIndex: 1,
        background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.4), rgba(132,204,22,0.3), transparent)',
      }} />
    </div>
  )
}
