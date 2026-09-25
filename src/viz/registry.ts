import type { Visualizer } from "./types";
import { ladder } from "./units/ladder";
import { phosphor } from "./units/phosphor";
import { matrix } from "./units/matrix";
import { vfd } from "./units/vfd";
import { needle } from "./units/needle";
import { waterfall } from "./units/waterfall";
import { ridge } from "./units/ridge";

/**
 * Every visualizer the app knows about — hand-drawn panels that imitate a piece
 * of hardware.
 *
 * Adding another is a file in `units/` and a line here — nothing in the audio
 * pipeline, the canvas host, or the settings panel needs to change.
 */
export const VISUALIZERS: Visualizer[] = [ladder, vfd, matrix, phosphor, ridge, waterfall, needle];

export const DEFAULT_VIZ = ladder.id;

/** Ids that have been renamed, so a saved choice survives the rename. */
const RENAMED: Record<string, string> = { scope: phosphor.id };

export function getVisualizer(id: string): Visualizer {
  const current = RENAMED[id] ?? id;
  return VISUALIZERS.find((v) => v.id === current) ?? ladder;
}
