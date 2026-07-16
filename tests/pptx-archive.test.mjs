import test from 'node:test';
import assert from 'node:assert/strict';

import { validatePptxArchive } from '../src/lib/import/pptx-archive.mjs';

function fakeArchive(uncompressedBytes, flags = 0) {
  const buffer = Buffer.alloc(80);
  buffer.writeUInt32LE(0x04034b50, 0);
  buffer.writeUInt32LE(0x02014b50, 20);
  buffer.writeUInt16LE(flags, 28);
  buffer.writeUInt32LE(uncompressedBytes, 44);
  return buffer;
}

test('PPTX archive validation rejects encrypted and zip-bomb-sized entries', () => {
  assert.throws(() => validatePptxArchive(fakeArchive(8 * 1024 * 1024, 1)), /encrypted/i);
  assert.throws(() => validatePptxArchive(fakeArchive(300 * 1024 * 1024)), /too large/i);
});

test('PPTX archive validation accepts a normal archive envelope', () => {
  assert.doesNotThrow(() => validatePptxArchive(fakeArchive(8 * 1024 * 1024)));
});

