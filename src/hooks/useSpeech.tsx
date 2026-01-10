import { useCallback, useEffect, useState } from "react";

export type SpeechSpeed = "slow" | "normal" | "fast";

const SPEED_RATES: Record<SpeechSpeed, number> = {
  slow: 0.6,
  normal: 0.85,
  fast: 1.1,
};

const SPEECH_SPEED_KEY = "speech_speed_preference";

// Get saved speed preference from localStorage
export const getSavedSpeed = (): SpeechSpeed => {
  if (typeof window === "undefined") return "normal";
  const saved = localStorage.getItem(SPEECH_SPEED_KEY);
  if (saved === "slow" || saved === "normal" || saved === "fast") {
    return saved;
  }
  return "normal";
};

// Save speed preference to localStorage
export const saveSpeed = (speed: SpeechSpeed) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(SPEECH_SPEED_KEY, speed);
  }
};

export const useSpeech = () => {
  const [preferredVoice, setPreferredVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speed, setSpeed] = useState<SpeechSpeed>(getSavedSpeed);

  useEffect(() => {
    const selectBestVoice = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length === 0) return;

      // Priority list for high-quality English voices
      const preferredVoiceNames = [
        // Google voices (high quality)
        "Google US English",
        "Google UK English Female",
        "Google UK English Male",
        // Microsoft voices (high quality on Windows/Edge)
        "Microsoft Zira - English (United States)",
        "Microsoft David - English (United States)",
        "Microsoft Mark - English (United States)",
        // Apple voices (high quality on macOS/iOS)
        "Samantha",
        "Alex",
        "Daniel",
        "Karen",
        // Android voices
        "English United States",
      ];

      // Try to find a preferred voice
      for (const name of preferredVoiceNames) {
        const voice = voices.find(v => v.name.includes(name));
        if (voice) {
          setPreferredVoice(voice);
          return;
        }
      }

      // Fallback: find any native English voice
      const nativeEnglishVoice = voices.find(
        v => v.lang.startsWith("en") && v.localService === false
      );
      if (nativeEnglishVoice) {
        setPreferredVoice(nativeEnglishVoice);
        return;
      }

      // Last resort: any English voice
      const anyEnglishVoice = voices.find(v => v.lang.startsWith("en"));
      if (anyEnglishVoice) {
        setPreferredVoice(anyEnglishVoice);
      }
    };

    // Voices may load asynchronously
    selectBestVoice();
    speechSynthesis.addEventListener("voiceschanged", selectBestVoice);

    return () => {
      speechSynthesis.removeEventListener("voiceschanged", selectBestVoice);
    };
  }, []);

  const changeSpeed = useCallback((newSpeed: SpeechSpeed) => {
    setSpeed(newSpeed);
    saveSpeed(newSpeed);
  }, []);

  const speak = useCallback((text: string, overrideRate?: number) => {
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = overrideRate ?? SPEED_RATES[speed];
    utterance.pitch = 1;
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    speechSynthesis.speak(utterance);
  }, [preferredVoice, speed]);

  return { speak, preferredVoice, speed, changeSpeed };
};

// Global speech function for components that don't use the hook
let cachedVoice: SpeechSynthesisVoice | null = null;

const initVoice = () => {
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return;

  const preferredVoiceNames = [
    "Google US English",
    "Google UK English Female", 
    "Google UK English Male",
    "Microsoft Zira - English (United States)",
    "Microsoft David - English (United States)",
    "Samantha",
    "Alex",
    "Daniel",
  ];

  for (const name of preferredVoiceNames) {
    const voice = voices.find(v => v.name.includes(name));
    if (voice) {
      cachedVoice = voice;
      return;
    }
  }

  const nativeEnglishVoice = voices.find(
    v => v.lang.startsWith("en") && v.localService === false
  );
  if (nativeEnglishVoice) {
    cachedVoice = nativeEnglishVoice;
    return;
  }

  const anyEnglishVoice = voices.find(v => v.lang.startsWith("en"));
  if (anyEnglishVoice) {
    cachedVoice = anyEnglishVoice;
  }
};

// Initialize on load
if (typeof window !== "undefined") {
  initVoice();
  speechSynthesis.addEventListener("voiceschanged", initVoice);
}

export const speakWord = (word: string, overrideRate?: number) => {
  speechSynthesis.cancel();
  
  const savedSpeed = getSavedSpeed();
  const rate = overrideRate ?? SPEED_RATES[savedSpeed];
  
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  utterance.rate = rate;
  utterance.pitch = 1;
  
  if (cachedVoice) {
    utterance.voice = cachedVoice;
  }
  
  speechSynthesis.speak(utterance);
};
