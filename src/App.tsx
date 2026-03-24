import { useState } from 'react'
import type { Presentation, Slide, GraphicState } from './types/slide'
import { generatePresentation, generateSlideGraphic, getSlideContext } from './lib/claude'
import { SlideShow } from './components/SlideShow'
import { Logo } from './components/Logo'
import { ApiKeyModal, getStoredApiKey, setStoredApiKey } from './components/ApiKeyModal'

type AppState = 'input' | 'generating' | 'presenting'

const EXAMPLES = [
  'The future of AI in enterprise',
  'Why Agenticsis is different',
  'Go-to-market strategy for a SaaS product',
  'Digital transformation for SMEs',
  'The case for AI implementation now',
]

export default function App() {
  const [state, setState] = useState<AppState>('input')
  const [topic, setTopic] = useState('')
  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [graphics, setGraphics] = useState<Record<number, GraphicState>>({})
  const [streamText, setStreamText] = useState('')
  const [error, setError] = useState('')
  const [apiKey, setApiKey] = useState(getStoredApiKey)
  const [showKeyModal, setShowKeyModal] = useState(!getStoredApiKey())
  const [showKeySettings, setShowKeySettings] = useState(false)

  const handleSaveKey = (key: string) => {
    setStoredApiKey(key)
    setApiKey(key)
    setShowKeyModal(false)
    setShowKeySettings(false)
  }

  const initGraphics = (pres: Presentation): Record<number, GraphicState> => {
    const g: Record<number, GraphicState> = {}
    pres.slides.forEach((slide, i) => {
      g[i] = {
        html: null,
        uploadedImage: null,
        loading: false,
        prompt: slide.graphicPrompt || `Abstract visual for a ${slide.type} slide`,
      }
    })
    return g
  }

  const handleGenerate = async () => {
    if (!topic.trim() || !apiKey) return
    setState('generating')
    setError('')
    setStreamText('')

    try {
      const result = await generatePresentation(topic, apiKey, chunk => setStreamText(chunk))
      setPresentation(result)
      setGraphics(initGraphics(result))
      setState('presenting')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      const isKeyErr = /key|auth|api|unauthorized|401/i.test(msg)
      setError(isKeyErr ? 'API key error — check your key in settings.' : `Generation failed: ${msg}`)
      setState('input')
    }
  }

  const handleUpdateSlide = (index: number, updated: Slide) => {
    if (!presentation) return
    const slides = [...presentation.slides]
    slides[index] = updated
    setPresentation({ ...presentation, slides })
  }

  const handleRegenerateGraphic = async (index: number, customPrompt?: string) => {
    if (!presentation || !apiKey) return
    const slide = presentation.slides[index]
    const prompt = customPrompt || graphics[index]?.prompt || slide.graphicPrompt || ''

    setGraphics(prev => ({
      ...prev,
      [index]: { ...prev[index], loading: true, prompt },
    }))

    try {
      const html = await generateSlideGraphic(prompt, getSlideContext(slide), apiKey)
      setGraphics(prev => ({
        ...prev,
        [index]: { ...prev[index], loading: false, html, uploadedImage: null },
      }))
    } catch {
      setGraphics(prev => ({ ...prev, [index]: { ...prev[index], loading: false } }))
    }
  }

  const handleUploadImage = (index: number, dataUrl: string) => {
    setGraphics(prev => ({
      ...prev,
      [index]: { ...prev[index], html: null, uploadedImage: dataUrl },
    }))
  }

  const handleClearGraphic = (index: number) => {
    setGraphics(prev => ({
      ...prev,
      [index]: { ...prev[index], html: null, uploadedImage: null },
    }))
  }

  const handleBack = () => {
    setState('input')
    setPresentation(null)
    setGraphics({})
    setStreamText('')
  }

  if (state === 'presenting' && presentation) {
    return (
      <>
        <SlideShow
          presentation={presentation}
          graphics={graphics}
          onUpdateSlide={handleUpdateSlide}
          onRegenerateGraphic={handleRegenerateGraphic}
          onUploadImage={handleUploadImage}
          onClearGraphic={handleClearGraphic}
          onBack={handleBack}
        />
        {showKeySettings && (
          <ApiKeyModal isSettings onSave={handleSaveKey} onClose={() => setShowKeySettings(false)} />
        )}
      </>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', flexDirection: 'column' }}>
      {/* API Key modals */}
      {showKeyModal && <ApiKeyModal onSave={handleSaveKey} />}
      {showKeySettings && !showKeyModal && (
        <ApiKeyModal isSettings onSave={handleSaveKey} onClose={() => setShowKeySettings(false)} />
      )}

      {/* Navbar */}
      <nav className="no-print" style={{
        borderBottom: '1px solid #262626', padding: '0 40px', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Logo size={28} color="#FFFFFF" />
          <span style={{ fontWeight: 600, fontSize: '15px', color: '#F5F5F5', letterSpacing: '-0.01em' }}>
            Agenticsis
          </span>
          <span style={{ color: '#262626', margin: '0 4px' }}>|</span>
          <span style={{ fontSize: '13px', color: '#525252', fontWeight: 500 }}>Slides</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowKeySettings(true)}
            style={{
              fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em',
              padding: '5px 12px', borderRadius: '8px',
              background: apiKey ? 'rgba(132,204,22,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${apiKey ? 'rgba(132,204,22,0.2)' : 'rgba(239,68,68,0.2)'}`,
              color: apiKey ? '#84cc16' : '#fca5a5',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {apiKey ? 'API Key ✓' : 'Add API Key'}
          </button>
          <span style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '4px 10px', borderRadius: '999px',
            background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', color: '#8b5cf6',
          }}>Beta</span>
        </div>
      </nav>

      {/* Hero area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', position: 'relative', overflow: 'hidden' }}>
        <div className="grid-bg" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
        <div className="accent-bar" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '3px', opacity: 0.7, zIndex: 1 }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
          <div style={{
            position: 'absolute', top: '-100px', left: '-180px',
            width: '700px', height: '700px',
            background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 65%)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-80px', right: '-140px',
            width: '560px', height: '560px',
            background: 'radial-gradient(circle, rgba(132,204,22,0.10) 0%, transparent 65%)',
          }} />
        </div>

        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '640px' }}>
          {/* Tag */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '5px 14px', borderRadius: '999px',
              background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', color: '#8b5cf6',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#84cc16', display: 'inline-block' }} />
              Powered by Agenticsis
            </span>
          </div>

          <h1 style={{
            textAlign: 'center', fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 700,
            letterSpacing: '-0.03em', lineHeight: 1.1, color: '#F5F5F5', marginBottom: '16px',
          }}>
            Slides that{' '}<span className="gradient-text">think</span>{' '}for you
          </h1>
          <p style={{ textAlign: 'center', fontSize: '16px', color: '#A3A3A3', lineHeight: 1.6, marginBottom: '40px' }}>
            Describe your topic. Claude builds a complete, polished presentation — with AI-generated graphics, inline editing, and multi-format export.
          </p>

          {/* Input card */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid #262626',
            borderRadius: '16px', padding: '28px',
          }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#A3A3A3', marginBottom: '10px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Topic or idea
            </label>
            <textarea
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate() }}
              placeholder="e.g. The business case for AI integration in financial services..."
              rows={3}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid #262626',
                borderRadius: '12px', padding: '12px 16px', fontSize: '14px', color: '#F5F5F5',
                fontFamily: 'inherit', resize: 'none', outline: 'none',
                transition: 'border-color 0.15s', marginBottom: '16px', lineHeight: 1.6,
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.6)')}
              onBlur={e => (e.currentTarget.style.borderColor = '#262626')}
            />

            {error && (
              <div style={{
                marginBottom: '14px', padding: '10px 14px', borderRadius: '10px', fontSize: '13px',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5',
              }}>{error}</div>
            )}

            <button
              onClick={handleGenerate}
              disabled={!topic.trim() || !apiKey}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px', fontWeight: 600, fontSize: '14px',
                background: 'linear-gradient(135deg, #8b5cf6, #9333ea)',
                border: '1px solid rgba(139,92,246,0.4)', color: '#F5F5F5',
                cursor: (topic.trim() && apiKey) ? 'pointer' : 'not-allowed',
                opacity: (topic.trim() && apiKey) ? 1 : 0.4, transition: 'all 0.15s', letterSpacing: '-0.01em',
              }}
              onMouseEnter={e => { if (topic.trim() && apiKey) e.currentTarget.style.opacity = '0.88' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = (topic.trim() && apiKey) ? '1' : '0.4' }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              {!apiKey ? 'Add API key to generate' : 'Generate Presentation'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '11px', color: '#525252', marginTop: '10px' }}>
              ⌘ + Enter to generate
            </p>
          </div>

          {/* Data loss warning */}
          <div style={{
            marginTop: '16px', display: 'flex', alignItems: 'flex-start', gap: '10px',
            padding: '12px 16px', borderRadius: '12px',
            background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
              <path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="#fbbf24" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M8 6v3.5" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="11.5" r="0.75" fill="#fbbf24" />
            </svg>
            <p style={{ fontSize: '12px', color: '#A3A3A3', lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: '#fbbf24' }}>No data is saved.</strong> If you refresh or close this tab, your presentation will be lost. Download your slides (PDF, PNG, or PPTX) before leaving the page.
            </p>
          </div>

          {/* Examples */}
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
              Try an example
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {EXAMPLES.map(ex => (
                <button
                  key={ex} onClick={() => setTopic(ex)}
                  style={{
                    padding: '6px 12px', borderRadius: '8px', fontSize: '12px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid #1a1a1a',
                    color: '#A3A3A3', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)'; e.currentTarget.style.color = '#F5F5F5' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = '#A3A3A3' }}
                >{ex}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #262626', padding: '20px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
      }}>
        <Logo size={16} color="#525252" />
        <span style={{ fontSize: '12px', color: '#525252' }}>
          Agenticsis — AI implementation for forward-thinking businesses
        </span>
      </footer>

      {/* Generating overlay */}
      {state === 'generating' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(10,10,10,0.96)', backdropFilter: 'blur(8px)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              border: '2px solid #262626', borderTopColor: '#8b5cf6',
              margin: '0 auto 24px', animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ fontSize: '18px', fontWeight: 600, color: '#F5F5F5', marginBottom: '8px', letterSpacing: '-0.01em' }}>
              Building your presentation
            </p>
            <p style={{ fontSize: '14px', color: '#A3A3A3' }}>Claude is designing your slides...</p>
          </div>
          {streamText && (
            <div style={{
              maxWidth: '480px', width: '100%', margin: '0 24px',
              padding: '14px 16px', borderRadius: '12px',
              background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)',
            }}>
              <p style={{
                fontSize: '11px', fontFamily: 'ui-monospace, monospace',
                color: '#525252', lineHeight: 1.6, maxHeight: '72px', overflow: 'hidden',
              }}>{streamText.slice(-500)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
