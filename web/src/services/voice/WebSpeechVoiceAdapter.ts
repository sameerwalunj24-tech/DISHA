import type { VoiceAdapter, VoiceListeningOptions } from "./types";
import { MockVoiceAdapter } from "./MockVoiceAdapter";

// Polyfill window types for SpeechRecognition
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export class WebSpeechVoiceAdapter implements VoiceAdapter {
  readonly id = "webspeech";
  readonly name = "Web Speech API (Native Browser STT/TTS)";

  private recognition: any = null;
  private isCurrentlyListening = false;
  private fallbackAdapter = new MockVoiceAdapter();

  constructor() {
    const win = typeof window !== "undefined" ? (window as unknown as IWindow) : null;
    const SpeechRec = win?.SpeechRecognition || win?.webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        this.recognition = new SpeechRec();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
      } catch (e) {
        console.warn("[WebSpeech] Failed to instantiate SpeechRecognition, using fallback:", e);
      }
    }
  }

  isListening(): boolean {
    return this.isCurrentlyListening;
  }

  async startListening(options: VoiceListeningOptions): Promise<void> {
    // If browser doesn't support SpeechRecognition or is currently offline, use MockVoiceAdapter
    if (!this.recognition || !navigator.onLine) {
      console.log("[WebSpeech] Recognition unsupported or device is offline. Using MockVoiceAdapter.");
      this.isCurrentlyListening = true;
      return this.fallbackAdapter.startListening({
        ...options,
        onFinal: (text) => {
          this.isCurrentlyListening = false;
          options.onFinal(text);
        },
        onError: (err) => {
          this.isCurrentlyListening = false;
          options.onError(err);
        }
      });
    }

    try {
      this.stopListening();

      // Configure language for SpeechRecognition
      this.recognition.lang = options.language || "mr-IN";
      this.isCurrentlyListening = true;

      this.recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        if (interimTranscript && options.onPartial) {
          options.onPartial(interimTranscript);
        }

        if (finalTranscript) {
          this.isCurrentlyListening = false;
          options.onFinal(finalTranscript);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn("[WebSpeech] Recognition error:", event.error);
        this.isCurrentlyListening = false;
        // On speech error (e.g. no-speech, network failure), fall back gracefully to mock
        this.fallbackAdapter.startListening({
          ...options,
          onFinal: (text) => {
            this.isCurrentlyListening = false;
            options.onFinal(text);
          }
        });
      };

      this.recognition.onend = () => {
        this.isCurrentlyListening = false;
      };

      this.recognition.start();
    } catch (err: any) {
      console.warn("[WebSpeech] Failed to start native speech, switching to fallback:", err);
      this.isCurrentlyListening = true;
      return this.fallbackAdapter.startListening({
        ...options,
        onFinal: (text) => {
          this.isCurrentlyListening = false;
          options.onFinal(text);
        }
      });
    }
  }

  stopListening(): void {
    this.isCurrentlyListening = false;
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {
        // ignore
      }
    }
    this.fallbackAdapter.stopListening();
  }

  async speak(text: string, language: string): Promise<void> {
    this.cancelSpeech();

    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language || "mr-IN";
      utterance.rate = 0.95; // comfortable cadence for rural listeners
      
      // Try to find native Indic voice if available
      const voices = window.speechSynthesis.getVoices();
      const matchVoice = voices.find(v => v.lang.startsWith(language.slice(0, 2)));
      if (matchVoice) {
        utterance.voice = matchVoice;
      }

      window.speechSynthesis.speak(utterance);
    }
  }

  cancelSpeech(): void {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }
}
