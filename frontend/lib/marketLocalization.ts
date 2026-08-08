import { LanguageCode } from "./languages";
import { coreTranslations } from "./coreTranslations";

/**
 * Robust Market Prices Normalization & Translation Resolver.
 *
 * Requirements:
 * 1. Preserves original canonical English value as <option value="..."> and API parameter.
 * 2. Normalizes strings only for dictionary LOOKUP (whitespace, casing, parentheses, slashes, Indic scripts).
 * 3. Never returns empty or raw unlocalized strings if a translation or clean label exists.
 * 4. Renders instantaneously without async network calls.
 */

// Helper to remove embedded non-English scripts (Devanagari, Kannada, Telugu, Tamil, Malayalam, Gujarati)
export function stripEmbeddedIndicScripts(str: string): string {
  if (!str) return "";
  // Remove Indic character ranges: \u0900-\u0DFF
  return str
    .replace(/[\u0900-\u0DFF]+/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\/\s*\//g, "/")
    .replace(/^\/|\/$/g, "")
    .trim();
}

// Normalizes commodity / location key for dictionary lookup
export function normalizeMarketKey(raw: string): string {
  if (!raw) return "";

  let key = raw.trim();

  // Strip embedded non-ASCII Indic scripts if present (e.g. "Bhindi (ಬೆಂಡೆಕಾಯಿ)" -> "Bhindi", "Pea Pod/Pea Cod/हरी मटर" -> "Pea Pod/Pea Cod")
  key = stripEmbeddedIndicScripts(key);

  // Normalize common AGMARKNET spacing around parentheses: "Ridgeguard(Tori)" -> "Ridgeguard (Tori)"
  key = key.replace(/([^\s])\(/g, "$1 (").replace(/\)\s*([^\s])/g, ") $1");

  // Normalize trailing/leading/multiple spaces
  key = key.replace(/\s+/g, " ").trim();

  return key;
}

// Map common AGMARKNET alias/spelling variations to standard canonical English terms
const COMMODITY_ALIASES: Record<string, string> = {
  "ridgeguard": "Ridge Gourd",
  "ridgeguard (tori)": "Ridge Gourd",
  "ridgeguard(tori)": "Ridge Gourd",
  "ridge gourd": "Ridge Gourd",
  "bitter gourd": "Bitter Gourd",
  "bottle gourd": "Bottle Gourd",
  "snakeguard": "Snake Gourd",
  "snake gourd": "Snake Gourd",
  "sponge gourd": "Sponge Gourd",
  "cluster beans": "Cluster Beans",
  "bhindi": "Ladies Finger",
  "bhindi(ladies finger)": "Ladies Finger",
  "bhindi (ladies finger)": "Ladies Finger",
  "lady finger": "Ladies Finger",
  "ladies finger": "Ladies Finger",
  "cowpea(veg)": "Cowpea",
  "cowpea (veg)": "Cowpea",
  "cowpea": "Cowpea",
  "bataani/green": "Green Peas",
  "bataani green": "Green Peas",
  "green peas": "Green Peas",
  "onion green": "Green Onion",
  "green onion": "Green Onion",
  "ground nut seed": "Groundnut Seed",
  "groundnut seed": "Groundnut Seed",
  "groundnut": "Groundnut",
  "green gram(moong)(whole)": "Green Gram (Whole)",
  "green gram (moong) (whole)": "Green Gram (Whole)",
  "green gram (whole)": "Green Gram (Whole)",
  "red gram/arhar/tur(whole)": "Red Gram (Whole)",
  "red gram/arhar/tur (whole)": "Red Gram (Whole)",
  "red gram (whole)": "Red Gram (Whole)",
  "arhar (tur/red gram)(whole)": "Red Gram (Whole)",
  "arhar (tur/red gram) (whole)": "Red Gram (Whole)",
  "bengal gram(gram)(whole)": "Bengal Gram (Whole)",
  "bengal gram (gram) (whole)": "Bengal Gram (Whole)",
  "black gram(urd beans)(whole)": "Black Gram (Whole)",
  "black gram (urd beans) (whole)": "Black Gram (Whole)",
  "pea pod/pea cod": "Pea Pod",
  "sweet corn": "Sweet Corn",
  "keralam": "Kerala",
  "chattrapati sambhajinagar": "Aurangabad",
  "aurangabad": "Aurangabad",
  "east champaran/ motihari": "East Champaran",
  "ropar (rupnagar)": "Rupar",
};

export function getLocalizedMarketLabel(rawStr: string, language: LanguageCode): string {
  if (!rawStr) return "";

  const trimmed = rawStr.trim();
  const dict = coreTranslations[language] || {};

  // 1. Exact match in language dictionary
  if (dict[rawStr]) return dict[rawStr];
  if (dict[trimmed]) return dict[trimmed];

  // 2. Normalized key match
  const normalizedKey = normalizeMarketKey(rawStr);
  if (dict[normalizedKey]) return dict[normalizedKey];

  // 3. Alias lookup
  const lowerKey = normalizedKey.toLowerCase();
  const canonicalAlias = COMMODITY_ALIASES[lowerKey];
  if (canonicalAlias && dict[canonicalAlias]) {
    return dict[canonicalAlias];
  }

  // 4. English fallback cleanup (if language is "en")
  if (language === "en") {
    if (canonicalAlias) return canonicalAlias;
    return normalizedKey || trimmed;
  }

  // 5. Parenthetical / Sub-term decomposition lookup
  if (normalizedKey.includes("(")) {
    const mainTerm = normalizedKey.replace(/\([^\)]*\)/g, "").trim();
    const parentheticalContent = (normalizedKey.match(/\(([^\)]+)\)/) || [])[1] || "";

    const mainTrans =
      dict[mainTerm] ||
      (COMMODITY_ALIASES[mainTerm.toLowerCase()] ? dict[COMMODITY_ALIASES[mainTerm.toLowerCase()]] : null) ||
      mainTerm;
    const parentheticalTrans =
      dict[parentheticalContent] ||
      (COMMODITY_ALIASES[parentheticalContent.toLowerCase()]
        ? dict[COMMODITY_ALIASES[parentheticalContent.toLowerCase()]]
        : null);

    if (mainTrans && parentheticalTrans) {
      return `${mainTrans} (${parentheticalTrans})`;
    } else if (mainTrans && mainTrans !== mainTerm) {
      return mainTrans;
    }
  }

  // 6. Slash decomposition lookup
  if (normalizedKey.includes("/")) {
    const parts = normalizedKey.split("/").map((p) => p.trim());
    for (const part of parts) {
      if (dict[part]) return dict[part];
      const partLower = part.toLowerCase();
      if (COMMODITY_ALIASES[partLower] && dict[COMMODITY_ALIASES[partLower]]) {
        return dict[COMMODITY_ALIASES[partLower]];
      }
    }
  }

  // 7. Fall back to clean English string without embedded mixed scripts
  return canonicalAlias || normalizedKey || trimmed;
}
