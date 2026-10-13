import type { VoiceAdapter } from "./types";
import { MockVoiceAdapter } from "./MockVoiceAdapter";

// Default singleton instance using MockVoiceAdapter
export const voiceService: VoiceAdapter = new MockVoiceAdapter();

export type * from "./types";
export * from "./MockVoiceAdapter";
