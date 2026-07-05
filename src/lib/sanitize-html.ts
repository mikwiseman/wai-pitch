// Minimal dependency-free HTML sanitizer for rich-text block content.
// Runs in both Node and the browser (no DOM needed) so it can live inside the
// Zod schema transform — every parse (POST, PUT, and read via deckOf) produces
// sanitized HTML, which is what the public share page renders.
//
// Strategy: allowlist tags; drop any tag not on the list (its text is kept as
// inert text); on kept tags strip every attribute except a sanitized `style`
// and, on <a>, a scheme-checked `href`. This removes the standard vectors
// (<script>, <img onerror>, <svg onload>, javascript: URLs, inline handlers).

const ALLOWED_TAGS = new Set([
  'p', 'br', 'div', 'span', 'b', 'strong', 'i', 'em', 'u', 's', 'strike',
  'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'font', 'sub', 'sup',
]);

function sanitizeStyle(value: string): string {
  // Drop anything that could pull in JS or remote resources.
  if (/(expression|javascript:|@import|url\s*\()/i.test(value)) {
    return value.replace(/(expression|javascript:|@import|url\s*\([^)]*\))/gi, '');
  }
  return value;
}

function sanitizeHref(value: string): string | null {
  const v = value.trim();
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  if (/^[/#]/.test(v)) return v; // relative / anchor
  return null; // block javascript:, data:, vbscript:, etc.
}

function rebuildTag(raw: string): string {
  // raw is the full `<...>` token.
  const closing = /^<\s*\//.test(raw);
  const nameMatch = raw.match(/^<\s*\/?\s*([a-zA-Z][a-zA-Z0-9]*)/);
  if (!nameMatch) return ''; // comment, doctype, malformed → drop
  const name = nameMatch[1].toLowerCase();
  if (!ALLOWED_TAGS.has(name)) return ''; // disallowed tag → drop (text kept)
  if (closing) return `</${name}>`;

  const selfClose = /\/\s*>$/.test(raw);
  let out = `<${name}`;
  // Extract attributes we keep: style (any tag), href (only <a>).
  const styleM = raw.match(/\sstyle\s*=\s*("([^"]*)"|'([^']*)')/i);
  if (styleM) {
    const val = sanitizeStyle(styleM[2] ?? styleM[3] ?? '');
    if (val.trim()) out += ` style="${val.replace(/"/g, '&quot;')}"`;
  }
  if (name === 'a') {
    const hrefM = raw.match(/\shref\s*=\s*("([^"]*)"|'([^']*)')/i);
    if (hrefM) {
      const safe = sanitizeHref(hrefM[2] ?? hrefM[3] ?? '');
      if (safe) out += ` href="${safe.replace(/"/g, '&quot;')}" rel="noopener noreferrer nofollow" target="_blank"`;
    }
  }
  return out + (selfClose ? ' />' : '>');
}

export function sanitizeHtml(input: string): string {
  if (!input) return input;
  // Remove script/style element bodies outright (their text is not inert).
  let s = input.replace(/<\s*(script|style|iframe|object|embed|svg|math)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  // Also drop any lone opening script/style with no close.
  s = s.replace(/<\s*(script|style|iframe|object|embed|svg|math)\b[^>]*>/gi, '');
  // Rewrite every remaining tag through the allowlist.
  return s.replace(/<[^>]*>/g, (tag) => rebuildTag(tag));
}
