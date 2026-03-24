import { useRef, useState } from 'react'
import type { GraphicState } from '../types/slide'

interface GraphicFrameProps {
  graphic: GraphicState
  onGenerate: (prompt: string) => void
  onUpload: (dataUrl: string) => void
  onClear: () => void
  onSkip: () => void
  onUnskip: () => void
  isExporting?: boolean
}

export function GraphicFrame({ graphic, onGenerate, onUpload, onClear, onSkip, onUnskip, isExporting }: GraphicFrameProps) {
  const [editingPrompt, setEditingPrompt] = useState(false)
  const [promptDraft, setPromptDraft] = useState(graphic.prompt)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUploadClick = () => fileRef.current?.click()
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { if (typeof ev.target?.result === 'string') onUpload(ev.target.result) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const hasContent = !!(graphic.html || graphic.uploadedImage)

  // Export mode: just render content
  if (isExporting) {
    if (graphic.skipped || (!hasContent && !graphic.loading)) {
      return <div style={{ width: '100%', height: '100%', background: '#0A0A0A' }} />
    }
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
          dangerouslySetInnerHTML={{ __html: graphic.html }} />
      )
    }
    return <div style={{ width: '100%', height: '100%', background: '#0A0A0A' }} />
  }

  // Skipped state: empty panel with a subtle "Add graphic" option on hover
  if (graphic.skipped) {
    return (
      <div style={{
        width: '100%', height: '100%', background: '#080808',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <button
          onClick={onUnskip}
          style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
            background: 'rgba(255,255,255,0.04)', border: '1px solid #1a1a1a',
            color: '#3a3a3a', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#A3A3A3'; e.currentTarget.style.borderColor = '#262626' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#3a3a3a'; e.currentTarget.style.borderColor = '#1a1a1a' }}
        >+ Add graphic</button>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0A0A0A', overflow: 'hidden' }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* Loading */}
      {graphic.loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '12px', background: '#0A0A0A',
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            border: '2px solid #262626', borderTopColor: 'var(--color-primary, #8b5cf6)',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ fontSize: '11px', color: '#525252', fontWeight: 500 }}>Generating graphic...</p>
        </div>
      )}

      {/* Uploaded image */}
      {!graphic.loading && graphic.uploadedImage && (
        <img src={graphic.uploadedImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      )}

      {/* Generated HTML */}
      {!graphic.loading && !graphic.uploadedImage && graphic.html && (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}
          dangerouslySetInnerHTML={{ __html: graphic.html }} />
      )}

      {/* Empty placeholder state */}
      {!graphic.loading && !hasContent && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '20px', gap: '12px',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.04) 0%, rgba(132,204,22,0.03) 100%)',
          borderLeft: '1px solid #1a1a1a',
        }}>
          <div className="grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.4 }} />

          <div style={{ position: 'relative', zIndex: 1, width: '100%', textAlign: 'center' }}>
            {/* AI icon */}
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px', margin: '0 auto 12px',
              background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="2.5" fill="var(--color-primary, #8b5cf6)" />
                <path d="M8 1v2.5M8 12.5V15M1 8h2.5M12.5 8H15M2.93 2.93l1.77 1.77M11.3 11.3l1.77 1.77M2.93 13.07l1.77-1.77M11.3 4.7l1.77-1.77" stroke="var(--color-primary, #8b5cf6)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>

            {!editingPrompt ? (
              <>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-primary, #8b5cf6)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  AI Suggestion
                </p>
                <p style={{ fontSize: '11px', color: '#525252', lineHeight: 1.5, marginBottom: '16px', maxWidth: '180px', margin: '0 auto 16px' }}>
                  {graphic.prompt}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    onClick={() => onGenerate(graphic.prompt)}
                    style={{
                      width: '100%', padding: '8px', borderRadius: '8px',
                      background: 'linear-gradient(135deg, var(--color-primary, #8b5cf6), #9333ea)',
                      border: 'none', color: '#F5F5F5', fontSize: '12px', fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >Generate chart</button>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => { setPromptDraft(graphic.prompt); setEditingPrompt(true) }}
                      style={{ flex: 1, padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid #1a1a1a', color: '#A3A3A3', fontSize: '10px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Edit prompt
                    </button>
                    <button onClick={handleUploadClick}
                      style={{ flex: 1, padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid #1a1a1a', color: '#A3A3A3', fontSize: '10px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Upload image
                    </button>
                  </div>
                  {/* Skip option */}
                  <button onClick={onSkip}
                    style={{ width: '100%', padding: '5px', borderRadius: '6px', background: 'none', border: 'none', color: '#3a3a3a', fontSize: '10px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#525252')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#3a3a3a')}>
                    ✕ No graphic for this slide
                  </button>
                </div>
              </>
            ) : (
              <div style={{ width: '100%' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-primary, #8b5cf6)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Edit Prompt</p>
                <textarea value={promptDraft} onChange={e => setPromptDraft(e.target.value)} rows={3}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid #262626', color: '#F5F5F5', fontSize: '11px', fontFamily: 'inherit', resize: 'none', outline: 'none', lineHeight: 1.5, marginBottom: '6px' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#262626')}
                  autoFocus />
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={() => setEditingPrompt(false)}
                    style={{ flex: 1, padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid #1a1a1a', color: '#A3A3A3', fontSize: '10px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancel
                  </button>
                  <button onClick={() => { setEditingPrompt(false); onGenerate(promptDraft) }}
                    style={{ flex: 1, padding: '6px', borderRadius: '6px', background: 'linear-gradient(135deg, var(--color-primary, #8b5cf6), #9333ea)', border: 'none', color: '#F5F5F5', fontSize: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Generate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Always-visible control bar when content exists */}
      {hasContent && !graphic.loading && !editingPrompt && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1px',
          padding: '6px 8px',
          background: 'linear-gradient(to top, rgba(10,10,10,0.85) 0%, transparent 100%)',
        }}>
          <button onClick={() => { setPromptDraft(graphic.prompt); setEditingPrompt(true) }}
            title="Regenerate with new prompt"
            style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: 'rgba(15,15,15,0.8)', border: '1px solid #1a1a1a', color: '#525252', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', backdropFilter: 'blur(4px)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#F5F5F5'; e.currentTarget.style.borderColor = '#262626' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#525252'; e.currentTarget.style.borderColor = '#1a1a1a' }}>
            Regenerate
          </button>
          <button onClick={handleUploadClick} title="Upload your own image"
            style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: 'rgba(15,15,15,0.8)', border: '1px solid #1a1a1a', color: '#525252', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', backdropFilter: 'blur(4px)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#F5F5F5'; e.currentTarget.style.borderColor = '#262626' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#525252'; e.currentTarget.style.borderColor = '#1a1a1a' }}>
            Upload
          </button>
          <button onClick={onClear} title="Remove graphic"
            style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: 'rgba(15,15,15,0.8)', border: '1px solid #1a1a1a', color: '#3a3a3a', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', backdropFilter: 'blur(4px)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fca5a5'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#3a3a3a'; e.currentTarget.style.borderColor = '#1a1a1a' }}>
            ✕ Remove
          </button>
        </div>
      )}

      {/* Regenerate prompt overlay on top of content */}
      {hasContent && !graphic.loading && editingPrompt && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-primary, #8b5cf6)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Edit Prompt</p>
          <textarea value={promptDraft} onChange={e => setPromptDraft(e.target.value)} rows={4}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid #262626', color: '#F5F5F5', fontSize: '11px', fontFamily: 'inherit', resize: 'none', outline: 'none', lineHeight: 1.5, marginBottom: '8px' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)')}
            onBlur={e => (e.currentTarget.style.borderColor = '#262626')}
            autoFocus />
          <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
            <button onClick={() => setEditingPrompt(false)}
              style={{ flex: 1, padding: '7px', borderRadius: '7px', background: 'rgba(255,255,255,0.05)', border: '1px solid #262626', color: '#A3A3A3', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button onClick={() => { setEditingPrompt(false); onGenerate(promptDraft) }}
              style={{ flex: 1, padding: '7px', borderRadius: '7px', background: 'linear-gradient(135deg, var(--color-primary, #8b5cf6), #9333ea)', border: 'none', color: '#F5F5F5', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Generate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
