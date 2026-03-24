import Anthropic from '@anthropic-ai/sdk'
import type { Presentation, Slide } from '../types/slide'
import { SYSTEM_PROMPT, GRAPHIC_SYSTEM_PROMPT, buildUserPrompt, buildGraphicPrompt } from './prompt'

function makeClient(apiKey: string) {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}

export async function generatePresentation(
  topic: string,
  apiKey: string,
  onChunk: (text: string) => void
): Promise<Presentation> {
  const client = makeClient(apiKey)
  let accumulated = ''

  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 6000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(topic) }],
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      accumulated += event.delta.text
      onChunk(accumulated)
    }
  }

  const trimmed = accumulated.trim()
  const jsonStr = trimmed.startsWith('```')
    ? trimmed.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '')
    : trimmed

  return JSON.parse(jsonStr) as Presentation
}

export async function generateSlideGraphic(
  prompt: string,
  slideContext: string,
  apiKey: string
): Promise<string> {
  const client = makeClient(apiKey)

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 3000,
    system: GRAPHIC_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildGraphicPrompt(prompt, slideContext) }],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  let html = content.text.trim()
  if (html.startsWith('```')) {
    html = html.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim()
  }
  return html
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
