import { join } from 'node:path';

export const DATA_DIR = process.env.WAI_DESIGN_DATA_DIR || join(process.cwd(), 'data');
export const DB_PATH = join(DATA_DIR, 'wai-pitch.db');

