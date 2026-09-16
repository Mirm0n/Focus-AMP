import type { Visualizer } from "./types";
import { ladder } from "./units/ladder";
import { scope } from "./units/scope";
import { matrix } from "./units/matrix";
import { spikes } from "./units/spikes";
import { rings } from "./units/rings";
import { tide } from "./units/tide";
import { ambience } from "./units/ambience";

/**
 * Every visualizer the app knows about, ordered hardware-first: the three that
 * imitate a physical panel, then the four screen-era ones.
 *
 * Adding another is a file in `units/` and a line here — nothing in the audio
 * pipeline, the canvas host, or the settings panel needs to change.
 */
export const VISUALIZERS: Visualizer[] = [
  ladder,
  scope,
  matrix,
  spikes,
  rings,
  tide,
  ambience,
];

export const DEFAULT_VIZ = ladder.id;

export function getVisualizer(id: string): Visualizer {
  return VISUALIZERS.find((v) => v.id === id) ?? ladder;
}
