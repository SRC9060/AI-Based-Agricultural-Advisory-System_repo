"use client";

import { API_URL, apiFetch } from "@/lib/api";
import { loadCache, saveCache } from "@/lib/offlineCache";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from "@/components/LanguageProvider";
import { useRequireSession } from "@/lib/session";
import { translateTexts } from "@/lib/translation";

interface SchemeItem {
  title?: string;
}

interface SchemeResponse {
  count?: number;
  schemes?: SchemeItem[];
  available?: boolean;
}

function isSchemeResponse(value: unknown): value is SchemeResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const response = value as SchemeResponse;
  return (
    typeof response.count === "number" &&
    response.count >= 0 &&
    Array.isArray(response.schemes) &&
    response.schemes.length === response.count &&
    response.schemes.every((scheme) => Boolean(scheme && typeof scheme.title === "string" && scheme.title.trim()))
  );
}

function formatSchemes(response: SchemeResponse) {
  return response.schemes
    ?.map((scheme) => scheme.title)
    .filter((title): title is string => Boolean(title && title.trim()))
    .join("\n");
}

export default function SchemesPage() {
  const { session, checkingSession } = useRequireSession();
  const { language, t } = useTranslation();
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cached, setCached] = useState(false);
  const [cachedTimestamp, setCachedTimestamp] = useState<string>();

  const quickQuestions = [
    {
      icon: "💰",
      title: "Financial Assistance",
      query:
        "What financial assistance government schemes are available for farmers?",
    },
    {
      icon: "🌾",
      title: "Crop Insurance",
      query:
        "What government crop insurance schemes are available for farmers?",
    },
    {
      icon: "💧",
      title: "Irrigation Support",
      query:
        "What government irrigation subsidy schemes are available for farmers?",
    },
    {
      icon: "🚜",
      title: "Farm Machinery",
      query: "What government schemes provide subsidies for farm machinery?",
    },
    {
      icon: "🧑‍🌾",
      title: "Small Farmers",
      query:
        "What government schemes are available for small and marginal farmers?",
    },
  ];

  useEffect(() => {
    async function loadSchemes() {
      if (!session) return;
      const userId = session.userId;
      const cacheKey = `schemes_${userId}`;

      console.log(`[SchemesPage] Before fetch: GET ${API_URL}/schemes/${userId}`);
      try {
        setLoading(true);
        const response = await apiFetch(`${API_URL}/schemes/${userId}`, {
          cache: "no-store",
        });

        console.log("[SchemesPage] Response status:", response.status);
        if (!response.ok) {
          throw new Error("Unable to Retrieve Government Schemes");
        }

        const data: unknown = await response.json();
        console.log("[SchemesPage] Parsed response:", data);

        if (!isSchemeResponse(data)) {
          throw new Error("Invalid Government Schemes Response");
        }
        if (data.available === false) {
          throw new Error("Government scheme information is temporarily unavailable.");
        }

        const formattedResponse = formatSchemes(data);

        setResponse(formattedResponse || "");
        setError("");
        setCached(false);
        setCachedTimestamp(undefined);
        saveCache(cacheKey, data);
      } catch (err) {
        console.error("[SchemesPage] Error in loadSchemes:", err);

        const cachedSchemes = loadCache<SchemeResponse>(cacheKey);
        if (cachedSchemes && isSchemeResponse(cachedSchemes.data)) {
          const formattedResponse = formatSchemes(cachedSchemes.data);
          if (formattedResponse) {
            setResponse(formattedResponse);
            setError("");
            setCached(true);
            setCachedTimestamp(cachedSchemes.timestamp);
          }
        }
      } finally {
        console.log("[SchemesPage] Finally block in loadSchemes: setting loading to false");
        setLoading(false);
      }
    }

    if (!checkingSession) {
      loadSchemes();
    }
  }, [checkingSession, session]);

  async function searchScheme(customQuery?: string, sourceLanguage = language) {
    const finalQuery = customQuery || query;
    const searchCacheKey = `scheme_search_${language}_${sourceLanguage}_${finalQuery.toLowerCase()}`;

    if (!finalQuery.trim()) {
      console.log("[SchemesPage] Search query is empty");
      setError(t("Please Enter a Question about Government Schemes"));
      return;
    }

    console.log(`[SchemesPage] Before fetch: POST ${API_URL}/schemes/search`, {
      query: finalQuery,
      language,
      source_language: sourceLanguage,
    });

    try {
      setLoading(true);
      setError("");
      setResponse("");
      setCached(false);
      setCachedTimestamp(undefined);

      const response = await apiFetch(`${API_URL}/schemes/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: finalQuery,
          language,
          source_language: sourceLanguage,
        }),
      });

      console.log("[SchemesPage] Response status:", response.status);
      const data = await response.json();
      console.log("[SchemesPage] Parsed response:", data);

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to Retrieve Government Scheme Information",
        );
      }

      setResponse(data.answer || t("No Scheme information was Found"));
      if (typeof data.answer === "string") {
        saveCache(searchCacheKey, data.answer);
      }
    } catch (err) {
      console.error("[SchemesPage] Error in searchScheme:", err);

      const cachedSearch = loadCache<string>(searchCacheKey);
      if (cachedSearch) {
        console.log("[SchemesPage] Using cached search result");
        setResponse(cachedSearch.data);
        setError("");
        setCached(true);
        setCachedTimestamp(cachedSearch.timestamp);
        return;
      }

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t("Unable to Connect to the Government Schemes Service"));
      }
    } finally {
      console.log("[SchemesPage] Finally block in searchScheme: setting loading to false");
      setLoading(false);
    }
  }

  async function handleQuickQuestion(question: string) {
    console.log("[SchemesPage] Quick question clicked:", question);
    try {
      setLoading(true);
      setError("");
      setResponse("");
      const [localizedQuestion] = await translateTexts([question], language);
      setQuery(localizedQuestion || question);
      await searchScheme(question, "en");
    } catch (err) {
      console.error("[SchemesPage] Error in handleQuickQuestion:", err);
    } finally {
      console.log("[SchemesPage] Finally block in handleQuickQuestion: setting loading to false");
      setLoading(false);
    }
  }

  if (checkingSession) return null;

  return (
    <DashboardLayout>
      <div className="mt-6">
        <h1 className="text-3xl font-bold text-green-800 dark:text-emerald-400">
          {t("Government Schemes")}
        </h1>
        <h1 className="sr-only">🏛️ Government Schemes</h1>

        <p className="text-gray-600 dark:text-slate-400 mt-2">
          {t(
            "Discover government schemes, subsidies, insurance and financial support available for farmers.",
          )}
        </p>
      </div>

      {cached && cachedTimestamp && (
        <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          <p>📡 Showing Cached Government Schemes</p>
          <p className="text-gray-500 dark:text-slate-400">Last Updated: {new Date(cachedTimestamp).toLocaleString()}</p>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-green-100 dark:bg-green-950/60 flex items-center justify-center text-xl">
            🔍
          </div>

          <div>
            <h2 className="text-xl font-semibold text-green-800 dark:text-emerald-400">
              {t("Find Government Schemes")}
            </h2>

            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              {t("Ask any question about agricultural government schemes.")}
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                searchScheme();
              }
            }}
            placeholder={t(
              "Example: What schemes are available for small farmers?",
            )}
            className="flex-1 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-4 py-3 outline-none focus:border-green-600 dark:focus:border-emerald-500 text-gray-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />

          <button
            onClick={() => searchScheme()}
            disabled={loading}
            className="bg-green-700 dark:bg-green-800 hover:bg-green-800 dark:hover:bg-green-700 disabled:opacity-60 text-white px-7 py-3 rounded-xl font-semibold transition"
          >
            {loading ? t("Searching...") : t("Find Schemes")}
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl">
            ⚠️ {error}
          </div>
        )}
      </div>

      <div className="mt-7">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-green-800 dark:text-emerald-400">
            {t("Quick Searches")}
          </h2>
          <h2 className="sr-only">⚡ Quick Searches</h2>

          <p className="text-gray-500 dark:text-slate-400 mt-1">
            {t(
              "Select a category to quickly discover relevant farmer schemes.",
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {quickQuestions.map((item) => (
            <button
              key={item.title}
              onClick={() => handleQuickQuestion(item.query)}
              disabled={loading}
              className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 text-left shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-green-200 dark:hover:border-green-700 transition disabled:opacity-60"
            >
              <div className="w-12 h-12 bg-green-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-2xl mb-4">
                {item.icon}
              </div>

              <h3 className="font-semibold text-green-800 dark:text-emerald-400">{t(item.title)}</h3>

              <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                {t("Explore available schemes")}
              </p>
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="mt-7 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-10 text-center">
          <div className="text-5xl mb-4">🤖</div>

          <h2 className="text-lg font-semibold text-green-800 dark:text-emerald-400">
            {t("Searching Government Schemes...")}
          </h2>

          <p className="text-gray-500 dark:text-slate-400 mt-2">
            {t("Our AI is searching the agricultural schemes knowledge base.")}
          </p>
        </div>
      )}

      {response && !loading && (
        <div className="mt-7">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-green-800 dark:text-emerald-400">
              🤖 {t("AI Scheme Advisor")}
            </h2>

            <p className="text-gray-500 dark:text-slate-400 mt-1">
              {t("Scheme information retrieved from the agricultural knowledge base.")}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-green-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-green-50 dark:bg-slate-800/80 border-b border-green-100 dark:border-slate-800 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-700 dark:bg-green-800 text-white flex items-center justify-center">
                  🤖
                </div>

                <div>
                  <h3 className="font-semibold text-green-800 dark:text-emerald-400">
                    {t("AgriAdvisor Scheme Assistant")}
                  </h3>

                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {t("AI-powered government scheme guidance")}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-xl p-5">
                <p className="text-gray-700 dark:text-slate-200 leading-8 whitespace-pre-line">
                  {response}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!response && !loading && (
        <div className="mt-7 grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-green-50 dark:bg-slate-900 border border-green-100 dark:border-slate-800 rounded-2xl p-6">
            <div className="text-3xl mb-3">💰</div>

            <h3 className="font-bold text-green-800 dark:text-emerald-400">
              {t("Financial Support")}
            </h3>

            <p className="text-gray-600 dark:text-slate-300 text-sm mt-2 leading-6">
              {t(
                "Explore financial assistance and farmer support schemes available through government programs.",
              )}
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-2xl p-6">
            <div className="text-3xl mb-3">🌾</div>

            <h3 className="font-bold text-green-800 dark:text-emerald-400">{t("Crop Protection")}</h3>

            <p className="text-gray-600 dark:text-slate-300 text-sm mt-2 leading-6">
              {t(
                "Find information about crop insurance and agricultural risk protection programs.",
              )}
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-slate-900 border border-amber-100 dark:border-slate-800 rounded-2xl p-6">
            <div className="text-3xl mb-3">🚜</div>

            <h3 className="font-bold text-green-800 dark:text-emerald-400">
              {t("Farming Assistance")}
            </h3>

            <p className="text-gray-600 dark:text-slate-300 text-sm mt-2 leading-6">
              {t(
                "Ask about irrigation, machinery and other agricultural support programs.",
              )}
            </p>
          </div>
        </div>
      )}

      <div className="mt-7 mb-6 bg-yellow-50 dark:bg-amber-950/30 border border-yellow-200 dark:border-amber-900/50 rounded-2xl p-5">
        <div className="flex gap-3">
          <span className="text-xl">ℹ️</span>

          <div>
            <h3 className="font-semibold text-yellow-800 dark:text-amber-400">
              {t("Important Information")}
            </h3>

            <p className="text-gray-600 dark:text-slate-300 text-sm mt-1 leading-6">
              {t(
                "Scheme eligibility, benefits and application requirements may change. Verify important details through the relevant official government authority before applying.",
              )}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
