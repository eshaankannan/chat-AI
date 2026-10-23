// Shared audio manager for Gemini TTS and Web Speech API with Universal Multilingual Support

let currentAudio: HTMLAudioElement | null = null;
let currentOnEndCallback: (() => void) | null = null;

export function detectScriptLanguageCode(text: string): string {
  // Check for common global scripts
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN'; // Tamil
  if (/[\u0900-\u097F]/.test(text)) return 'hi-IN'; // Hindi / Marathi
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN'; // Telugu
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml-IN'; // Malayalam
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN'; // Kannada
  if (/[\u0980-\u09FF]/.test(text)) return 'bn-IN'; // Bengali
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu-IN'; // Gujarati
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa-IN'; // Punjabi
  if (/[\u0600-\u06FF]/.test(text)) return 'ar-SA'; // Arabic / Urdu / Farsi
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh-CN'; // Chinese
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja-JP'; // Japanese
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko-KR'; // Korean
  if (/[\u0400-\u04FF]/.test(text)) return 'ru-RU'; // Russian / Cyrillic
  if (/[\u0370-\u03FF]/.test(text)) return 'el-GR'; // Greek
  if (/[\u0590-\u05FF]/.test(text)) return 'he-IL'; // Hebrew
  if (/[\u0E00-\u0E7F]/.test(text)) return 'th-TH'; // Thai

  // Western romance/germanic checks based on distinctive accents
  if (/[éèàùçêôîëï]/i.test(text) && !/[ñáíóú]/i.test(text)) return 'fr-FR'; // French
  if (/[ñáíóúü¿¡]/i.test(text)) return 'es-ES'; // Spanish
  if (/[äöüß]/i.test(text)) return 'de-DE'; // German
  if (/[ãõçêôáéíóú]/i.test(text)) return 'pt-BR'; // Portuguese
  if (/[àèìòù]/i.test(text)) return 'it-IT'; // Italian
  if (/[ğüşöçİı]/i.test(text)) return 'tr-TR'; // Turkish
  if (/[ąćęłńóśźż]/i.test(text)) return 'pl-PL'; // Polish

  return 'en-US';
}

export function cleanTextForSpeech(raw: string): string {
  // Strip code blocks so the voice speaks conversational thoughts, reactions, and explanations naturally
  let cleaned = raw
    .replace(/```[a-zA-Z0-9_-]*\n[\s\S]*?```/g, '. ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/[*_#~>\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If text was almost purely code, say a helpful summary
  if (cleaned.length < 5) {
    cleaned = 'Complete code is available in the canvas panel.';
  }

  // Cap at 600 chars for smooth conversational speech
  return cleaned.slice(0, 600);
}

export function stopCurrentSpeech() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (currentOnEndCallback) {
    currentOnEndCallback();
    currentOnEndCallback = null;
  }
}

export async function speakText(
  text: string,
  voice: string = 'Kore',
  onStart?: () => void,
  onEnd?: () => void,
  preferredSpeechCode?: string
): Promise<void> {
  stopCurrentSpeech();

  const speechContent = cleanTextForSpeech(text);
  if (!speechContent) return;

  const targetSpeechCode = preferredSpeechCode && preferredSpeechCode !== 'auto'
    ? preferredSpeechCode
    : detectScriptLanguageCode(speechContent);

  currentOnEndCallback = onEnd || null;

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: speechContent, voice }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        currentAudio = audio;

        audio.onplay = () => {
          onStart?.();
        };

        audio.onended = () => {
          currentAudio = null;
          onEnd?.();
          currentOnEndCallback = null;
        };

        audio.onerror = () => {
          currentAudio = null;
          fallbackBrowserSpeech(speechContent, onStart, onEnd, targetSpeechCode);
        };

        await audio.play();
        return;
      }
    }
    fallbackBrowserSpeech(speechContent, onStart, onEnd, targetSpeechCode);
  } catch {
    fallbackBrowserSpeech(speechContent, onStart, onEnd, targetSpeechCode);
  }
}

function fallbackBrowserSpeech(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  speechLang: string = 'en-US'
) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLang;

    const voices = window.speechSynthesis.getVoices();
    const langPrefix = speechLang.split('-')[0].toLowerCase();
    const matchedVoice = voices.find(
      (v) => v.lang.toLowerCase().startsWith(langPrefix) || v.lang.toLowerCase() === speechLang.toLowerCase()
    );

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      onStart?.();
    };

    utterance.onend = () => {
      onEnd?.();
      currentOnEndCallback = null;
    };

    utterance.onerror = () => {
      onEnd?.();
      currentOnEndCallback = null;
    };

    window.speechSynthesis.speak(utterance);
  } else {
    onEnd?.();
    currentOnEndCallback = null;
  }
}
