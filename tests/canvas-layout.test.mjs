import test from 'node:test';
import assert from 'node:assert/strict';

import { canvasInsetForWidth } from '../src/lib/canvas-layout.mjs';

test('canvas inset keeps narrow editors wide while preserving desktop breathing room', () => {
  assert.equal(canvasInsetForWidth(390), 24);
  assert.equal(canvasInsetForWidth(720), 48);
  assert.equal(canvasInsetForWidth(1280), 72);
});
