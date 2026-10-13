export interface VoiceListeningOptions {
  language: string; // 'mr-IN', 'hi-IN', 'en-IN'
  onPartial?: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (error: string) => void;
}

export interface VoiceAdapter {
  readonly id: string;
  readonly name: string;
  
  isListening(): boolean;
  startListening(options: VoiceListeningOptions): Promise<void>;
  stopListening(): void;
  speak(text: string, language: string): Promise<void>;
  cancelSpeech(): void;
}
