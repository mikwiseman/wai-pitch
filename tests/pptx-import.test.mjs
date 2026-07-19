import test from 'node:test';
import assert from 'node:assert/strict';

import { svgSlideToDeckSlide } from '../src/lib/import/pptx-svg.mjs';

const SVG = `<svg width="960" height="540" data-ooxml-slide-cx="9144000" data-ooxml-slide-cy="5143500" style="background:rgb(248,246,240)">
  <rect width="960" height="540" fill="rgb(248,246,240)"/>
  <g data-ooxml-shape-type="autoshape" data-ooxml-geom="roundRect" data-ooxml-x="914400" data-ooxml-y="685800" data-ooxml-cx="3657600" data-ooxml-cy="1371600" data-ooxml-rot="0" data-ooxml-fill="6D5DFC" data-ooxml-stroke="FFFFFF" data-ooxml-stroke-w="12700" data-ooxml-anchor="ctr" data-ooxml-shape-idx="0">
    <rect x="96" y="72" width="384" height="144" rx="18" fill="rgb(109,93,252)" stroke="rgb(255,255,255)"/>
    <text x="120" font-family="Inter" fill="rgb(255,255,255)">
      <tspan x="120" y="132" data-ooxml-para-align="ctr"><tspan font-size="32" font-weight="bold">Editable title</tspan></tspan>
      <tspan x="120" y="174" data-ooxml-para-align="ctr"><tspan font-size="18">Second line</tspan></tspan>
    </text>
  </g>
  <g data-ooxml-shape-type="image" data-ooxml-x="5486400" data-ooxml-y="685800" data-ooxml-cx="2743200" data-ooxml-cy="2057400" data-ooxml-rot="0" data-ooxml-shape-idx="1">
    <image x="576" y="72" width="288" height="216" href="data:image/png;base64,aGVsbG8=" preserveAspectRatio="xMidYMid slice"/>
  </g>
</svg>`;

test('PPTX SVG becomes native editable text, shape, and image blocks', () => {
  const { slide, report } = svgSlideToDeckSlide(SVG, { slideId: 'slide-1' });

  assert.equal(slide.id, 'slide-1');
  assert.equal(slide.background.type, 'color');
  assert.equal(slide.background.color, '#f8f6f0');
  assert.deepEqual(slide.blocks.map((block) => block.type), ['shape', 'text', 'image']);

  const [shape, text, image] = slide.blocks;
  assert.deepEqual({ x: shape.x, y: shape.y, w: shape.w, h: shape.h }, { x: 192, y: 144, w: 768, h: 288 });
  assert.equal(shape.shape, 'rect');
  assert.equal(shape.fill, '#6d5dfc');
  assert.equal(shape.radius, 36);

  assert.match(text.html, /Editable title/);
  assert.match(text.html, /Second line/);
  assert.equal(text.align, 'center');
  assert.equal(text.valign, 'middle');
  assert.equal(text.color, '#ffffff');

  assert.equal(image.src, 'data:image/png;base64,aGVsbG8=');
  assert.equal(image.fit, 'cover');
  assert.equal(report.editable.text, 1);
  assert.equal(report.editable.shapes, 1);
  assert.equal(report.editable.images, 1);
  assert.equal(report.flattened, 0);
});

test('unsupported complex elements are reported instead of silently disappearing', () => {
  const svg = `<svg width="960" height="540" data-ooxml-slide-cx="9144000" data-ooxml-slide-cy="5143500">
    <g data-ooxml-shape-type="chart" data-ooxml-x="914400" data-ooxml-y="514350" data-ooxml-cx="7315200" data-ooxml-cy="4114800" data-ooxml-shape-idx="0"><path d="M0 0h10v10z"/></g>
  </svg>`;
  const { slide, report } = svgSlideToDeckSlide(svg, { slideId: 'complex' });

  assert.equal(slide.blocks.length, 0);
  assert.equal(report.flattened, 1);
  assert.deepEqual(report.unsupported, ['chart']);
});

test('the first text run font overrides the SVG fallback font', () => {
  const svg = `<svg width="960" height="540" data-ooxml-slide-cx="9144000" data-ooxml-slide-cy="5143500">
    <g data-ooxml-shape-type="autoshape" data-ooxml-x="0" data-ooxml-y="0" data-ooxml-cx="4572000" data-ooxml-cy="914400" data-ooxml-shape-idx="0">
      <text font-family="Calibri, sans-serif" fill="#111111">
        <tspan data-ooxml-para-align="l">
          <tspan font-family="Helvetica Neue, Helvetica, Arial, sans-serif" data-ooxml-run-font="Helvetica Neue" font-size="24">Run font wins</tspan>
        </tspan>
      </text>
    </g>
  </svg>`;

  const { slide } = svgSlideToDeckSlide(svg, { slideId: 'run-font' });
  const text = slide.blocks.find((block) => block.type === 'text');

  assert.equal(text?.fontFamily, 'Helvetica Neue');
});
