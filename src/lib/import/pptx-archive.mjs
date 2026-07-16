const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const MAX_ENTRY_BYTES = 256 * 1024 * 1024;
const MAX_TOTAL_BYTES = 750 * 1024 * 1024;
const MAX_ENTRIES = 20_000;

export function validatePptxArchive(buffer) {
  if (!buffer || buffer.length < 4 || buffer.readUInt32LE(0) !== LOCAL_SIGNATURE) {
    throw new Error('The uploaded file is not a valid PPTX archive');
  }
  let offset = 0;
  let entries = 0;
  let total = 0;
  while ((offset = buffer.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]), offset)) !== -1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== CENTRAL_SIGNATURE) break;
    const flags = buffer.readUInt16LE(offset + 8);
    if (flags & 1) throw new Error('Encrypted PowerPoint files are not supported');
    const uncompressed = buffer.readUInt32LE(offset + 24);
    if (uncompressed > MAX_ENTRY_BYTES) throw new Error('The PPTX expands to an unsafe size (one entry is too large)');
    total += uncompressed;
    entries += 1;
    if (total > MAX_TOTAL_BYTES) throw new Error('The PPTX expands to an unsafe total size');
    if (entries > MAX_ENTRIES) throw new Error('The PPTX contains too many archive entries');
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  if (entries === 0) throw new Error('The PPTX archive has no readable central directory');
}

