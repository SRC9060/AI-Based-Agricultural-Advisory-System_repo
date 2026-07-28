"use client";

import { API_URL } from "@/lib/api";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from "@/components/LanguageProvider";

export default function SchemesPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
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
    async function createSession() {
      const userId = localStorage.getItem("user_id") || "guest";
      try {
        const response = await fetch(
          `${API_URL}/chat/session?user_id=` + userId,
          {
            method: "POST",
          },
        );
        if (!response.ok) {
          throw new Error("Failed to Create Chat Session");
        }
        const data = await response.json();
        setSessionId(data.session_id);
      } catch (err) {
        console.error(err);
      }
    }
    createSession();
  }, []);

  async function searchScheme(customQuery?: string) {
    if (!sessionId) {
      setError(t("Creating Session for Schemes..."));
      return;
    }
    const finalQuery = customQuery || query;
    if (!finalQuery.trim()) {
      setError(t("Please Enter a Question about Government Schemes"));
      return;
    }
    try {
      setLoading(true);
      setError("");
      setResponse("");
      const userId = localStorage.getItem("user_id");
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: String(sessionId),
          user_id: String(userId),
          message: finalQuery,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to Retrieve Government Scheme Information",
        );
      }
      setResponse(data.response_in_user_language || data.english_response || "No Scheme information was Found");
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to Connect to the Government Schemes Service");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleQuickQuestion(question: string) {
    setQuery(question);
    searchScheme(question);
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mt-6">
        <h1 className="text-3xl font-bold text-green-800">
          {t("Government Schemes")}
        </h1>
        <h1 className="sr-only">🏛️ Government Schemes</h1>

        <p className="text-gray-600 mt-2">
          {t(
            "Discover government schemes, subsidies, insurance and financial support available for farmers.",
          )}
        </p>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center text-xl">
            🔍
          </div>

          <div>
            <h2 className="text-xl font-semibold text-green-800">
              {t("Find Government Schemes")}
            </h2>

            <p className="text-sm text-gray-500 mt-1">
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
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-green-600 text-gray-800"
          />

          <button
            onClick={() => searchScheme()}
            disabled={loading || sessionId === null}
            className="bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white px-7 py-3 rounded-xl font-semibold transition"
          >
            {loading ? t("Searching...") : t("Find Schemes")}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Quick Questions */}
      <div className="mt-7">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-green-800">
            {t("Quick Searches")}
          </h2>
          <h2 className="sr-only">⚡ Quick Searches</h2>

          <p className="text-gray-500 mt-1">
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
              className="bg-white border border-gray-100 rounded-2xl p-5 text-left shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-green-200 transition disabled:opacity-60"
            >
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-2xl mb-4">
                {item.icon}
              </div>

              <h3 className="font-semibold text-green-800">{t(item.title)}</h3>

              <p className="text-xs text-gray-500 mt-2">
                {t("Explore available schemes")}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="mt-7 bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <div className="text-5xl mb-4">🤖</div>

          <h2 className="text-lg font-semibold text-green-800">
            Searching Government Schemes...
          </h2>

          <p className="text-gray-500 mt-2">
            Our AI is searching the agricultural schemes knowledge base.
          </p>
        </div>
      )}

      {/* AI Response */}
      {response && !loading && (
        <div className="mt-7">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-green-800">
              🤖 AI Scheme Advisor
            </h2>

            <p className="text-gray-500 mt-1">
              Scheme information retrieved from the agricultural knowledge base.
            </p>
          </div>

          <div className="bg-white border border-green-100 rounded-2xl shadow-sm overflow-hidden">
            {/* Response Header */}
            <div className="bg-green-50 border-b border-green-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-700 text-white flex items-center justify-center">
                  🤖
                </div>

                <div>
                  <h3 className="font-semibold text-green-800">
                    AgriAdvisor Scheme Assistant
                  </h3>

                  <p className="text-xs text-gray-500">
                    AI-powered government scheme guidance
                  </p>
                </div>
              </div>
            </div>

            {/* Response */}
            <div className="p-6">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
                <p className="text-gray-700 leading-8 whitespace-pre-line">
                  {response}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Information Section */}
      {!response && !loading && (
        <div className="mt-7 grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-green-50 border border-green-100 rounded-2xl p-6">
            <div className="text-3xl mb-3">💰</div>

            <h3 className="font-bold text-green-800">
              {t("Financial Support")}
            </h3>

            <p className="text-gray-600 text-sm mt-2 leading-6">
              {t(
                "Explore financial assistance and farmer support schemes available through government programs.",
              )}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
            <div className="text-3xl mb-3">🌾</div>

            <h3 className="font-bold text-green-800">{t("Crop Protection")}</h3>

            <p className="text-gray-600 text-sm mt-2 leading-6">
              {t(
                "Find information about crop insurance and agricultural risk protection programs.",
              )}
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
            <div className="text-3xl mb-3">🚜</div>

            <h3 className="font-bold text-green-800">
              {t("Farming Assistance")}
            </h3>

            <p className="text-gray-600 text-sm mt-2 leading-6">
              {t(
                "Ask about irrigation, machinery and other agricultural support programs.",
              )}
            </p>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-7 mb-6 bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
        <div className="flex gap-3">
          <span className="text-xl">ℹ️</span>

          <div>
            <h3 className="font-semibold text-yellow-800">
              {t("Important Information")}
            </h3>

            <p className="text-gray-600 text-sm mt-1 leading-6">
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
