/** @typedef {'presentation' | 'interface' | 'prototype'} ProjectKind */

export const PROJECT_KINDS = Object.freeze(['presentation', 'interface', 'prototype']);

const COLORS = {
  ink: '#152229',
  muted: '#617078',
  faint: '#8d9aa0',
  white: '#ffffff',
  violet: '#6d5dfc',
  violetSoft: '#eeeaff',
  cyan: '#65d8d3',
  cyanSoft: '#e4faf8',
  rose: '#ff7a9e',
  roseSoft: '#fff0f4',
  line: '#dfe7ea',
};

const sans = 'var(--font-sans)';
const serif = 'var(--font-serif)';
const uid = () => globalThis.crypto?.randomUUID?.() ?? `id_${Math.random().toString(36).slice(2)}`;

/** @param {string} value */
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

/** @param {string} html @param {number} x @param {number} y @param {number} w @param {number} h @param {Record<string, unknown>} [extra] */
function text(html, x, y, w, h, extra = {}) {
  return { id: uid(), type: 'text', x, y, w, h, html, fontFamily: sans, color: COLORS.ink, ...extra };
}

/** @param {number} x @param {number} y @param {number} w @param {number} h @param {string} fill @param {Record<string, unknown>} [extra] */
function shape(x, y, w, h, fill, extra = {}) {
  return { id: uid(), type: 'shape', shape: 'rect', x, y, w, h, fill, ...extra };
}

/** @param {Array<Record<string, unknown>>} blocks @param {Record<string, unknown>} background @param {string} [notes] */
function slide(blocks, background, notes = '') {
  return { id: uid(), background, blocks, notes, transition: 'fade' };
}

const glassBackground = {
  type: 'gradient',
  gradient: 'radial-gradient(circle at 82% 8%, #e7e1ff 0%, transparent 29%), radial-gradient(circle at 12% 92%, #dff9f5 0%, transparent 28%), linear-gradient(135deg, #fbfdff 0%, #f7f8fb 100%)',
};

