import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Outline, composeDeck } from '@/lib/ai/compose';
import { createPresentation } from '@/lib/repo';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

const SYSTEM = `You are a presentation designer. Given a topic, produce a tight, well-structured slide outline as JSON.
Rules:
- Return ONLY a JSON object, no prose, no markdown fences.
- Shape: {"title": string, "accent": "#rrggbb", "slides": [Slide, ...]}.
- Slide: {"layout": "title"|"section"|"bullets"|"statement"|"quote"|"twoColumn", "title": string, "subtitle"?: string, "bullets"?: string[], "body"?: string, "attribution"?: string, "columns"?: [{"heading": string, "body": string}], "notes"?: string}.
- First slide layout must be "title". Use "section" to divide major parts. Prefer 3-5 concise bullets per "bullets" slide (max ~8 words each). Use "statement" for a single bold idea and "quote" for a memorable line.
- Keep it substantive and specific to the topic. 8-14 slides unless asked otherwise. Write notes (1-2 sentences of speaker guidance) per slide.
- accent should be a tasteful single color; default #cc785c.`;

export async function POST(req: Request) {
  const { prompt, slideCount } = await req.json().catch(() => ({}));
  if (!prompt || typeof prompt !== 'string') return NextResponse.json({ error: 'prompt required' }, { status: 400 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set on the server' }, { status: 501 });

  const client = new Anthropic({ apiKey });
  const user = `Topic: ${prompt}${slideCount ? `\nAim for about ${slideCount} slides.` : ''}`;

  let text = '';
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      messages: [{ role: 'user', content: user }],
    });
    text = msg.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
  } catch (e) {
    return NextResponse.json({ error: 'AI request failed', detail: String(e).slice(0, 300) }, { status: 502 });
  }

  // Extract the JSON object (model may wrap it).
  const jsonStr = extractJson(text);
  let outline;
  try {
    outline = Outline.parse(JSON.parse(jsonStr));
  } catch (e) {
    return NextResponse.json({ error: 'Model returned invalid outline', detail: String(e).slice(0, 300), raw: text.slice(0, 600) }, { status: 502 });
  }

  const deck = composeDeck(outline);
  const row = createPresentation({ title: outline.title, deck });
  return NextResponse.json({ id: row.id, title: outline.title, slides: deck.slides.length });
}

function extractJson(s: string): string {
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  return start >= 0 && end > start ? s.slice(start, end + 1) : s;
}
