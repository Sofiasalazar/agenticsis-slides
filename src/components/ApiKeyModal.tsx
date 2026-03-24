import { useState } from 'react'
import { Logo } from './Logo'

const STORAGE_KEY = 'agenticsis_api_key'

export function getStoredApiKey(): string {
  return localStorage.getItem(STORAGE_KEY) || ''
}

export function setStoredApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key)
}

interface ApiKeyModalProps {
  onSave: (key: string) => void
  isSettings?: boolean
  onClose?: () => void
}

export function ApiKeyModal({ onSave, isSettings, onClose }: ApiKeyModalProps) {
  const [key, setKey] = useState(isSettings ? getStoredApiKey() : '')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')

  const handleSave = () => {
    const trimmed = key.trim()
    if (!trimmed) { setError('Please enter your API key.'); return }
    if (!trimmed.startsWith('sk-ant')) {
      setError('This does not look like an Anthropic API key (should start with sk-ant-).')
      return
    }
    setStoredApiKey(trimmed)
    onSave(trimmed)
    onClose?.()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(12px)',
    }}>
      <div style={{
        width: '100%', maxWidth: '480px', margin: '0 24px',
        background: '#111', border: '1px solid #262626',
        borderRadius: '20px', padding: '40px',
        boxShadow: '0 0 80px rgba(139,92,246,0.12)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
          <Logo size={28} color="#FFFFFF" />
          <div>
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#F5F5F5', letterSpacing: '-0.01em' }}>
              {isSettings ? 'Update API Key' : 'Connect your Anthropic key'}
            </p>
            <p style={{ fontSize: '12px', color: '#525252', marginTop: '2px' }}>
              Stored locally — never shared
            </p>
          </div>
        </div>

        {!isSettings && (
          <p style={{ fontSize: '13px', color: '#A3A3A3', lineHeight: 1.65, marginBottom: '24px' }}>
            This tool runs entirely in your browser. Your key is stored only in local storage and sent directly to Anthropic — never to any server.
          </p>
        )}

        {/* Anthropic-only notice */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          padding: '10px 14px', borderRadius: '10px', marginBottom: '20px',
          background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)',
        }}>
          <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>ℹ️</span>
          <p style={{ fontSize: '12px', color: '#A3A3A3', lineHeight: 1.6, margin: 0 }}>
            <strong style={{ color: '#F5F5F5' }}>Anthropic API key only.</strong> This tool uses Claude exclusively — do not enter an OpenAI or other provider key. Your key must start with <code style={{ color: '#84cc16', background: 'rgba(132,204,22,0.08)', padding: '1px 5px', borderRadius: '4px' }}>sk-ant-</code>
          </p>
        </div>

        {/* Input */}
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A3A3A3', marginBottom: '8px' }}>
          Anthropic API Key
        </label>
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <input
            type={show ? 'text' : 'password'}
            value={key}
            onChange={e => { setKey(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="sk-ant-api03-..."
            autoFocus
            style={{
              width: '100%', padding: '11px 44px 11px 14px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid #262626',
              borderRadius: '10px', fontSize: '13px', color: '#F5F5F5',
              fontFamily: 'ui-monospace, monospace', outline: 'none',
              letterSpacing: show ? 'normal' : '0.1em',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.6)')}
            onBlur={e => (e.currentTarget.style.borderColor = '#262626')}
          />
          <button
            onClick={() => setShow(s => !s)}
            style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: '#525252', cursor: 'pointer',
              fontSize: '11px', fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>

        {error && (
          <p style={{ fontSize: '12px', color: '#fca5a5', marginBottom: '12px' }}>{error}</p>
        )}

        {/* Get key link */}
        <p style={{ fontSize: '12px', color: '#525252', marginBottom: '24px' }}>
          Get your key at{' '}
          <span style={{ color: '#8b5cf6' }}>console.anthropic.com</span>
          {' '}→ API Keys
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {isSettings && onClose && (
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: '11px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                background: 'rgba(255,255,255,0.05)', border: '1px solid #262626',
                color: '#A3A3A3', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            style={{
              flex: 1, padding: '11px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
              background: 'linear-gradient(135deg, #8b5cf6, #9333ea)',
              border: '1px solid rgba(139,92,246,0.4)',
              color: '#F5F5F5', cursor: 'pointer', fontFamily: 'inherit',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            {isSettings ? 'Save Key' : 'Save & Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
