import { XMLParser } from 'fast-xml-parser';

const STAGE_W = 1920;
const STAGE_H = 1080;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '#text',
  alwaysCreateTextNode: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
  isArray: (name) => ['g', 'text', 'tspan', 'image', 'rect', 'ellipse', 'line', 'path', 'polygon'].includes(name),
});

function array(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function color(value, fallback = 'transparent') {
  if (!value || value === 'none') return fallback;
  const raw = String(value).trim();
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toLowerCase()}`;
  if (/^#[0-9a-f]{3,8}$/i.test(raw)) return raw.toLowerCase();
  const rgb = raw.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) return `#${[rgb[1], rgb[2], rgb[3]].map((part) => Number(part).toString(16).padStart(2, '0')).join('')}`;
  return raw;
}

function firstDescendant(node, name) {
  if (!node || typeof node !== 'object') return undefined;
  if (node[name] != null) return array(node[name])[0];
  for (const value of Object.values(node)) {
    if (!value || typeof value !== 'object') continue;
    for (const child of array(value)) {
      const found = firstDescendant(child, name);
      if (found) return found;
    }
  }
  return undefined;
}

function descendantText(node) {
  if (node == null) return '';
  if (typeof node !== 'object') return String(node);
  let result = typeof node['#text'] === 'string' ? node['#text'] : '';
  for (const [key, value] of Object.entries(node)) {
    if (key === '#text' || key.startsWith('@_') || key.startsWith('data-')) continue;
    if (typeof value === 'object') result += array(value).map(descendantText).join('');
  }
  return result;
}

function renderRun(run) {
  const text = escapeHtml(descendantText(run));
  if (!text) return '';
  const styles = [];
  const runColor = color(run.fill || run['data-ooxml-color'], '');
  if (runColor) styles.push(`color:${runColor}`);
  if (run['font-size']) styles.push(`font-size:${number(run['font-size'])}px`);
  let html = styles.length ? `<span style="${styles.join(';')}">${text}</span>` : text;
  if (run['font-weight'] === 'bold' || run['data-ooxml-bold'] === '1') html = `<strong>${html}</strong>`;
  if (run['font-style'] === 'italic') html = `<em>${html}</em>`;
  return html;
}

