import type { VoiceAdapter, VoiceListeningOptions } from "./types";

const MOCK_TRANSCRIPTS: Record<string, string[]> = {
  mr: [
    "मला सौर पॅनेल तंत्रज्ञान आणि सोलर पंप दुरुस्ती शिकायची आहे.",
    "मी १० वी उत्तीर्ण आहे, मला पुढील सरकारी शिष्यवृत्ती हवी आहे.",
    "मला दुग्ध व्यवसाय आणि आधुनिक कृषी तंत्रज्ञानाचे प्रशिक्षण हवे आहे.",
    "रेल्वे किंवा एसटी महामंडळ शिकाऊ उमेदवारी (Apprenticeship) कशी मिळेल?"
  ],
  hi: [
    "मुझे सोलर पंप रिपेयरिंग और सोलर पैनल इंस्टॉलेशन सीखना है।",
    "मैं 10वीं पास हूँ, मुझे आगे की सरकारी स्कॉलरशिप चाहिए।",
    "मुझे आधुनिक डेयरी और जैविक खेती की ट्रेनिंग चाहिए।",
    "मुझे रेलवे या बिजली विभाग में अप्रेंटिसशिप करनी है।"
  ],
  en: [
    "I want to become a certified solar pump and microgrid technician.",
    "I passed 10th grade and need post-matric scholarship details.",
    "I want vocational training in organic dairy farming & agribusiness.",
    "Tell me about railway and state transport apprenticeship programs."
  ]
};

export class MockVoiceAdapter implements VoiceAdapter {
  readonly id = "mock";
  readonly name = "Mock Voice Adapter (Zero-Config)";

  private listening = false;
  private timerId: number | null = null;
  private phraseIndices: Record<string, number> = { mr: 0, hi: 0, en: 0 };

  isListening(): boolean {
    return this.listening;
  }

  async startListening(options: VoiceListeningOptions): Promise<void> {
    if (this.listening) {
      this.stopListening();
    }

    this.listening = true;

    // Determine language key (mr, hi, en)
    const langKey = options.language.startsWith("mr") 
      ? "mr" 
      : options.language.startsWith("hi") 
        ? "hi" 
        : "en";

    const phrases = MOCK_TRANSCRIPTS[langKey] || MOCK_TRANSCRIPTS.en;
    const currentIndex = this.phraseIndices[langKey] % phrases.length;
    const chosenPhrase = phrases[currentIndex];
    this.phraseIndices[langKey] = currentIndex + 1;

    // Simulate listening audio latency:
    // First, emit partial listening feedback after 600ms
    window.setTimeout(() => {
      if (this.listening && options.onPartial) {
        options.onPartial(chosenPhrase.split(" ").slice(0, 3).join(" ") + "...");
      }
    }, 600);

    // Then emit full final recognized transcript after 1400ms
    this.timerId = window.setTimeout(() => {
      if (this.listening) {
        this.listening = false;
        options.onFinal(chosenPhrase);
      }
    }, 1400);
  }

  stopListening(): void {
    this.listening = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  async speak(text: string, language: string): Promise<void> {
    this.cancelSpeech();

    // Use browser SpeechSynthesis if supported, otherwise resolve gracefully
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 0.95; // Slightly slower for rural clarity
      utterance.onstart = () => {
        window.dispatchEvent(new CustomEvent("disha_speech_start", { detail: { text, language } }));
      };
      utterance.onend = () => {
        window.dispatchEvent(new CustomEvent("disha_speech_end", { detail: { text, language } }));
      };
      utterance.onerror = () => {
        window.dispatchEvent(new CustomEvent("disha_speech_end", { detail: { text, language } }));
      };
      window.speechSynthesis.speak(utterance);
    }
  }

  cancelSpeech(): void {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.dispatchEvent(new CustomEvent("disha_speech_end"));
    }
  }

  stop(): void {
    this.cancelSpeech();
    this.stopListening();
  }
}
