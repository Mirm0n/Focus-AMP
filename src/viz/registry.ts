import type { Visualizer } from "./types";
import { ladder } from "./units/ladder";
import { scope } from "./units/scope";
import { vu } from "./units/vu";
import { chrome } from "./units/chrome";
import { matrix } from "./units/matrix";

/**
 * Every visualizer the app knows about.
 *
 * Adding one is a file in `units/` and a line here — nothing in the audio
 * pipeline, the canvas host, or the settings panel needs to change.
 */
export const VISUALIZERS: Visualizer[] = [ladder, scope, vu, chrome, matrix];

export const DEFAULT_VIZ = ladder.id;

export function getVisualizer(id: string): Visualizer {
  return VISUALIZERS.find((v) => v.id === id) ?? ladder;
}
