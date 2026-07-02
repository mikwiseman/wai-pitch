import { STAGE_W, STAGE_H } from '@/types/deck';

/** Scale factor to fit a 1920×1080 stage inside a w×h box (contain). */
export function fitScale(boxW: number, boxH: number): number {
  return Math.min(boxW / STAGE_W, boxH / STAGE_H);
}

export const stageAspect = STAGE_W / STAGE_H; // 16:9
