import Anthropic from '@anthropic-ai/sdk'
import type { Presentation, Slide, ThemeColors, TokenUsage } from '../types/slide'
import { buildSystemPrompt, buildGraphicSystemPrompt, buildUserPrompt, buildGraphicPrompt } from './prompt'

function makeClient(apiKey: string) {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}

export async function generatePresentation(
  topic: string,
  apiKey: string,
  slideCount: number,
  colors: ThemeColors,
  onChunk: (text: string) => void
): Promise<{ presentation: Presentation; usage: TokenUsage }> {
  const client = makeClient(apiKey)
  let accumulated = ''
  let inputTokens = 0
  let outputTokens = 0

  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 8000,
    system: buildSystemPrompt(slideCount, colors),
    messages: [{ role: 'user', content: buildUserPrompt(topic) }],
  })

  for await (const event of stream) {
    if (event.type === 'message_start') {
      inputTokens = event.message.usage.input_tokens
    }
    if (event.type === 'message_delta' && 'usage' in event) {
      outputTokens = (event as { usage: { output_tokens: number } }).usage.output_tokens
    }
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      accumulated += event.delta.text
      onChunk(accumulated)
    }
  }

  const trimmed = accumulated.trim()
  const jsonStr = trimmed.startsWith('```')
    ? trimmed.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '')
    : trimmed

  return {
    presentation: JSON.parse(jsonStr) as Presentation,
    usage: { input: inputTokens, output: outputTokens },
  }
}

export async function generateSlideGraphic(
  prompt: string,
  slideContext: string,
  apiKey: string,
  colors: ThemeColors
): Promise<{ html: string; usage: TokenUsage }> {
  const client = makeClient(apiKey)

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 3000,
    system: buildGraphicSystemPrompt(colors),
    messages: [{ role: 'user', content: buildGraphicPrompt(prompt, slideContext) }],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  let html = content.text.trim()
  if (html.startsWith('```')) {
    html = html.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim()
  }

  return {
    html,
    usage: { input: response.usage.input_tokens, output: response.usage.output_tokens },
  }
}

export function getSlideContext(slide: Slide): string {
  switch (slide.type) {
    case 'hero':    return `${slide.title}. ${slide.subtitle}`
    case 'bullets': return `${slide.title}. ${slide.bullets.join('. ')}`
    case 'split':   return `${slide.title}: ${slide.left} versus ${slide.right}`
    case 'quote':   return `"${slide.quote}"${slide.attribution ? ` — ${slide.attribution}` : ''}`
    case 'stat':    return `${slide.title}: ${slide.stats.map(s => `${s.value} ${s.label}`).join(', ')}`
    case 'cta':     return `${slide.headline}. ${slide.subtext}`
    default:        return ''
  }
}

// Pricing for claude-opus-4-6 (approximate — check console.anthropic.com for latest)
const INPUT_COST = 15 / 1_000_000   // $15 per 1M input tokens
const OUTPUT_COST = 75 / 1_000_000  // $75 per 1M output tokens

export function calcCost(usage: TokenUsage): number {
  return usage.input * INPUT_COST + usage.output * OUTPUT_COST
}

export function formatCost(usd: number): string {
  if (usd < 0.01) return `${(usd * 100).toFixed(2)}¢`
  return `$${usd.toFixed(3)}`
}