/** @param {string} title */
function presentationSlides(title) {
  return [
    slide([
      shape(1250, 118, 490, 844, 'rgba(255,255,255,0.72)', { radius: 54, stroke: 'rgba(255,255,255,0.94)', strokeWidth: 2, z: 0 }),
      shape(1320, 190, 350, 240, COLORS.violetSoft, { radius: 38, rotation: -4, z: 1 }),
      shape(1390, 485, 250, 250, COLORS.cyanSoft, { shape: 'ellipse', radius: 125, z: 1 }),
      shape(1290, 790, 400, 104, COLORS.ink, { radius: 30, z: 1 }),
      text('<p>WAI DESIGN&nbsp;&nbsp;·&nbsp;&nbsp;NEW STORY</p>', 150, 140, 720, 56, { fontSize: 24, letterSpacing: 0.14, color: COLORS.violet, bold: true, z: 2 }),
      text(`<p>${escapeHtml(title)}</p>`, 145, 332, 1020, 138, { fontFamily: serif, fontSize: 112, lineHeight: 0.98, letterSpacing: -0.04, z: 2 }),
      text('<p>A clearer story,<br>beautifully told.</p>', 145, 500, 990, 245, { fontSize: 82, lineHeight: 1.02, letterSpacing: -0.045, bold: true, z: 2 }),
      text('<p>Built for ideas that deserve more than a template.</p>', 150, 808, 930, 76, { fontSize: 34, lineHeight: 1.2, color: COLORS.muted, z: 2 }),
      text('<p>Presentation</p>', 1340, 814, 210, 40, { fontSize: 26, color: COLORS.white, bold: true, z: 3 }),
      text('<p>01</p>', 1572, 812, 70, 40, { fontSize: 26, color: 'rgba(255,255,255,0.62)', align: 'right', z: 3 }),
    ], glassBackground, 'Open slowly. Let the title breathe before you begin.'),
    slide([
      text('<p>THE IDEA</p>', 150, 112, 360, 52, { fontSize: 23, letterSpacing: 0.16, color: COLORS.violet, bold: true }),
      text('<p>One thought per frame.</p>', 145, 200, 1350, 130, { fontFamily: serif, fontSize: 96, letterSpacing: -0.04 }),
      text('<p>Space is not empty. It gives the story rhythm and the audience room to think.</p>', 150, 350, 1100, 86, { fontSize: 34, lineHeight: 1.24, color: COLORS.muted }),
      ...[
        ['01', 'Focus', 'Make the point unmistakable.', COLORS.violetSoft, COLORS.violet],
        ['02', 'Rhythm', 'Vary pace without losing clarity.', COLORS.cyanSoft, '#168f8a'],
        ['03', 'Proof', 'Turn claims into visible evidence.', COLORS.roseSoft, '#d94f77'],
      ].flatMap(([n, heading, body, fill, accent], index) => {
        const x = 150 + index * 545;
        return [
          shape(x, 540, 495, 365, fill, { radius: 42 }),
          text(`<p>${n}</p>`, x + 42, 580, 90, 54, { fontSize: 24, color: accent, bold: true }),
          text(`<p>${heading}</p>`, x + 42, 675, 390, 72, { fontSize: 50, bold: true, letterSpacing: -0.03 }),
          text(`<p>${body}</p>`, x + 42, 785, 380, 70, { fontSize: 27, lineHeight: 1.25, color: COLORS.muted }),
        ];
      }),
    ], { type: 'color', color: '#fbfcfd' }, 'Three principles, one at a time.'),
    slide([
      shape(1160, 120, 590, 840, COLORS.ink, { radius: 52 }),
      shape(1280, 250, 190, 190, COLORS.violet, { shape: 'ellipse', radius: 95, opacity: 0.9 }),
      shape(1435, 520, 190, 190, COLORS.cyan, { shape: 'ellipse', radius: 95, opacity: 0.9 }),
      text('<p>THE OUTCOME</p>', 150, 140, 420, 52, { fontSize: 23, letterSpacing: 0.16, color: COLORS.violet, bold: true }),
      text('<p>Make the next move obvious.</p>', 145, 290, 870, 260, { fontFamily: serif, fontSize: 100, lineHeight: 0.98, letterSpacing: -0.045 }),
      text('<p>Every strong presentation ends with momentum—not just information.</p>', 150, 610, 820, 130, { fontSize: 38, lineHeight: 1.26, color: COLORS.muted }),
      shape(150, 810, 440, 100, COLORS.violet, { radius: 50 }),
      text('<p>Start the conversation&nbsp;&nbsp;→</p>', 195, 838, 350, 48, { fontSize: 28, color: COLORS.white, bold: true }),
      text('<p>Clarity<br>creates<br>action.</p>', 1240, 760, 390, 170, { fontSize: 54, color: COLORS.white, bold: true, lineHeight: 1.0, letterSpacing: -0.03 }),
    ], glassBackground, 'End on the action you want the audience to take.'),
  ];
}

