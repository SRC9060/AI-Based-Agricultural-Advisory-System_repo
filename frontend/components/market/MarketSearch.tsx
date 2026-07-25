"use client";

import { useState } from "react";
import { useTranslation } from "@/components/LanguageProvider";

interface MarketSearchProps {
  onSearch: (
    commodity: string,
    state: string,
    district: string
  ) => void;

  loading: boolean;

  marketOptions: Record<
    string,
    Record<string, string[]>
  >;
}

export default function MarketSearch({
  onSearch,
  loading,
  marketOptions,
}: MarketSearchProps) {
  const { t } = useTranslation();
  const [commodity, setCommodity] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [formError, setFormError] = useState("");

  // Commodity list
  const commodities = Object.keys(marketOptions);

  // States for selected commodity
  const availableStates = commodity
    ? Object.keys(marketOptions[commodity] || {})
    : [];

  // Districts for selected commodity + state
  const availableDistricts =
    commodity && state
      ? marketOptions[commodity]?.[state] || []
      : [];

  const isFormIncomplete =
    !commodity || !state || !district;

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-xl font-semibold text-green-800 mb-5">
        {t("Search Market Prices")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Commodity */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {t("Commodity")}
          </label>

          <select
            value={commodity}
            onChange={(e) => {
              setCommodity(e.target.value);
              setState("");
              setDistrict("");
            }}
            className="w-full border rounded-xl px-4 py-3"
          >
            <option value="">{t("Select Commodity")}</option>

            {commodities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {/* State */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {t("State")}
          </label>

          <select
            value={state}
            disabled={!commodity}
            onChange={(e) => {
              setState(e.target.value);
              setDistrict("");
            }}
            className="w-full border rounded-xl px-4 py-3"
          >
            <option value="">
              {commodity
                ? t("Select State")
                : t("Select Commodity First")}
            </option>

            {availableStates.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {/* District */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {t("District")}
          </label>

          <select
            value={district}
            disabled={!state}
            onChange={(e) =>
              setDistrict(e.target.value)
            }
            className="w-full border rounded-xl px-4 py-3"
          >
            <option value="">
              {state
                ? t("Select District")
                : t("Select State First")}
            </option>

            {availableDistricts.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

      </div>

      {formError && (
        <p className="text-red-600 mt-3">
          {formError}
        </p>
      )}

      <button
        disabled={loading || isFormIncomplete}
        onClick={() => {
          if (isFormIncomplete) {
            setFormError(
              t("Please fill all fields.")
            );
            return;
          }

          setFormError("");

          onSearch(
            commodity,
            state,
            district
          );
        }}
        className={`mt-6 px-8 py-3 rounded-xl font-semibold ${
          loading || isFormIncomplete
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700 text-white"
        }`}
      >
        {loading ? t("Searching...") : t("Search")}
      </button>
    </div>
  );
}
