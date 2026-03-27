import type { BulletsSlide as BulletsSlideType, GraphicState } from '../../types/slide'
import { GraphicFrame } from '../GraphicFrame'

interface Props {
  slide: BulletsSlideType
  onUpdate?: (s: BulletsSlideType) => void
  graphic?: GraphicState
  onRegenerateGraphic?: (prompt?: string) => void
  onUploadImage?: (dataUrl: string) => void
  onClearGraphic?: () => void
  onSkipGraphic?: () => void
  onUnskipGraphic?: () => void
  isExporting?: boolean
  height?: string
}

export function BulletsSlide({ slide, onUpdate, graphic, onRegenerateGraphic, onUploadImage, onClearGraphic, onSkipGraphic, onUnskipGraphic, isExporting, height }: Props) {
  const h = height ?? 'calc(100vh - 56px)'
  const editable = !!onUpdate && !isExporting

  const updateBullet = (i: number, text: string) => {
    const bullets = [...slide.bullets]
    bullets[i] = text
    onUpdate?.({ ...slide, bullets })
  }

  const removeBullet = (i: number) => {
    const bullets = slide.bullets.filter((_, idx) => idx !== i)
    onUpdate?.({ ...slide, bullets })
  }

  const addBullet = () => {
    onUpdate?.({ ...slide, bullets: [...slide.bullets, 'New point'] })
  }

  return (
    <div className="slide-page" style={{
      height: h, minHeight: h, display: 'grid', gridTemplateColumns: '55fr 45fr',
      background: 'var(--color-bg, #0A0A0A)', overflow: 'hidden',
    }}>
      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px 48px 64px 64px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6', flexShrink: 0 }} />
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8b5cf6' }}>
            Key Points
          </span>
        </div>

        <h2
          contentEditable={editable}
          suppressContentEditableWarning
          className={editable ? 'editable' : ''}
          onBlur={e => onUpdate?.({ ...slide, title: e.currentTarget.textContent || slide.title })}
          style={{
            fontSize: 'clamp(24px, 3.5vw, 44px)', fontWeight: 700,
            letterSpacing: '-0.025em', color: 'var(--color-text, #F5F5F5)', marginBottom: '8px', outline: 'none',
          }}
        >{slide.title}</h2>

        {slide.description && (
          <p
            contentEditable={editable}
            suppressContentEditableWarning
            className={editable ? 'editable' : ''}
            onBlur={e => onUpdate?.({ ...slide, description: e.currentTarget.textContent || '' })}
            style={{ fontSize: '14px', color: 'var(--color-text-muted, #A3A3A3)', marginBottom: '24px', lineHeight: 1.6, outline: 'none' }}
          >{slide.description}</p>
        )}
        {!slide.description && <div style={{ marginBottom: '24px' }} />}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {slide.bullets.map((bullet, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', position: 'relative' }}
              className={editable ? 'bullet-row' : ''}>
              <span style={{
                flexShrink: 0, width: '24px', height: '24px', borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, marginTop: '2px',
                background: i % 2 === 0 ? 'rgba(139,92,246,0.15)' : 'rgba(132,204,22,0.12)',
                color: i % 2 === 0 ? '#8b5cf6' : '#84cc16',
              }}>{i + 1}</span>
              <span
                contentEditable={editable}
                suppressContentEditableWarning
                className={editable ? 'editable' : ''}
                onBlur={e => updateBullet(i, e.currentTarget.textContent || bullet)}
                style={{ fontSize: '15px', color: 'var(--color-text-body, #D1D5DB)', lineHeight: 1.6, outline: 'none', flex: 1 }}
              >{bullet}</span>
              {editable && (
                <button
                  onClick={() => removeBullet(i)}
                  className="bullet-remove"
                  style={{
                    flexShrink: 0, background: 'none', border: 'none', color: '#3a3a3a',
                    cursor: 'pointer', fontSize: '14px', padding: '2px 4px',
                    opacity: 0, transition: 'opacity 0.15s', fontFamily: 'inherit',
                  }}
                >×</button>
              )}
            </div>
          ))}
        </div>

        {editable && (
          <button
            onClick={addBullet}
            style={{
              alignSelf: 'flex-start', marginTop: '12px', padding: '5px 12px',
              borderRadius: '6px', fontSize: '11px', fontWeight: 600,
              background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
              color: '#8b5cf6', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >+ Add point</button>
        )}
      </div>

      {/* Graphic panel */}
      <div style={{ borderLeft: '1px solid #1a1a1a', overflow: 'hidden' }}>
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
