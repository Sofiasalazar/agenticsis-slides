import { useState, useEffect } from 'react'
import type { Presentation, Slide, GraphicState, ThemeColors, TokenUsage } from './types/slide'
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

const DEFAULT_THEME: ThemeColors = { primary: '#8b5cf6', accent: '#84cc16', bg: '#0A0A0A' }
const SESSION_KEY = 'agenticsis_slides_session'

interface SavedSession {
  presentation: Presentation
  graphics: Record<number, GraphicState>
  savedAt: string
  slideCount: number
}

function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveSession(
  presentation: Presentation,
  graphics: Record<number, GraphicState>,
  slideCount: number
) {
  const session: SavedSession = {
    presentation,
    graphics,
    slideCount,
    savedAt: new Date().toISOString(),
  }
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Quota exceeded — retry without uploaded images (base64 can be large)
    try {
      const stripped: Record<number, GraphicState> = {}
      Object.entries(graphics).forEach(([k, g]) => {
        stripped[Number(k)] = { ...g, uploadedImage: null }
      })
      localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, graphics: stripped }))
    } catch { /* still too big — skip */ }
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export default function App() {
  const [state, setState] = useState<AppState>('input')
  const [topic, setTopic] = useState('')
  const [slideCount, setSlideCount] = useState(8)
  const [theme, setTheme] = useState<ThemeColors>(DEFAULT_THEME)
  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [graphics, setGraphics] = useState<Record<number, GraphicState>>({})
  const [totalUsage, setTotalUsage] = useState<TokenUsage>({ input: 0, output: 0 })
  const [streamText, setStreamText] = useState('')
  const [error, setError] = useState('')
  const [apiKey, setApiKey] = useState(getStoredApiKey)
  const [showKeyModal, setShowKeyModal] = useState(!getStoredApiKey())
  const [showKeySettings, setShowKeySettings] = useState(false)
  const [savedSession, setSavedSession] = useState<SavedSession | null>(loadSession)
  const [showResumePanel, setShowResumePanel] = useState(false)

  // Auto-save to localStorage whenever presentation or graphics change while presenting
  // Only save when no graphic is currently loading (avoid saving mid-generation state)
  useEffect(() => {
    if (state === 'presenting' && presentation) {
      const anyLoading = Object.values(graphics).some(g => g.loading)
      if (!anyLoading) {
        saveSession(presentation, graphics, slideCount)
        setSavedSession(loadSession())
      }
    }
  }, [presentation, graphics, state, slideCount])

  const addUsage = (u: TokenUsage) =>
    setTotalUsage(prev => ({ input: prev.input + u.input, output: prev.output + u.output }))

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
        prompt: slide.graphicPrompt || `Chart or diagram for: ${slide.type} slide`,
        skipped: false,
      }
    })
    return g
  }

  const handleGenerate = async () => {
    if (!topic.trim() || !apiKey) return
    setState('generating')
    setError('')
    setStreamText('')
    setTotalUsage({ input: 0, output: 0 })

    try {
      const { presentation: pres, usage } = await generatePresentation(
        topic, apiKey, slideCount, theme, chunk => setStreamText(chunk)
      )
      addUsage(usage)
      setPresentation(pres)
      setGraphics(initGraphics(pres))
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
      [index]: { ...prev[index], loading: true, prompt, skipped: false },
    }))

    try {
      const { html, usage } = await generateSlideGraphic(prompt, getSlideContext(slide), apiKey, theme)
      addUsage(usage)
      setGraphics(prev => ({
        ...prev,
        [index]: { ...prev[index], loading: false, html, uploadedImage: null },
      }))
    } catch {
      setGraphics(prev => ({ ...prev, [index]: { ...prev[index], loading: false } }))
    }
  }

  const handleGenerateAllGraphics = async () => {
    if (!presentation || !apiKey) return
    const toGenerate = presentation.slides
      .map((_, i) => i)
      .filter(i => {
        const g = graphics[i]
        return g && !g.skipped && !g.html && !g.uploadedImage && !g.loading
      })
    for (const i of toGenerate) {
      await handleRegenerateGraphic(i)
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

  const handleSkipGraphic = (index: number) => {
    setGraphics(prev => ({
      ...prev,
      [index]: { ...prev[index], html: null, uploadedImage: null, skipped: true },
    }))
  }

  const handleUnskipGraphic = (index: number) => {
    setGraphics(prev => ({
      ...prev,
      [index]: { ...prev[index], skipped: false },
    }))
  }

  const handleRestore = () => {
    if (!savedSession) return
    setPresentation(savedSession.presentation)
    // Restore saved graphics (includes generated HTML and uploaded images)
    // Fall back to empty init if graphics weren't saved in older sessions
    setGraphics(savedSession.graphics ?? initGraphics(savedSession.presentation))
    setSlideCount(savedSession.slideCount)
    setTotalUsage({ input: 0, output: 0 })
    setState('presenting')
    setShowResumePanel(false)
  }

  const handleClearSaved = () => {
    clearSession()
    setSavedSession(null)
    setShowResumePanel(false)
  }

  const handleBack = () => {
    setState('input')
    setPresentation(null)
    setGraphics({})
    setStreamText('')
    setTotalUsage({ input: 0, output: 0 })
    // savedSession stays — user can resume later
  }

  if (state === 'presenting' && presentation) {
    return (
      <>
        <SlideShow
          presentation={presentation}
          graphics={graphics}
          totalUsage={totalUsage}
          colors={theme}
          onUpdateSlide={handleUpdateSlide}
          onRegenerateGraphic={handleRegenerateGraphic}
          onUploadImage={handleUploadImage}
          onClearGraphic={handleClearGraphic}
          onSkipGraphic={handleSkipGraphic}
          onUnskipGraphic={handleUnskipGraphic}
          onGenerateAllGraphics={handleGenerateAllGraphics}
          onBack={handleBack}
        />
        {showKeySettings && (
          <ApiKeyModal isSettings onSave={handleSaveKey} onClose={() => setShowKeySettings(false)} />
        )}
      </>
    )
  }

  const colorInputStyle = {
    width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #262626',
    cursor: 'pointer', padding: '2px', background: 'rgba(255,255,255,0.05)',
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
          <button
            onClick={() => setShowResumePanel(v => !v)}
            style={{
              fontSize: '13px', fontWeight: 500,
              color: savedSession ? '#8b5cf6' : '#525252',
              background: 'none', border: 'none', cursor: savedSession ? 'pointer' : 'default',
              fontFamily: 'inherit', padding: 0, display: 'flex', alignItems: 'center', gap: '6px',
            }}
            title={savedSession ? 'Saved only for this browser session — export before closing' : 'No saved presentation'}
          >
            {savedSession && (
              <span style={{
                fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '999px',
                background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#8b5cf6',
              }}>saved</span>
            )}
            Slides
          </button>
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

      {/* Resume panel — shows when savedSession exists and user clicks "Slides" */}
      {showResumePanel && savedSession && (
        <div style={{
          background: 'rgba(139,92,246,0.06)', borderBottom: '1px solid rgba(139,92,246,0.2)',
          padding: '16px 40px',
        }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#8b5cf6', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Saved — this browser session only
                </p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#F5F5F5', marginBottom: '4px' }}>
                  {savedSession.presentation.title}
                </p>
                <p style={{ fontSize: '12px', color: '#525252' }}>
                  {savedSession.presentation.slides.length} slides · Saved {new Date(savedSession.savedAt).toLocaleString()}
                </p>
                {/* Data-loss warning prominently here */}
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
                    <path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="#fbbf24" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M8 6v3.5" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="8" cy="11.5" r="0.75" fill="#fbbf24" />
                  </svg>
                  <p style={{ fontSize: '11px', color: '#737373', margin: 0, lineHeight: 1.5 }}>
                    <strong style={{ color: '#fbbf24' }}>No database.</strong> This app saves only to your browser. If you clear browser data or use a different device, this session is gone. <strong style={{ color: '#F5F5F5' }}>Always export before closing the tab.</strong>
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                <button
                  onClick={handleRestore}
                  style={{
                    padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                    background: 'linear-gradient(135deg, #8b5cf6, #9333ea)',
                    border: '1px solid rgba(139,92,246,0.4)', color: '#F5F5F5',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >Resume</button>
                <button
                  onClick={handleClearSaved}
                  style={{
                    padding: '6px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                    background: 'none', border: '1px solid #262626', color: '#525252',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#fca5a5')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#525252')}
                >Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                transition: 'border-color 0.15s', marginBottom: '20px', lineHeight: 1.6,
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.6)')}
              onBlur={e => (e.currentTarget.style.borderColor = '#262626')}
            />

            {/* Slide count + colors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              {/* Slide count */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#A3A3A3', marginBottom: '8px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Number of slides
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="range"
                    min={5} max={15} value={slideCount}
                    onChange={e => setSlideCount(Number(e.target.value))}
                    style={{ flex: 1, accentColor: '#8b5cf6' }}
                  />
                  <span style={{
                    fontSize: '13px', fontWeight: 700, color: '#F5F5F5',
                    minWidth: '28px', textAlign: 'center',
                    background: 'rgba(139,92,246,0.12)', borderRadius: '6px', padding: '2px 6px',
                  }}>{slideCount}</span>
                </div>
              </div>

              {/* Colors */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#A3A3A3', marginBottom: '8px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Slide colors
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <input type="color" value={theme.primary}
                      onChange={e => setTheme(t => ({ ...t, primary: e.target.value }))}
                      style={colorInputStyle} title="Primary color"
                    />
                    <span style={{ fontSize: '9px', color: '#525252', fontWeight: 600, textTransform: 'uppercase' }}>Primary</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <input type="color" value={theme.accent}
                      onChange={e => setTheme(t => ({ ...t, accent: e.target.value }))}
                      style={colorInputStyle} title="Accent color"
                    />
                    <span style={{ fontSize: '9px', color: '#525252', fontWeight: 600, textTransform: 'uppercase' }}>Accent</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <input type="color" value={theme.bg}
                      onChange={e => setTheme(t => ({ ...t, bg: e.target.value }))}
                      style={colorInputStyle} title="Background color"
                    />
                    <span style={{ fontSize: '9px', color: '#525252', fontWeight: 600, textTransform: 'uppercase' }}>Background</span>
                  </div>
                  <button
                    onClick={() => setTheme(DEFAULT_THEME)}
                    title="Reset to default colors"
                    style={{
                      fontSize: '10px', color: '#525252', background: 'none', border: '1px solid #262626',
                      borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit',
                      alignSelf: 'flex-start', marginTop: '1px',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#A3A3A3')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#525252')}
                  >Reset</button>
                </div>
              </div>
            </div>

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
              {!apiKey ? 'Add API key to generate' : `Generate ${slideCount} Slides`}
            </button>

            <p style={{ textAlign: 'center', fontSize: '11px', color: '#525252', marginTop: '10px' }}>
              ⌘ + Enter to generate
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

      {/* CTA band */}
      <div style={{
        borderTop: '1px solid #1a1a1a',
        padding: '40px 24px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, transparent 0%, rgba(139,92,246,0.04) 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '600px', height: '200px', pointerEvents: 'none',
          background: 'radial-gradient(ellipse, rgba(139,92,246,0.08) 0%, transparent 70%)',
        }} />
        <p style={{
          fontSize: 'clamp(15px, 2vw, 20px)', fontWeight: 600,
          color: '#F5F5F5', lineHeight: 1.6,
          letterSpacing: '-0.01em', margin: '0 auto', maxWidth: '560px',
          position: 'relative', zIndex: 1,
        }}>
          Want this tool customized for your brand — or need something built from scratch?{' '}
          <span className="gradient-text">We build AI-powered tools that work for your business.</span>
        </p>
        <p style={{
          fontSize: '14px', color: '#737373', marginTop: '12px',
          position: 'relative', zIndex: 1,
        }}>
          <a
            href="https://www.agenticsis.top/contact"
            target="_blank" rel="noopener noreferrer"
            style={{ color: '#8b5cf6', fontWeight: 600, textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#a78bfa')}
            onMouseLeave={e => (e.currentTarget.style.color = '#8b5cf6')}
          >Get in touch</a>
          {' '}or write to{' '}
          <a
            href="mailto:info@agenticsis.top"
            style={{ color: '#8b5cf6', fontWeight: 600, textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#a78bfa')}
            onMouseLeave={e => (e.currentTarget.style.color = '#8b5cf6')}
          >info@agenticsis.top</a>
          {' '}— we'll make it yours.
        </p>
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
            <p style={{ fontSize: '14px', color: '#A3A3A3' }}>Claude is designing your {slideCount} slides...</p>
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
