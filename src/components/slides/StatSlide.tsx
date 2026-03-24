import type { StatSlide as StatSlideType, GraphicState } from '../../types/slide'
import { GraphicFrame } from '../GraphicFrame'

interface Props {
  slide: StatSlideType
  onUpdate?: (s: StatSlideType) => void
  graphic?: GraphicState
  onRegenerateGraphic?: (prompt?: string) => void
  onUploadImage?: (dataUrl: string) => void
  onClearGraphic?: () => void
  onSkipGraphic?: () => void
  onUnskipGraphic?: () => void
  isExporting?: boolean
  height?: string
}

export function StatSlide({ slide, onUpdate, graphic, onRegenerateGraphic, onUploadImage, onClearGraphic, onSkipGraphic, onUnskipGraphic, isExporting, height }: Props) {
  const h = height ?? 'calc(100vh - 56px)'
  const editable = !!onUpdate && !isExporting
  const cols = slide.stats.length <= 2 ? 2 : slide.stats.length === 3 ? 3 : 4

  const updateStat = (i: number, field: 'value' | 'label' | 'note', val: string) => {
    const stats = slide.stats.map((s, idx) => idx === i ? { ...s, [field]: val } : s)
    onUpdate?.({ ...slide, stats })
  }

  return (
    <div className="slide-page" style={{
      height: h, minHeight: h, display: 'grid', gridTemplateColumns: '55fr 45fr',
      background: '#0A0A0A', overflow: 'hidden',
    }}>
      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px 48px 64px 64px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#84cc16', flexShrink: 0 }} />
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#84cc16' }}>
            By the numbers
          </span>
        </div>

        <h2
          contentEditable={editable}
          suppressContentEditableWarning
          className={editable ? 'editable' : ''}
          onBlur={e => onUpdate?.({ ...slide, title: e.currentTarget.textContent || slide.title })}
          style={{
            fontSize: 'clamp(22px, 3vw, 40px)', fontWeight: 700,
            letterSpacing: '-0.025em', color: '#F5F5F5', marginBottom: '28px', outline: 'none',
          }}
        >{slide.title}</h2>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(cols, 2)}, 1fr)`, gap: '12px' }}>
          {slide.stats.map((stat, i) => (
            <div key={i} className="card-hover" style={{
              padding: '20px 18px', borderRadius: '14px', display: 'flex', flexDirection: 'column',
              background: 'rgba(255,255,255,0.03)',
            }}>
              <span
                contentEditable={editable}
                suppressContentEditableWarning
                className={editable ? 'editable' : ''}
                onBlur={e => updateStat(i, 'value', e.currentTarget.textContent || stat.value)}
                style={{
                  fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700,
                  letterSpacing: '-0.03em', marginBottom: '6px', display: 'block', outline: 'none',
                  background: i % 2 === 0 ? 'linear-gradient(135deg, #8b5cf6, #9333ea)' : 'linear-gradient(135deg, #84cc16, #65a30d)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}
              >{stat.value}</span>
              <span
                contentEditable={editable}
                suppressContentEditableWarning
                className={editable ? 'editable' : ''}
                onBlur={e => updateStat(i, 'label', e.currentTarget.textContent || stat.label)}
                style={{ fontSize: '13px', fontWeight: 600, color: '#F5F5F5', marginBottom: '2px', display: 'block', outline: 'none' }}
              >{stat.label}</span>
              {stat.note && (
                <span
                  contentEditable={editable}
                  suppressContentEditableWarning
                  className={editable ? 'editable' : ''}
                  onBlur={e => updateStat(i, 'note', e.currentTarget.textContent || '')}
                  style={{ fontSize: '11px', color: '#525252', display: 'block', outline: 'none' }}
                >{stat.note}</span>
              )}
            </div>
          ))}
        </div>
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