function textInfo(group) {
  const textNode = firstDescendant(group, 'text');
  if (!textNode) return null;
  const paragraphs = array(textNode.tspan);
  const usable = paragraphs.filter((paragraph) => descendantText(paragraph).trim());
  if (usable.length === 0) return null;
  const html = usable.map((paragraph) => {
    const runs = array(paragraph.tspan);
    const content = runs.length ? runs.map(renderRun).join('') : renderRun(paragraph);
    return `<p>${content}</p>`;
  }).join('');
  const firstParagraph = usable[0];
  const firstRun = array(firstParagraph.tspan)[0] || firstParagraph;
  const allRuns = usable.flatMap((paragraph) => array(paragraph.tspan).length ? array(paragraph.tspan) : [paragraph]);
  const maxFontSize = Math.max(...allRuns.map((run) => number(run['font-size'], 0)), number(textNode['font-size'], 24));
  const align = ({ ctr: 'center', r: 'right', just: 'justify' })[firstParagraph['data-ooxml-para-align']] || 'left';
  const anchor = group['data-ooxml-anchor'];
  const valign = anchor === 'ctr' ? 'middle' : anchor === 'b' ? 'bottom' : 'top';
  const fontFamily = String(
    firstRun['data-ooxml-run-font']
      || firstRun['font-family']
      || firstParagraph['data-ooxml-run-font']
      || firstParagraph['font-family']
      || textNode['data-ooxml-font-face']
      || textNode['font-family']
      || 'Inter',
  ).split(',')[0].trim().replace(/^['"]|['"]$/g, '');
  return {
    html,
    fontFamily,
    fontSize: maxFontSize * 2,
    color: color(firstRun.fill || textNode.fill || firstRun['data-ooxml-color'], '#000000'),
    align,
    valign,
    bold: firstRun['font-weight'] === 'bold' || firstRun['data-ooxml-bold'] === '1',
  };
}

function bounds(group, slideCx, slideCy) {
  const x = number(group['data-ooxml-x']);
  const y = number(group['data-ooxml-y']);
  const w = number(group['data-ooxml-cx']);
  const h = number(group['data-ooxml-cy']);
  return {
    x: Math.round((x / slideCx) * STAGE_W),
    y: Math.round((y / slideCy) * STAGE_H),
    w: Math.max(1, Math.round((w / slideCx) * STAGE_W)),
    h: Math.max(1, Math.round((h / slideCy) * STAGE_H)),
  };
}

function rootBackground(svg) {
  if (svg['data-ooxml-bg']) return color(svg['data-ooxml-bg'], '#ffffff');
  const styleMatch = String(svg.style || '').match(/background\s*:\s*([^;]+)/i);
  if (styleMatch) return color(styleMatch[1], '#ffffff');
  const backgroundRect = array(svg.rect).find((rect) => number(rect.x) === 0 && number(rect.y) === 0);
  return color(backgroundRect?.fill, '#ffffff');
}

function shapeKind(geometry, shapeType) {
  if (geometry === 'ellipse') return 'ellipse';
  if (geometry === 'triangle' || geometry === 'rtTriangle') return 'triangle';
  if (geometry === 'line' || shapeType === 'connector') return 'line';
  if (geometry === 'rect' || geometry === 'roundRect') return 'rect';
  return null;
}

/**
 * Convert pptx-svg's metadata-rich SVG into WAI Design's editable blocks.
 * Complex PowerPoint objects are returned as `fallbacks` so the caller can
 * preserve their rendering while also showing an honest compatibility report.
 */
export function svgSlideToDeckSlide(svgString, { slideId = crypto.randomUUID(), notes = '' } = {}) {
  const parsed = parser.parse(svgString);
  const svg = parsed.svg;
  if (!svg) throw new Error('PPTX renderer returned invalid SVG');
  const slideCx = Math.max(1, number(svg['data-ooxml-slide-cx'], number(svg.width, 960) * 9525));
  const slideCy = Math.max(1, number(svg['data-ooxml-slide-cy'], number(svg.height, 540) * 9525));
  const blocks = [];
  const fallbacks = [];
  const report = { editable: { text: 0, shapes: 0, images: 0 }, flattened: 0, unsupported: [] };

  for (const [order, group] of array(svg.g).entries()) {
    const shapeType = group['data-ooxml-shape-type'] || 'unknown';
    const geometry = group['data-ooxml-geom'] || '';
    const shapeIndex = number(group['data-ooxml-shape-idx'], order);
    const box = bounds(group, slideCx, slideCy);
    const rotation = number(group['data-ooxml-rot']) / 60000;
    const idBase = `pptx-${slideId}-${shapeIndex}`;
    const image = firstDescendant(group, 'image');

    if (image) {
      const src = image.href || image['xlink:href'] || '';
      if (src) {
        const preserve = String(image.preserveAspectRatio || '');
        blocks.push({
          id: `${idBase}-image`, type: 'image', ...box, rotation, opacity: 1, z: order * 2,
          locked: false, src, fit: preserve.includes('slice') ? 'cover' : preserve.includes('none') ? 'fill' : 'contain', radius: 0, alt: '',
        });
        report.editable.images += 1;
      }
    } else {
      const kind = shapeKind(geometry, shapeType);
      const hasVisual = group['data-ooxml-fill'] !== 'none' || group['data-ooxml-stroke'] !== 'none';
      if (kind && hasVisual) {
        const renderedRect = firstDescendant(group, kind === 'ellipse' ? 'ellipse' : kind === 'line' ? 'line' : 'rect');
        const radius = geometry === 'roundRect'
          ? Math.round(clamp(number(renderedRect?.rx, Math.min(box.w, box.h) * 0.08) * (STAGE_W / number(svg.width, 960)), 0, Math.min(box.w, box.h) / 2))
          : 0;
        blocks.push({
          id: `${idBase}-shape`, type: 'shape', ...box, rotation, opacity: 1, z: order * 2, locked: false,
          shape: kind, fill: color(group['data-ooxml-fill'], 'transparent'), stroke: color(group['data-ooxml-stroke'], 'transparent'),
          strokeWidth: Math.max(0, Math.round((number(group['data-ooxml-stroke-w']) / slideCx) * STAGE_W)), radius,
        });
        report.editable.shapes += 1;
      } else if (!kind && shapeType !== 'image') {
        report.flattened += 1;
        if (!report.unsupported.includes(shapeType)) report.unsupported.push(shapeType);
        fallbacks.push({ shapeIndex, shapeType, order, ...box, rotation });
      }
    }

    const text = textInfo(group);
    if (text) {
      const paddingX = Math.max(0, Math.round((number(group['data-ooxml-l-ins']) / slideCx) * STAGE_W));
      const paddingY = Math.max(0, Math.round((number(group['data-ooxml-t-ins']) / slideCy) * STAGE_H));
      blocks.push({
        id: `${idBase}-text`, type: 'text', ...box, rotation, opacity: 1, z: order * 2 + 1, locked: false,
        ...text, lineHeight: 1.2, letterSpacing: 0, background: 'transparent', paddingX, paddingY,
      });
      report.editable.text += 1;
    }
  }

  return {
    slide: {
      id: slideId,
      background: { type: 'color', color: rootBackground(svg), gradient: '', image: '', imageFit: 'cover' },
      blocks,
      notes: Array.isArray(notes) ? notes.join('\n') : String(notes || ''),
      transition: 'fade',
    },
    report,
    fallbacks,
  };
}
