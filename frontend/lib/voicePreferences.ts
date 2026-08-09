export interface VoicePreferences {
  voice_input_language: string;
  voice_output_language: string;
  auto_read_responses: boolean;
  speech_speed: "slow" | "normal" | "fast";
}

export const DEFAULT_VOICE_PREFERENCES: VoicePreferences = {
  voice_input_language: "en",
  voice_output_language: "en",
  auto_read_responses: false,
  speech_speed: "normal",
};

export function getVoicePreferences(): VoicePreferences {
  if (typeof window === "undefined") return DEFAULT_VOICE_PREFERENCES;
  const saved = localStorage.getItem("agri_voice_preferences");
  const currentAppLang = localStorage.getItem("language") || "en";

  if (!saved) {
    return {
      ...DEFAULT_VOICE_PREFERENCES,
      voice_input_language: currentAppLang,
      voice_output_language: currentAppLang,
    };
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      voice_input_language: parsed.voice_input_language || currentAppLang,
      voice_output_language: parsed.voice_output_language || currentAppLang,
      auto_read_responses: typeof parsed.auto_read_responses === "boolean" ? parsed.auto_read_responses : false,
      speech_speed: parsed.speech_speed || "normal",
    };
  } catch {
    return {
      ...DEFAULT_VOICE_PREFERENCES,
      voice_input_language: currentAppLang,
      voice_output_language: currentAppLang,
    };
  }
}

export function saveVoicePreferences(prefs: VoicePreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("agri_voice_preferences", JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent("voicepreferenceschange", { detail: prefs }));
}

export function getSpeechSpeedRate(speed?: string): number {
  switch (speed) {
    case "slow":
      return 0.75;
    case "fast":
      return 1.3;
    case "normal":
    default:
      return 1.0;
  }
}
