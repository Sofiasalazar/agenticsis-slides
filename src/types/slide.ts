export type SlideType = 'hero' | 'bullets' | 'split' | 'quote' | 'cta' | 'stat'

export interface ThemeColors {
  primary: string   // e.g. '#8b5cf6'
  accent: string    // e.g. '#84cc16'
  bg: string        // e.g. '#0A0A0A'
}

export interface HeroSlide {
  type: 'hero'
  title: string
  subtitle: string
  badge?: string
  graphicPrompt?: string
}

export interface BulletsSlide {
  type: 'bullets'
  title: string
  bullets: string[]
  description?: string
  graphicPrompt?: string
}

export interface SplitSlide {
  type: 'split'
  title: string
  left: string
  right: string
  leftLabel?: string
  rightLabel?: string
  graphicPrompt?: string
}

export interface QuoteSlide {
  type: 'quote'
  quote: string
  attribution?: string
  context?: string
  graphicPrompt?: string
}

export interface CtaSlide {
  type: 'cta'
  headline: string
  subtext: string
  action: string
  graphicPrompt?: string
}

export interface StatSlide {
  type: 'stat'
  title: string
  stats: { value: string; label: string; note?: string }[]
  graphicPrompt?: string
}

export type Slide = HeroSlide | BulletsSlide | SplitSlide | QuoteSlide | CtaSlide | StatSlide

export interface Presentation {
  title: string
  theme: 'dark-professional' | 'dark-vibrant' | 'dark-minimal'
  slides: Slide[]
}

export interface GraphicState {
  html: string | null
  uploadedImage: string | null
  loading: boolean
  prompt: string
  skipped: boolean
}

export interface TokenUsage {
  input: number
  output: number
}
