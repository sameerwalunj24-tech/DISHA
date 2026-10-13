import type { VoiceAdapter } from "./types";
import { WebSpeechVoiceAdapter } from "./WebSpeechVoiceAdapter";

// Default singleton instance using WebSpeechVoiceAdapter (with automatic Mock fallback)
export const voiceService: VoiceAdapter = new WebSpeechVoiceAdapter();

export type * from "./types";
export { MockVoiceAdapter } from "./MockVoiceAdapter";
export { WebSpeechVoiceAdapter } from "./WebSpeechVoiceAdapter";
