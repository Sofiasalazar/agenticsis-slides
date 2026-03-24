import { useState, useEffect, useCallback, useRef } from 'react'
import type { Presentation, Slide, GraphicState, ThemeColors, TokenUsage } from '../types/slide'
import { SlideRenderer } from './SlideRenderer'
import { Logo } from './Logo'
import { exportPNG, exportPPTX } from '../lib/export'
import { calcCost, formatCost } from '../lib/claude'

interface SlideShowProps {
  presentation: Presentation
  graphics: Record<number, GraphicState>
  totalUsage: TokenUsage
  colors: ThemeColors
  onUpdateSlide: (index: number, slide: Slide) => void
  onRegenerateGraphic: (index: number, prompt?: string) => void
  onUploadImage: (index: number, dataUrl: string) => void
  onClearGraphic: (index: number) => void
  onSkipGraphic: (index: number) => void
  onUnskipGraphic: (index: number) => void
  onGenerateAllGraphics: () => void
  onBack: () => void
}

export function SlideShow({
  presentation, graphics, totalUsage, colors,
  onUpdateSlide, onRegenerateGraphic, onUploadImage, onClearGraphic,
  onSkipGraphic, onUnskipGraphic, onGenerateAllGraphics, onBack
}: SlideShowProps) {
  const [current, setCurrent] = useState(0)
  const [exportMenu, setExportMenu] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [editMode, setEditMode] = useState(true)
  const [generatingAll, setGeneratingAll] = useState(false)
  const exportRefs = useRef<(HTMLDivElement | null)[]>([])
  const total = presentation.slides.length

  const prev = useCallback(() => setCurrent(c => Math.max(0, c - 1)), [])
  const next = useCallback(() => setCurrent(c => Math.min(total - 1, c + 1)), [total])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Skip keyboard nav if user is editing text
      if ((e.target as HTMLElement).isContentEditable) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') next()
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev()
      if (e.key === 'Escape') onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, onBack])

  const handleExport = async (format: 'pdf' | 'png' | 'pptx') => {
    setExportMenu(false)
    if (format === 'pdf') { window.print(); return }
    setExporting(true)
    try {
      // Brief pause for any lazy renders, then export.ts waits for animations per-element
      await new Promise(r => setTimeout(r, 500))
      const elements = exportRefs.current.filter(Boolean) as HTMLElement[]
      if (format === 'png') await exportPNG(elements, presentation.title, colors.bg)
      if (format === 'pptx') await exportPPTX(elements, presentation.title, colors.bg)
    } finally {
      setExporting(false)
    }
  }

  const handleGenerateAll = async () => {
    setGeneratingAll(true)
    try {
      await onGenerateAllGraphics()
    } finally {
      setGeneratingAll(false)
    }
  }

  const pendingGraphics = presentation.slides.filter((_, i) => {
    const g = graphics[i]
    return g && !g.skipped && !g.html && !g.uploadedImage && !g.loading
  }).length

  const cost = calcCost(totalUsage)
  const hasUsage = totalUsage.input > 0 || totalUsage.output > 0

  const cssVars = {
    '--color-primary': colors.primary,
    '--color-accent': colors.accent,
    '--color-bg': colors.bg,
  } as React.CSSProperties

  const navBtnStyle = (active: boolean) => ({
    display: 'flex', alignItems: 'center', gap: '5px',
    fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '8px',
    background: active ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)',
    border: `1px solid ${active ? 'rgba(139,92,246,0.4)' : '#262626'}`,
    color: active ? '#c4b5fd' : '#A3A3A3',
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
  })

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, ...cssVars }}>
      {/* Navbar */}
      <nav className="no-print" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #262626',
      }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '13px', fontWeight: 500, color: '#A3A3A3',
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              padding: '4px 0', transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#F5F5F5')}
            onMouseLeave={e => (e.currentTarget.style.color = '#A3A3A3')}
          >← Back</button>
          <span style={{ color: '#262626' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Logo size={18} color="#FFFFFF" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#F5F5F5', letterSpacing: '-0.01em', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {presentation.title}
            </span>
          </div>
        </div>

        {/* Center — actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Edit mode toggle */}
          <button
            onClick={() => setEditMode(m => !m)}
            style={navBtnStyle(editMode)}
            onMouseEnter={e => { if (!editMode) e.currentTarget.style.color = '#F5F5F5' }}
            onMouseLeave={e => { if (!editMode) e.currentTarget.style.color = '#A3A3A3' }}
          >
            <span style={{ fontSize: '11px' }}>{editMode ? '✎' : '◎'}</span>
            {editMode ? 'Editing' : 'View only'}
          </button>

          {/* Generate all graphics */}
          {pendingGraphics > 0 && (
            <button
              onClick={handleGenerateAll}
              disabled={generatingAll}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '8px',
                background: generatingAll ? 'rgba(132,204,22,0.05)' : 'rgba(132,204,22,0.1)',
                border: '1px solid rgba(132,204,22,0.25)',
                color: generatingAll ? '#525252' : '#84cc16',
                cursor: generatingAll ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', transition: 'all 0.15s',
                opacity: generatingAll ? 0.6 : 1,
              }}
              onMouseEnter={e => { if (!generatingAll) e.currentTarget.style.background = 'rgba(132,204,22,0.18)' }}
              onMouseLeave={e => { e.currentTarget.style.background = generatingAll ? 'rgba(132,204,22,0.05)' : 'rgba(132,204,22,0.1)' }}
            >
              {generatingAll
                ? <><span style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>⟳</span> Generating...</>
                : <>⚡ Generate {pendingGraphics} graphic{pendingGraphics > 1 ? 's' : ''}</>
              }
            </button>
          )}
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Token usage */}
          {hasUsage && (
            <div style={{ fontSize: '11px', color: '#525252', textAlign: 'right', lineHeight: 1.4 }}>
              <span style={{ color: '#A3A3A3', fontWeight: 600 }}>
                {(totalUsage.input + totalUsage.output).toLocaleString()} tokens
              </span>
              <span style={{ color: '#262626', margin: '0 4px' }}>·</span>
              <span style={{ color: '#84cc16', fontWeight: 600 }}>{formatCost(cost)}</span>
            </div>
          )}

          {/* Export */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setExportMenu(m => !m)}
              disabled={exporting}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '12px', fontWeight: 600,
                padding: '7px 16px', borderRadius: '8px',
                background: 'rgba(132,204,22,0.1)', border: '1px solid rgba(132,204,22,0.25)',
                color: '#84cc16', cursor: exporting ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', transition: 'all 0.15s',
                opacity: exporting ? 0.6 : 1,
              }}
              onMouseEnter={e => { if (!exporting) e.currentTarget.style.background = 'rgba(132,204,22,0.18)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(132,204,22,0.1)' }}
            >
              {exporting ? 'Exporting...' : 'Export'}
              {!exporting && <span style={{ fontSize: '10px' }}>▾</span>}
            </button>

            {exportMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setExportMenu(false)} />
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 50,
                  background: '#111', border: '1px solid #262626', borderRadius: '12px',
                  padding: '6px', minWidth: '180px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}>
                  {[
                    { label: 'Download PDF', fmt: 'pdf' as const, note: 'Print to save' },
                    { label: 'Download PNG', fmt: 'png' as const, note: 'Zip of all slides' },
                    { label: 'Download PPTX', fmt: 'pptx' as const, note: 'PowerPoint file' },
                  ].map(({ label, fmt, note }) => (
                    <button
                      key={fmt}
                      onClick={() => handleExport(fmt)}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: '8px',
                        background: 'none', border: 'none',
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px',
                        cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#F5F5F5' }}>{label}</span>
                      <span style={{ fontSize: '11px', color: '#525252' }}>{note}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Slide area */}
      <div style={{ paddingTop: '56px', ...cssVars }}>
        {/* Data-loss warning — persistent, always visible */}
        <div className="no-print" style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 20px',
          background: 'rgba(251,191,36,0.05)', borderBottom: '1px solid rgba(251,191,36,0.15)',
        }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="#fbbf24" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M8 6v3.5" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="11.5" r="0.75" fill="#fbbf24" />
          </svg>
          <p style={{ fontSize: '11px', color: '#737373', margin: 0 }}>
            <strong style={{ color: '#fbbf24', fontWeight: 600 }}>This app has no database.</strong> Your slides live only in this browser tab. Refreshing or closing will erase everything. <strong style={{ color: '#F5F5F5' }}>Export before leaving.</strong>
          </p>
        </div>

        <div className="print:hidden" style={cssVars}>
          <SlideRenderer
            slide={presentation.slides[current]}
            onUpdate={editMode ? s => onUpdateSlide(current, s) : undefined}
            graphic={graphics[current]}
            onRegenerateGraphic={p => onRegenerateGraphic(current, p)}
            onUploadImage={d => onUploadImage(current, d)}
            onClearGraphic={() => onClearGraphic(current)}
            onSkipGraphic={() => onSkipGraphic(current)}
            onUnskipGraphic={() => onUnskipGraphic(current)}
          />
        </div>
        <div className="print:block hidden">
          {presentation.slides.map((slide, i) => (
            <SlideRenderer key={i} slide={slide} graphic={graphics[i]} />
          ))}
        </div>
      </div>

      {/* Hidden export container */}
      <div aria-hidden style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1, pointerEvents: 'none', ...cssVars }}>
        {presentation.slides.map((slide, i) => (
          <div
            key={i}
            ref={el => { exportRefs.current[i] = el }}
            style={{ width: '1280px', height: '720px', overflow: 'hidden', flexShrink: 0 }}
          >
            <SlideRenderer
              slide={slide}
              graphic={graphics[i]}
              isExporting
              height="720px"
            />
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <div className="no-print" style={{
        position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '10px 16px', borderRadius: '16px', zIndex: 50,
        background: 'rgba(15,15,15,0.95)', backdropFilter: 'blur(12px)',
        border: '1px solid #262626', boxShadow: '0 0 32px rgba(0,0,0,0.5)',
      }}>
        <button
          onClick={prev} disabled={current === 0}
          style={{
            width: '34px', height: '34px', borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.05)', border: '1px solid #262626',
            color: '#A3A3A3', fontSize: '14px', fontWeight: 600,
            cursor: current === 0 ? 'not-allowed' : 'pointer',
            opacity: current === 0 ? 0.3 : 1, transition: 'all 0.15s', fontFamily: 'inherit',
          }}
          onMouseEnter={e => { if (current > 0) e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#262626' }}
        >←</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {presentation.slides.map((_, i) => (
            <button
              key={i} onClick={() => setCurrent(i)}
              style={{
                height: '6px', width: i === current ? '20px' : '6px',
                borderRadius: '999px', border: 'none', cursor: 'pointer', padding: 0,
                background: i === current ? '#8b5cf6' : 'rgba(255,255,255,0.15)',
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </div>

        <button
          onClick={next} disabled={current === total - 1}
          style={{
            width: '34px', height: '34px', borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.05)', border: '1px solid #262626',
            color: '#A3A3A3', fontSize: '14px', fontWeight: 600,
            cursor: current === total - 1 ? 'not-allowed' : 'pointer',
            opacity: current === total - 1 ? 0.3 : 1, transition: 'all 0.15s', fontFamily: 'inherit',
          }}
          onMouseEnter={e => { if (current < total - 1) e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#262626' }}
        >→</button>

        <span style={{ fontSize: '11px', color: '#525252', paddingLeft: '4px', fontWeight: 500 }}>
          {current + 1} / {total}
        </span>
      </div>

      {/* Export loading overlay */}
      {exporting && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 60,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px',
          background: 'rgba(10,10,10,0.88)', backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: '2px solid #262626', borderTopColor: '#84cc16',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#F5F5F5' }}>Exporting slides...</p>
          <p style={{ fontSize: '12px', color: '#525252' }}>Waiting for all graphics to finish rendering</p>
        </div>
      )}
    </div>
  )
}