/** @param {string} title */
function interfaceSlides(title) {
  return [
    slide([
      text('<p>INTERFACE CONCEPT&nbsp;&nbsp;·&nbsp;&nbsp;DESKTOP</p>', 130, 80, 680, 44, { fontSize: 22, letterSpacing: 0.15, color: COLORS.violet, bold: true }),
      text(`<p>${escapeHtml(title)}</p>`, 129, 140, 900, 100, { fontFamily: serif, fontSize: 78, letterSpacing: -0.035 }),
      shape(120, 270, 1680, 700, 'rgba(255,255,255,0.92)', { radius: 42, stroke: COLORS.line, strokeWidth: 2 }),
      shape(120, 270, 1680, 76, '#f8fafb', { radius: 42 }),
      shape(158, 300, 14, 14, COLORS.rose, { shape: 'ellipse', radius: 7 }),
      shape(184, 300, 14, 14, '#ffc85c', { shape: 'ellipse', radius: 7 }),
      shape(210, 300, 14, 14, COLORS.cyan, { shape: 'ellipse', radius: 7 }),
      text('<p>northstar.app / overview</p>', 680, 291, 560, 30, { fontSize: 19, color: COLORS.faint, align: 'center' }),
      shape(160, 382, 300, 540, '#f7f8fb', { radius: 32 }),
      text('<p>N</p>', 200, 420, 54, 52, { fontSize: 28, bold: true, color: COLORS.white, background: COLORS.ink, paddingX: 17, paddingY: 8 }),
      text('<p>Overview</p><p>Projects</p><p>Activity</p><p>Team</p>', 200, 520, 190, 260, { fontSize: 27, lineHeight: 2.1, color: COLORS.muted }),
      text('<p>Good morning, Alex.</p>', 515, 405, 720, 76, { fontSize: 52, bold: true, letterSpacing: -0.035 }),
      text('<p>Here’s what is moving today.</p>', 520, 482, 620, 46, { fontSize: 27, color: COLORS.muted }),
      shape(520, 570, 770, 300, 'linear-gradient(135deg,#6d5dfc,#9588ff)', { radius: 38 }),
      text('<p>Momentum</p>', 568, 620, 300, 50, { fontSize: 25, color: 'rgba(255,255,255,0.72)' }),
      text('<p>82%</p>', 562, 695, 330, 120, { fontSize: 94, color: COLORS.white, bold: true, letterSpacing: -0.05 }),
      shape(1330, 570, 390, 140, COLORS.cyanSoft, { radius: 30 }),
      shape(1330, 730, 390, 140, COLORS.roseSoft, { radius: 30 }),
      text('<p>12 active projects</p>', 1370, 610, 310, 42, { fontSize: 26, bold: true }),
      text('<p>3 decisions due</p>', 1370, 770, 310, 42, { fontSize: 26, bold: true }),
    ], glassBackground, 'Desktop dashboard concept. Keep the hierarchy calm and direct.'),
    slide([
      text('<p>INTERFACE CONCEPT&nbsp;&nbsp;·&nbsp;&nbsp;MOBILE FLOW</p>', 130, 76, 760, 44, { fontSize: 22, letterSpacing: 0.15, color: COLORS.violet, bold: true }),
      text('<p>One system. Every screen.</p>', 125, 142, 1120, 102, { fontFamily: serif, fontSize: 82, letterSpacing: -0.04 }),
      ...[0, 1, 2].flatMap((index) => {
        const x = 185 + index * 560;
        const fills = [COLORS.violetSoft, COLORS.cyanSoft, COLORS.roseSoft];
        const titles = ['Discover', 'Decide', 'Done'];
        return [
          shape(x, 300, 430, 690, '#11191d', { radius: 72 }),
          shape(x + 18, 320, 394, 650, '#ffffff', { radius: 56 }),
          shape(x + 150, 335, 130, 24, '#11191d', { radius: 12 }),
          shape(x + 48, 400, 334, 210, fills[index], { radius: 38 }),
          text(`<p>${titles[index]}</p>`, x + 48, 650, 330, 64, { fontSize: 38, bold: true, letterSpacing: -0.025 }),
          text(`<p>${index === 0 ? 'Find the signal in the noise.' : index === 1 ? 'Make a confident choice.' : 'See progress at a glance.'}</p>`, x + 48, 730, 320, 90, { fontSize: 24, lineHeight: 1.3, color: COLORS.muted }),
          shape(x + 48, 865, 334, 68, index === 1 ? COLORS.violet : COLORS.ink, { radius: 34 }),
          text(`<p>${index === 2 ? 'View summary' : 'Continue'}</p>`, x + 100, 884, 230, 34, { fontSize: 22, color: COLORS.white, bold: true, align: 'center' }),
        ];
      }),
    ], { type: 'color', color: '#f9fbfc' }, 'Three mobile screens, composed as a single flow.'),
    slide([
      text('<p>FOUNDATION&nbsp;&nbsp;·&nbsp;&nbsp;UI KIT</p>', 130, 76, 620, 44, { fontSize: 22, letterSpacing: 0.15, color: COLORS.violet, bold: true }),
      text('<p>Built to stay coherent.</p>', 125, 142, 1040, 102, { fontFamily: serif, fontSize: 82, letterSpacing: -0.04 }),
      shape(120, 300, 1680, 680, 'rgba(255,255,255,0.82)', { radius: 46, stroke: COLORS.line, strokeWidth: 2 }),
      text('<p>Color</p>', 180, 360, 240, 50, { fontSize: 28, bold: true }),
      ...[COLORS.ink, COLORS.violet, COLORS.cyan, COLORS.rose, '#f4f6f8'].map((fill, index) => shape(180 + index * 145, 450, 112, 112, fill, { radius: 32 })),
      text('<p>Type</p>', 180, 650, 240, 50, { fontSize: 28, bold: true }),
      text('<p>Display / 64</p>', 180, 720, 520, 80, { fontFamily: serif, fontSize: 54, letterSpacing: -0.035 }),
      text('<p>Interface / 18 &nbsp; Regular</p>', 180, 830, 520, 48, { fontSize: 28, color: COLORS.muted }),
      text('<p>Components</p>', 980, 360, 300, 50, { fontSize: 28, bold: true }),
      shape(980, 450, 330, 74, COLORS.violet, { radius: 37 }),
      text('<p>Primary action</p>', 1035, 471, 220, 34, { fontSize: 23, color: COLORS.white, bold: true, align: 'center' }),
      shape(1340, 450, 280, 74, '#ffffff', { radius: 37, stroke: COLORS.line, strokeWidth: 2 }),
      text('<p>Secondary</p>', 1380, 471, 200, 34, { fontSize: 23, bold: true, align: 'center' }),
      shape(980, 590, 640, 230, '#f7f8fb', { radius: 36 }),
      shape(1020, 630, 150, 150, COLORS.cyanSoft, { radius: 36 }),
      text('<p>Reusable card</p><p>Clear structure, gentle depth.</p>', 1210, 640, 360, 120, { fontSize: 29, bold: true, lineHeight: 1.5 }),
    ], glassBackground, 'A compact UI kit for repeatable interface work.'),
  ];
}

