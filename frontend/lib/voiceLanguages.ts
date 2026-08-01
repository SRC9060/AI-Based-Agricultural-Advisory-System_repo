export const VOICE_LANGUAGE_CODES = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
  kn: "kn-IN",
  ta: "ta-IN",
  ml: "ml-IN",
  mr: "mr-IN",
  gu: "gu-IN",
} as const;

export type VoiceLanguage = keyof typeof VOICE_LANGUAGE_CODES;

export function getVoiceLanguageCode(language: string): string {
  return (
    VOICE_LANGUAGE_CODES[language as VoiceLanguage] ??
    VOICE_LANGUAGE_CODES.en
  );
}

export function detectVoiceLanguage(
  text: string,
  preferredLanguage: string,
): VoiceLanguage {
  if (/[\u0C80-\u0CFF]/u.test(text)) return "kn";
  if (/[\u0C00-\u0C7F]/u.test(text)) return "te";
  if (/[\u0B80-\u0BFF]/u.test(text)) return "ta";
  if (/[\u0D00-\u0D7F]/u.test(text)) return "ml";
  if (/[\u0A80-\u0AFF]/u.test(text)) return "gu";

  // Hindi and Marathi share Devanagari, so retain the user's selection.
  if (/[\u0900-\u097F]/u.test(text)) {
    return preferredLanguage === "mr" ? "mr" : "hi";
  }

  if (preferredLanguage in VOICE_LANGUAGE_CODES) {
    return preferredLanguage as VoiceLanguage;
  }

  return "en";
}
