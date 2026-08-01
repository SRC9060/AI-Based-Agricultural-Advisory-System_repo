import { API_URL } from "@/lib/api";
import { getAuthHeaders } from "@/lib/auth";
import { LanguageCode } from "@/lib/languages";

const translationCache = new Map<string, string>();

export async function translateTexts(
  texts: string[],
  language: LanguageCode,
): Promise<string[]> {
  if (language === "en" || texts.length === 0) return texts;

  try {
    const response = await fetch(`${API_URL}/translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        texts,
        source_language: "en",
        target_language: language,
      }),
    });

    if (!response.ok) return texts;
    const data = await response.json();
    return Array.isArray(data.translations) &&
      data.translations.length === texts.length
      ? data.translations
      : texts;
  } catch {
    return texts;
  }
}

export async function translateTextMap(
  texts: string[],
  language: LanguageCode,
): Promise<Record<string, string>> {
  const uniqueTexts = Array.from(
    new Set(texts.map((text) => text.trim()).filter(Boolean)),
  );

  if (language === "en" || uniqueTexts.length === 0) {
    return Object.fromEntries(uniqueTexts.map((text) => [text, text]));
  }

  const translatedEntries: Array<[string, string]> = uniqueTexts
    .filter((text) => translationCache.has(`${language}:${text}`))
    .map((text) => [text, translationCache.get(`${language}:${text}`) || text]);
  const missingTexts = uniqueTexts.filter(
    (text) => !translationCache.has(`${language}:${text}`),
  );

  // The backend accepts at most 20 strings per request. Process larger market
  // option lists in small sequential batches to respect that contract and
  // avoid exhausting the translation provider's concurrent-request limit.
  for (let index = 0; index < missingTexts.length; index += 20) {
    const batch = missingTexts.slice(index, index + 20);
    const translations = await translateTexts(batch, language);
    batch.forEach((text, batchIndex) => {
      const translatedText = translations[batchIndex] || text;
      translationCache.set(`${language}:${text}`, translatedText);
      translatedEntries.push([text, translatedText]);
    });
  }

  return Object.fromEntries(translatedEntries);
}
