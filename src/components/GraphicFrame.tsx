import { useRef, useState } from 'react'
import type { GraphicState } from '../types/slide'

interface GraphicFrameProps {
  graphic: GraphicState
  onGenerate: (prompt: string) => void
  onUpload: (dataUrl: string) => void
  onClear: () => void
  isExporting?: boolean
}

export function GraphicFrame({ graphic, onGenerate, onUpload, onClear, isExporting }: GraphicFrameProps) {
  const [editingPrompt, setEditingPrompt] = useState(false)
  const [promptDraft, setPromptDraft] = useState(graphic.prompt)
  const [hovered, setHovered] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUploadClick = () => fileRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      if (typeof ev.target?.result === 'string') onUpload(ev.target.result)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const hasContent = !!(graphic.html || graphic.uploadedImage)

  // During export: just render the graphic, no controls
  if (isExporting) {
    if (graphic.uploadedImage) {
      return (
        <div style={{ width: '100%', height: '100%', background: '#0A0A0A', overflow: 'hidden' }}>
          <img src={graphic.uploadedImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )
    }
    if (graphic.html) {
      return (
        <div style={{ width: '100%', height: '100%', background: '#0A0A0A', overflow: 'hidden' }}
          dangerouslySetInnerHTML={{ __html: graphic.html }}
        />
      )
    }
    return <div style={{ width: '100%', height: '100%', background: '#111' }} />
  }

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative', background: '#0A0A0A', overflow: 'hidden' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setEditingPrompt(false) }}
    >
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* Content area */}
      {graphic.loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', background: '#0A0A0A' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            border: '2px solid #262626', borderTopColor: '#8b5cf6',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ fontSize: '12px', color: '#525252', fontWeight: 500 }}>Generating graphic...</p>
        </div>
      )}

      {!graphic.loading && graphic.uploadedImage && (
        <img src={graphic.uploadedImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      )}

      {!graphic.loading && !graphic.uploadedImage && graphic.html && (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}
          dangerouslySetInnerHTML={{ __html: graphic.html }}
        />
      )}

      {!graphic.loading && !hasContent && (
        /* Empty placeholder */
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '24px', gap: '16px',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.04) 0%, rgba(132,204,22,0.03) 100%)',
          borderLeft: '1px solid #1a1a1a',
        }}>
          {/* Subtle grid */}
          <div className="grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.5 }} />

          <div style={{ position: 'relative', zIndex: 1, width: '100%', textAlign: 'center' }}>
            {/* AI icon */}
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px', margin: '0 auto 16px',
              background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="3" fill="#8b5cf6" />
                <path d="M9 1v3M9 14v3M1 9h3M14 9h3M3.22 3.22l2.12 2.12M12.66 12.66l2.12 2.12M3.22 14.78l2.12-2.12M12.66 5.34l2.12-2.12" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Prompt preview */}
            {!editingPrompt ? (
              <>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#8b5cf6', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  AI Suggestion
                </p>
                <p style={{ fontSize: '12px', color: '#525252', lineHeight: 1.6, marginBottom: '20px', maxWidth: '200px', margin: '0 auto 20px' }}>
                  {graphic.prompt}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <button
                    onClick={() => onGenerate(graphic.prompt)}
                    style={{
                      width: '100%', padding: '9px 16px', borderRadius: '8px',
                      background: 'linear-gradient(135deg, #8b5cf6, #9333ea)',
                      border: '1px solid rgba(139,92,246,0.4)',
                      color: '#F5F5F5', fontSize: '12px', fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    Generate Graphic
                  </button>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => { setPromptDraft(graphic.prompt); setEditingPrompt(true) }}
                      style={{
                        flex: 1, padding: '7px', borderRadius: '8px',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid #1a1a1a',
                        color: '#A3A3A3', fontSize: '11px', fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      Edit prompt
                    </button>
                    <button
                      onClick={handleUploadClick}
                      style={{
                        flex: 1, padding: '7px', borderRadius: '8px',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid #1a1a1a',
                        color: '#A3A3A3', fontSize: '11px', fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      Upload image
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Prompt editing UI */
              <div style={{ width: '100%' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#8b5cf6', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Edit Prompt
                </p>
                <textarea
                  value={promptDraft}
                  onChange={e => setPromptDraft(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid #262626',
                    color: '#F5F5F5', fontSize: '12px', fontFamily: 'inherit',
                    resize: 'none', outline: 'none', lineHeight: 1.6, marginBottom: '8px',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#262626')}
                />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setEditingPrompt(false)}
                    style={{
                      flex: 1, padding: '7px', borderRadius: '8px',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid #1a1a1a',
                      color: '#A3A3A3', fontSize: '11px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { setEditingPrompt(false); onGenerate(promptDraft) }}
                    style={{
                      flex: 1, padding: '7px', borderRadius: '8px',
                      background: 'linear-gradient(135deg, #8b5cf6, #9333ea)',
                      border: '1px solid rgba(139,92,246,0.4)',
                      color: '#F5F5F5', fontSize: '11px', fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Generate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hover toolbar — when content exists */}
      {hasContent && !graphic.loading && hovered && (
        <div style={{
          position: 'absolute', bottom: '12px', right: '12px', zIndex: 10,
          display: 'flex', gap: '6px',
        }}>
          <button
            onClick={() => { setPromptDraft(graphic.prompt); setEditingPrompt(true) }}
            title="Regenerate with new prompt"
            style={{
              padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
              background: 'rgba(10,10,10,0.9)', border: '1px solid #262626',
              color: '#A3A3A3', cursor: 'pointer', fontFamily: 'inherit',
              backdropFilter: 'blur(8px)', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#F5F5F5'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#A3A3A3'; e.currentTarget.style.borderColor = '#262626' }}
          >
            Regenerate
          </button>
          <button
            onClick={handleUploadClick}
            title="Upload image"
            style={{
              padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
              background: 'rgba(10,10,10,0.9)', border: '1px solid #262626',
              color: '#A3A3A3', cursor: 'pointer', fontFamily: 'inherit',
              backdropFilter: 'blur(8px)', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#F5F5F5'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#A3A3A3'; e.currentTarget.style.borderColor = '#262626' }}
          >
            Upload
          </button>
          <button
            onClick={onClear}
            title="Remove graphic"
            style={{
              padding: '6px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
              background: 'rgba(10,10,10,0.9)', border: '1px solid #262626',
              color: '#525252', cursor: 'pointer', fontFamily: 'inherit',
              backdropFilter: 'blur(8px)', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fca5a5'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#525252'; e.currentTarget.style.borderColor = '#262626' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Regenerate prompt overlay — on generated content */}
      {hasContent && !graphic.loading && editingPrompt && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#8b5cf6', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
            Edit Prompt
          </p>
          <textarea
            value={promptDraft}
            onChange={e => setPromptDraft(e.target.value)}
            rows={4}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid #262626',
              color: '#F5F5F5', fontSize: '12px', fontFamily: 'inherit',
              resize: 'none', outline: 'none', lineHeight: 1.6, marginBottom: '10px',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)')}
            onBlur={e => (e.currentTarget.style.borderColor = '#262626')}
            autoFocus
          />
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <button
              onClick={() => setEditingPrompt(false)}
              style={{
                flex: 1, padding: '8px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid #262626',
                color: '#A3A3A3', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => { setEditingPrompt(false); onGenerate(promptDraft) }}
              style={{
                flex: 1, padding: '8px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #8b5cf6, #9333ea)',
                border: '1px solid rgba(139,92,246,0.4)',
                color: '#F5F5F5', fontSize: '12px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Generate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
