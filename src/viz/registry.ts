import type { Visualizer } from "./types";
import { ladder } from "./units/ladder";
import { scope } from "./units/scope";
import { matrix } from "./units/matrix";

/**
 * Every visualizer the app knows about — hand-drawn panels that imitate a piece
 * of hardware.
 *
 * Adding another is a file in `units/` and a line here — nothing in the audio
 * pipeline, the canvas host, or the settings panel needs to change.
 */
export const VISUALIZERS: Visualizer[] = [ladder, scope, matrix];

export const DEFAULT_VIZ = ladder.id;

export function getVisualizer(id: string): Visualizer {
  return VISUALIZERS.find((v) => v.id === id) ?? ladder;
}
