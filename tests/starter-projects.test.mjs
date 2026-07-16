import test from 'node:test';
import assert from 'node:assert/strict';

import { starterProjectData, PROJECT_KINDS } from '../src/lib/starter-data.mjs';

test('every creation mode produces a substantial, valid-looking starter project', () => {
  assert.deepEqual(PROJECT_KINDS, ['presentation', 'interface', 'prototype']);

  for (const kind of PROJECT_KINDS) {
    const deck = starterProjectData(`New ${kind}`, kind);
    assert.equal(deck.version, 1);
    assert.equal(deck.theme.name, 'WAI Glass');
    assert.ok(deck.slides.length >= 3, `${kind} should not open as an empty canvas`);

    const slideIds = deck.slides.map((slide) => slide.id);
    const blockIds = deck.slides.flatMap((slide) => slide.blocks.map((block) => block.id));
    assert.equal(new Set(slideIds).size, slideIds.length, `${kind} slide ids must be unique`);
    assert.equal(new Set(blockIds).size, blockIds.length, `${kind} block ids must be unique`);
  }
});

test('starter titles are escaped before entering rich text', () => {
  const deck = starterProjectData('<img src=x onerror=alert(1)>', 'presentation');
  const richText = deck.slides.flatMap((slide) => slide.blocks)
    .filter((block) => block.type === 'text')
    .map((block) => block.html)
    .join(' ');

  assert.doesNotMatch(richText, /<img/i);
  assert.match(richText, /&lt;img/);
});

test('interface and prototype modes start from visibly different structures', () => {
  const interfaceDeck = starterProjectData('Northstar', 'interface');
  const prototypeDeck = starterProjectData('Northstar', 'prototype');

  assert.notDeepEqual(interfaceDeck.slides, prototypeDeck.slides);
  assert.ok(interfaceDeck.slides.some((slide) => slide.blocks.some((block) => block.type === 'shape' && block.radius >= 32)));
  assert.ok(prototypeDeck.slides.some((slide) => slide.blocks.some((block) => block.type === 'text' && /Step 0?1/.test(block.html))));
});
