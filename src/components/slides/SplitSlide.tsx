import type { SplitSlide as SplitSlideType, GraphicState } from '../../types/slide'
import { GraphicFrame } from '../GraphicFrame'

interface Props {
  slide: SplitSlideType
  onUpdate?: (s: SplitSlideType) => void
  graphic?: GraphicState
  onRegenerateGraphic?: (prompt?: string) => void
  onUploadImage?: (dataUrl: string) => void
  onClearGraphic?: () => void
  isExporting?: boolean
  height?: string
}

export function SplitSlide({ slide, onUpdate, graphic, onRegenerateGraphic, onUploadImage, onClearGraphic, isExporting, height }: Props) {
  const h = height ?? 'calc(100vh - 56px)'
  const editable = !!onUpdate && !isExporting

  return (
    <div className="slide-page" style={{
      height: h, minHeight: h, display: 'grid', gridTemplateColumns: '55fr 45fr',
      background: '#0A0A0A', overflow: 'hidden',
    }}>
      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '56px 40px 56px 64px', overflow: 'hidden' }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{
            padding: '24px', borderRadius: '14px',
            background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)',
          }}>
            {slide.leftLabel && (
              <p
                contentEditable={editable}
                suppressContentEditableWarning
                className={editable ? 'editable' : ''}
                onBlur={e => onUpdate?.({ ...slide, leftLabel: e.currentTarget.textContent || '' })}
                style={{
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: '#8b5cf6', marginBottom: '10px', outline: 'none',
                }}
              >{slide.leftLabel}</p>
            )}
            <p
              contentEditable={editable}
              suppressContentEditableWarning
              className={editable ? 'editable' : ''}
              onBlur={e => onUpdate?.({ ...slide, left: e.currentTarget.textContent || slide.left })}
              style={{ fontSize: '13px', color: '#D1D5DB', lineHeight: 1.7, outline: 'none' }}
            >{slide.left}</p>
          </div>

          <div style={{
            padding: '24px', borderRadius: '14px',
            background: 'rgba(132,204,22,0.05)', border: '1px solid rgba(132,204,22,0.15)',
          }}>
            {slide.rightLabel && (
              <p
                contentEditable={editable}
                suppressContentEditableWarning
                className={editable ? 'editable' : ''}
                onBlur={e => onUpdate?.({ ...slide, rightLabel: e.currentTarget.textContent || '' })}
                style={{
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: '#84cc16', marginBottom: '10px', outline: 'none',
                }}
              >{slide.rightLabel}</p>
            )}
            <p
              contentEditable={editable}
              suppressContentEditableWarning
              className={editable ? 'editable' : ''}
              onBlur={e => onUpdate?.({ ...slide, right: e.currentTarget.textContent || slide.right })}
              style={{ fontSize: '13px', color: '#D1D5DB', lineHeight: 1.7, outline: 'none' }}
            >{slide.right}</p>
          </div>
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
            isExporting={isExporting}
          />
        )}
      </div>
    </div>
  )
}
