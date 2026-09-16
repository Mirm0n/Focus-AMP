/**
 * Butterchurn ships no types. These cover only what we call — enough for the
 * compiler to keep us honest without pretending to describe the whole library.
 */

declare module "butterchurn" {
  export interface ButterchurnVisualizer {
    connectAudio(node: AudioNode): void;
    loadPreset(preset: unknown, blendTime: number): void;
    setRendererSize(width: number, height: number): void;
    render(): void;
    launchSongTitleAnim(title: string): void;
    loadExtraImages(images: unknown): void;
  }

  export interface ButterchurnOptions {
    width: number;
    height: number;
    pixelRatio?: number;
    textureRatio?: number;
    meshWidth?: number;
    meshHeight?: number;
  }

  const butterchurn: {
    createVisualizer(
      audioContext: AudioContext,
      canvas: HTMLCanvasElement,
      options: ButterchurnOptions,
    ): ButterchurnVisualizer;
  };

  export default butterchurn;
}

declare module "butterchurn-presets" {
  /** Preset name to opaque preset object. */
  type PresetMap = Record<string, unknown>;
  const presets: PresetMap & { getPresets?: () => PresetMap };
  export default presets;
}
