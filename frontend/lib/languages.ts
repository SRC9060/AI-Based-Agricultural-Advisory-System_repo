export const APP_LANGUAGES = [
  { code: "en", apiCode: "en-IN", name: "English", nativeName: "English" },
  { code: "hi", apiCode: "hi-IN", name: "Hindi", nativeName: "हिन्दी" },
  { code: "te", apiCode: "te-IN", name: "Telugu", nativeName: "తెలుగు" },
  { code: "kn", apiCode: "kn-IN", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ta", apiCode: "ta-IN", name: "Tamil", nativeName: "தமிழ்" },
  { code: "ml", apiCode: "ml-IN", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "mr", apiCode: "mr-IN", name: "Marathi", nativeName: "मराठी" },
  { code: "gu", apiCode: "gu-IN", name: "Gujarati", nativeName: "ગુજરાતી" },
] as const;

export type LanguageCode = (typeof APP_LANGUAGES)[number]["code"];

const languageAliases = new Map<string, LanguageCode>();

for (const language of APP_LANGUAGES) {
  languageAliases.set(language.code.toLowerCase(), language.code);
  languageAliases.set(language.apiCode.toLowerCase(), language.code);
  languageAliases.set(language.name.toLowerCase(), language.code);
  languageAliases.set(language.nativeName.toLowerCase(), language.code);
}

export function normalizeLanguage(
  value: string | null | undefined,
  fallback: LanguageCode = "en",
): LanguageCode {
  if (!value) return fallback;
  return languageAliases.get(value.trim().toLowerCase()) ?? fallback;
}

export function getLanguageName(value: string | null | undefined) {
  const code = normalizeLanguage(value);
  return APP_LANGUAGES.find((language) => language.code === code)?.name ?? "English";
}

export function getLanguageLocale(value: string | null | undefined) {
  const code = normalizeLanguage(value);
  return APP_LANGUAGES.find((language) => language.code === code)?.apiCode ?? "en-IN";
}
