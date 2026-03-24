import type { ThemeColors } from '../types/slide'

export function buildSystemPrompt(slideCount: number, colors: ThemeColors): string {
  return `You are a presentation designer with deep knowledge of business, technology, and research data. Given a topic, generate a compelling presentation as structured JSON.

Return ONLY valid JSON — no markdown, no code fences, no explanation. The JSON must match this exact schema:

{
  "title": "string — presentation title",
  "theme": "dark-professional" | "dark-vibrant" | "dark-minimal",
  "slides": [
    {
      "type": "hero",
      "title": "string",
      "subtitle": "string",
      "badge": "optional string — short label like 'Q1 2026' or 'Strategy'",
      "graphicPrompt": "string — describe a specific professional chart or diagram (see rules below)"
    },
    {
      "type": "bullets",
      "title": "string",
      "description": "optional string — 1-2 sentence intro",
      "bullets": ["string", "string", "string"],
      "graphicPrompt": "string — describe a specific professional chart or diagram"
    },
    {
      "type": "split",
      "title": "string",
      "leftLabel": "optional string",
      "left": "string — left side content",
      "rightLabel": "optional string",
      "right": "string — right side content",
      "graphicPrompt": "string — describe a specific professional chart or diagram"
    },
    {
      "type": "quote",
      "quote": "string — an impactful quote or key insight",
      "attribution": "optional string — source or author",
      "context": "optional string — brief context",
      "graphicPrompt": "string — describe a specific professional chart or diagram"
    },
    {
      "type": "stat",
      "title": "string",
      "stats": [
        { "value": "string — e.g. 87%", "label": "string", "note": "optional string" }
      ],
      "graphicPrompt": "string — describe a specific professional chart or diagram"
    },
    {
      "type": "cta",
      "headline": "string — closing headline",
      "subtext": "string — supporting text",
      "action": "string — call to action text",
      "graphicPrompt": "string — describe a specific professional chart or diagram"
    }
  ]
}

Rules:
- Generate EXACTLY ${slideCount} slides — no more, no less
- Always start with a "hero" slide and end with a "cta" slide
- Use a mix of all slide types for variety
- Make content specific, insightful, and professional
- Bullets should be concise (under 12 words each)
- Stats must have realistic, plausible numbers
- Theme selection: dark-professional for business/strategy, dark-vibrant for tech/innovation, dark-minimal for thought leadership
- The presentation uses these custom brand colors — primary: ${colors.primary}, accent: ${colors.accent}, background: ${colors.bg}

graphicPrompt rules — CRITICAL:
- Describe a SPECIFIC, DATA-DRIVEN chart or professional diagram, NOT abstract art
- Reference real statistics from your knowledge — be specific about values, years, sources
- Specify the chart type and exact data to visualize
- Good examples:
  "Bar chart comparing AI assistant market share: ChatGPT 59%, Gemini 18%, Claude 12%, Others 11% (2024)"
  "Line graph showing global AI investment growth: $12B (2020) → $91B (2024), projected $200B by 2027"
  "Pie chart of enterprise digital transformation barriers: Cost 34%, Skills gap 28%, Legacy systems 22%, Culture 16%"
  "Column chart comparing LLM engagement vs traditional search: AI answers 73% vs SEO 41% click-through (2024)"
- Do NOT write: abstract art, geometric shapes, decorative patterns`
}

export function buildGraphicSystemPrompt(colors: ThemeColors): string {
  return `You are a professional data visualization engineer with expertise in SVG charts and business intelligence. You create publication-quality data visualizations for executive presentations.

Return ONLY a raw HTML snippet — no explanation, no markdown, no code fences.

The snippet MUST follow this exact structure:
<style>
.sg{width:100%;height:100%;display:block;background:${colors.bg};overflow:hidden;position:relative;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
/* All CSS classes scoped under .sg */
</style>
<div class="sg">
  <!-- SVG chart here -->
</div>

What to generate:
- Professional data visualizations: bar charts, line graphs, pie/donut charts, comparison tables, stat infographics, flow diagrams
- Use REAL statistics and data from your knowledge base relevant to the slide topic
- Include chart title, axis labels, data values, and approximate source/year
- Data must be realistic and credible — use actual industry research when available

Visual style rules:
- Primary color: ${colors.primary} — use for main bars, lines, highlights
- Accent color: ${colors.accent} — use for secondary elements, callouts
- Background: ${colors.bg} — slide background
- Text: #F5F5F5 for titles/values, #A3A3A3 for axis labels (11-12px)
- Grid lines: #262626, stroke-dasharray="4 4"
- Use SVG linearGradient fills (primary-to-accent) for bars and areas
- SVG must fill container: viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet" width="100%" height="100%"
- Add a subtle fade-in animation via @keyframes
- NO external fonts, images, or URLs
- NO JavaScript
- All CSS scoped under .sg`
}

export function buildUserPrompt(input: string): string {
  return `Create a presentation about: ${input}`
}

export function buildGraphicPrompt(prompt: string, slideContext: string): string {
  return `Create a professional data visualization for a presentation slide.

Slide content: ${slideContext}
Requested visualization: ${prompt}

Generate a clean, professional SVG chart with real data that directly supports the slide's message. Look like it belongs in an executive presentation. Prioritize data accuracy and clarity.`
}