/** @param {string} title */
function prototypeSlides(title) {
  const steps = [
    { label: 'Step 01', heading: 'Name the intent.', body: 'Start with what the person is trying to accomplish—not the screen you want to build.', accent: COLORS.violet, soft: COLORS.violetSoft, action: 'Define the goal' },
    { label: 'Step 02', heading: 'Choose the path.', body: 'Show only the decisions that matter. Strong flows make the next action feel inevitable.', accent: '#168f8a', soft: COLORS.cyanSoft, action: 'Select a direction' },
    { label: 'Step 03', heading: 'Confirm with confidence.', body: 'Close the loop with a clear result, a useful summary, and an easy way forward.', accent: '#d94f77', soft: COLORS.roseSoft, action: 'Complete the flow' },
  ];

  return steps.map((step, index) => slide([
    text(`<p>PROTOTYPE&nbsp;&nbsp;·&nbsp;&nbsp;${escapeHtml(title)}</p>`, 130, 78, 820, 44, { fontSize: 22, letterSpacing: 0.14, color: step.accent, bold: true }),
    text(`<p>${step.label}</p>`, 130, 210, 440, 58, { fontSize: 28, color: step.accent, bold: true }),
    text(`<p>${step.heading}</p>`, 125, 310, 860, 150, { fontFamily: serif, fontSize: 98, lineHeight: 1.0, letterSpacing: -0.045 }),
    text(`<p>${step.body}</p>`, 130, 530, 820, 150, { fontSize: 36, lineHeight: 1.28, color: COLORS.muted }),
    shape(130, 790, 410, 96, step.accent, { radius: 48 }),
    text(`<p>${step.action}&nbsp;&nbsp;→</p>`, 170, 818, 330, 40, { fontSize: 27, color: COLORS.white, bold: true, align: 'center' }),
    shape(1120, 120, 600, 850, '#121b20', { radius: 74 }),
    shape(1140, 142, 560, 806, '#ffffff', { radius: 58 }),
    shape(1325, 158, 190, 26, '#121b20', { radius: 13 }),
    shape(1195, 260, 450, 300, step.soft, { radius: 48 }),
    shape(1255 + index * 40, 325, 250 - index * 35, 150 + index * 15, step.accent, { radius: 42, opacity: 0.86 }),
    text(`<p>${step.heading}</p>`, 1195, 625, 450, 80, { fontSize: 42, bold: true, align: 'center', letterSpacing: -0.03 }),
    text(`<p>${index + 1} of 3</p>`, 1295, 725, 250, 40, { fontSize: 24, color: COLORS.faint, align: 'center' }),
    shape(1195, 820, 450, 74, step.accent, { radius: 37 }),
    text(`<p>${step.action}</p>`, 1260, 841, 320, 36, { fontSize: 23, color: COLORS.white, bold: true, align: 'center' }),
  ], glassBackground, `${step.label}: ${step.heading}`));
}

/**
 * Returns serializable deck data. The TypeScript boundary parses it through
 * the canonical Deck schema before persistence.
 * @param {string} title
 * @param {ProjectKind} kind
 */
export function starterProjectData(title, kind) {
  if (!PROJECT_KINDS.includes(kind)) throw new RangeError(`Unknown project kind: ${kind}`);
  const slides = kind === 'presentation'
    ? presentationSlides(title)
    : kind === 'interface'
      ? interfaceSlides(title)
      : prototypeSlides(title);

  return {
    version: 1,
    theme: {
      name: 'WAI Glass',
      fontHeading: serif,
      fontBody: sans,
      accent: COLORS.violet,
      paper: '#fbfcfd',
      ink: COLORS.ink,
    },
    slides,
  };
}
