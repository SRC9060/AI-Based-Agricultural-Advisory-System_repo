"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from "@/components/LanguageProvider";
import { useRequireSession } from "@/lib/session";
import {
  FarmProfile,
  fetchFarmProfile,
  loadCachedFarmProfile,
  updateFarmProfile,
  calculateDaysSinceSowing,
  getGrowthStageProgress,
  getPersonalizedRecommendations,
  getUpcomingActivities,
} from "@/lib/farmService";
import { getLocalizedMarketLabel } from "@/lib/marketLocalization";
import {
  Sprout,
  Pencil,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Ruler,
  Layers,
  Droplets,
  Tractor,
  MapPin,
  Clock,
  Sparkles,
  CheckSquare,
  Square,
  Tag,
} from "lucide-react";

const IRRIGATION_TYPES = ["Rainfed", "Drip", "Sprinkler", "Canal", "Borewell", "Other"];
const FARMING_TYPES = ["Organic", "Conventional", "Mixed"];
const GROWTH_STAGES = [
  "Seedling Stage",
  "Vegetative Stage",
  "Flowering Stage",
  "Fruiting Stage",
  "Harvesting Stage",
];
const SOIL_TYPES = ["Alluvial", "Black Soil", "Red Soil", "Laterite", "Sandy", "Clay", "Loamy"];
const FARM_SIZE_UNITS = ["Acres", "Hectares"];

export default function MyFarmPage() {
  const { session, checkingSession } = useRequireSession();
  const { language, t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showCachedData, setShowCachedData] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<string | null>(null);

  const [profile, setProfile] = useState<FarmProfile>({
    id: 0,
    name: "",
    email: "",
    phone: "",
    state: "",
    district: "",
    city: "",
    language: "English",
    farmer_type: "",
    crop: "",
    farm_size: "",
    soil_type: "",
    farm_name: "",
    farm_size_unit: "Acres",
    irrigation_type: "",
    farming_type: "",
    crop_variety: "",
    sowing_date: "",
    expected_harvest_date: "",
    crop_area: "",
    growth_stage: "",
  });

  const [formData, setFormData] = useState<FarmProfile>(profile);

  const loadData = useCallback(async () => {
  if (!session) return;

  const userId = Number(session.userId);

  try {
    setLoading(true);
    setErrorMessage("");

    // 1. Load cached farm data FIRST.
    // This makes the page work immediately when offline/backend is unavailable.
    const cached = loadCachedFarmProfile(userId);

    if (cached?.data) {
      console.log(
        "[MyFarm] Loading cached farm profile:",
        cached.timestamp
      );

      setProfile(cached.data);
      setFormData(cached.data);

      // Show cached-data indicator
      setShowCachedData(true);
      setCacheTimestamp(cached.timestamp);

      setErrorMessage("");
      setLoading(false);
    }

    // 2. If browser is offline, don't even try the backend.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      console.log("[MyFarm] Offline - using cached farm profile.");

      if (!cached?.data) {
        setErrorMessage(t("Unable to fetch farm details"));
      }

      setLoading(false);
      return;
    }

    // 3. Try to refresh from backend when online.
    try {
      console.log("[MyFarm] Trying to refresh farm profile from backend...");

      const data = await fetchFarmProfile(userId);

      console.log("[MyFarm] Fresh farm profile received:", data);

      setProfile(data);
      setFormData(data);
      setErrorMessage("");

      // Fresh backend data is available again
      setShowCachedData(false);
      setCacheTimestamp(null);
    } catch (backendError) {
      console.warn(
        "[MyFarm] Backend unavailable. Keeping cached farm profile.",
        backendError
      );

      // If cache exists, KEEP showing it.
      if (cached?.data) {
        setProfile(cached.data);
        setFormData(cached.data);
        setShowCachedData(true);
        setCacheTimestamp(cached.timestamp);
        setErrorMessage("");
      } else {
        setErrorMessage(t("Unable to fetch farm details"));
      }
    }
  } catch (err) {
    console.error("[MyFarm] Error loading farm profile:", err);

    // Final safety fallback
    const cached = loadCachedFarmProfile(userId);

    if (cached?.data) {
      setProfile(cached.data);
      setFormData(cached.data);
      setErrorMessage("");
    } else {
      setErrorMessage(t("Unable to fetch farm details"));
    }
  } finally {
    setLoading(false);
  }
}, [session, t]);

  useEffect(() => {
    if (!checkingSession) {
      loadData();
    }
  }, [checkingSession, loadData]);

  const handleEdit = () => {
    setFormData({ ...profile });
    setIsEditing(true);
    setErrorMessage("");
  };

  const handleCancel = () => {
    setFormData({ ...profile });
    setIsEditing(false);
    setErrorMessage("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    try {
      setSaving(true);
      setErrorMessage("");

      const updated = await updateFarmProfile(Number(session.userId), {
        farm_name: formData.farm_name,
        farm_size: formData.farm_size,
        farm_size_unit: formData.farm_size_unit,
        state: formData.state,
        district: formData.district,
        city: formData.city,
        soil_type: formData.soil_type,
        irrigation_type: formData.irrigation_type,
        farming_type: formData.farming_type,
        farmer_type: formData.farming_type,
        crop: formData.crop,
        crop_variety: formData.crop_variety,
        sowing_date: formData.sowing_date,
        expected_harvest_date: formData.expected_harvest_date,
        crop_area: formData.crop_area,
        growth_stage: formData.growth_stage,
      });

      setProfile(updated);
      setFormData(updated);
      setIsEditing(false);
      setToastMessage(t("Farm details updated successfully."));
      setTimeout(() => setToastMessage(""), 4000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t("Unable to save farm details"));
    } finally {
      setSaving(false);
    }
  };

  if (checkingSession) {
    return null;
  }

  const daysSinceSowing = calculateDaysSinceSowing(profile.sowing_date);
  const growthProgress = getGrowthStageProgress(profile.growth_stage);
  const recommendations = getPersonalizedRecommendations(profile);
  const activities = getUpcomingActivities(profile);

  return (
    <DashboardLayout>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-emerald-700 text-white px-5 py-4 shadow-xl border border-emerald-500 animate-in slide-in-from-bottom-5 duration-300 font-heading">
          <CheckCircle2 size={22} className="text-emerald-200 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 font-heading flex items-center gap-3">
            🌱 {t("My Farm")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-body">
            {t("Manage your farm details and get personalized farming recommendations.")}
          </p>
        </div>

        {!isEditing && !loading && (
          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 dark:bg-green-700 px-5 py-3 text-sm font-semibold text-white shadow-md hover:from-emerald-700 hover:to-green-700 dark:hover:bg-green-600 active:scale-95 transition-all duration-200 font-heading shrink-0"
          >
            <Pencil size={18} />
            <span>{t("Edit Farm Details")}</span>
          </button>
        )}
      </div>

      {showCachedData && (
  <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5">
    <div className="flex items-center gap-2 text-sm text-red-600">
      <span>⚠️</span>
      <span>📡</span>
      <span>
        Offline Mode — Showing cached farm details
        {cacheTimestamp
          ? ` • Last updated: ${new Date(
              cacheTimestamp
            ).toLocaleString()}`
          : ""}
      </span>
    </div>
  </div>
)}

      {errorMessage && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/80 px-5 py-3.5 text-red-700 dark:text-red-300 text-sm font-body">
          <AlertCircle size={20} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Content Grid */}
      {loading ? (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="space-y-6">
            <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left / Primary Column (Farm Details & Crop Details) */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSave}>
              {/* Farm Details Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-50 dark:bg-green-950/60 border border-emerald-100 dark:border-transparent p-2.5 text-emerald-600 dark:text-green-400">
                      <Tractor size={22} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-heading">
                        {t("Farm Details")}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-body">
                        {t("General land and farming parameters")}
                      </p>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                      >
                        <X size={16} />
                        <span>{t("Cancel")}</span>
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 dark:bg-green-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 dark:hover:bg-green-600 disabled:opacity-60 transition"
                      >
                        <Save size={16} />
                        <span>{saving ? t("Saving...") : t("Save Changes")}</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 font-body">
                  {/* Farm Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      {t("Farm Name")}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.farm_name}
                        onChange={(e) => setFormData({ ...formData, farm_name: e.target.value })}
                        placeholder={t("Enter farm name")}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-slate-100"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {profile.farm_name || t("Not specified")}
                      </p>
                    )}
                  </div>

                  {/* Farm Size */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      {t("Farm Size")}
                    </label>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.farm_size}
                          onChange={(e) => setFormData({ ...formData, farm_size: e.target.value })}
                          placeholder="e.g. 5"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-slate-100"
                        />
                        <select
                          value={formData.farm_size_unit}
                          onChange={(e) => setFormData({ ...formData, farm_size_unit: e.target.value })}
                          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 outline-none"
                        >
                          {FARM_SIZE_UNITS.map((unit) => (
                            <option key={unit} value={unit}>
                              {t(unit)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {profile.farm_size
                          ? `${profile.farm_size} ${profile.farm_size_unit ? t(profile.farm_size_unit) : t("Acres")}`
                          : t("Not specified")}
                      </p>
                    )}
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      {t("State")}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="e.g. Karnataka"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-slate-100"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {profile.state ? getLocalizedMarketLabel(profile.state, language) : t("Not specified")}
                      </p>
                    )}
                  </div>

                  {/* District */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      {t("District")}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        placeholder="e.g. Mandya"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-slate-100"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {profile.district ? getLocalizedMarketLabel(profile.district, language) : t("Not specified")}
                      </p>
                    )}
                  </div>

                  {/* Village/City */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      {t("Village/City")}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="e.g. Srirangapatna"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-slate-100"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {profile.city || t("Not specified")}
                      </p>
                    )}
                  </div>

                  {/* Soil Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      {t("Soil Type")}
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.soil_type}
                        onChange={(e) => setFormData({ ...formData, soil_type: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-slate-100"
                      >
                        <option value="">{t("Select Soil Type")}</option>
                        {SOIL_TYPES.map((soil) => (
                          <option key={soil} value={soil}>
                            {t(soil)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {profile.soil_type ? t(profile.soil_type) : t("Not specified")}
                      </p>
                    )}
                  </div>

                  {/* Irrigation Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      {t("Irrigation Type")}
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.irrigation_type}
                        onChange={(e) => setFormData({ ...formData, irrigation_type: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-slate-100"
                      >
                        <option value="">{t("Select Irrigation Type")}</option>
                        {IRRIGATION_TYPES.map((irr) => (
                          <option key={irr} value={irr}>
                            {t(irr)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {profile.irrigation_type ? t(profile.irrigation_type) : t("Not specified")}
                      </p>
                    )}
                  </div>

                  {/* Farming Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      {t("Farming Type")}
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.farming_type}
                        onChange={(e) => setFormData({ ...formData, farming_type: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-slate-100"
                      >
                        <option value="">{t("Select Farming Type")}</option>
                        {FARMING_TYPES.map((farm) => (
                          <option key={farm} value={farm}>
                            {t(farm)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {profile.farming_type || profile.farmer_type
                          ? t(profile.farming_type || profile.farmer_type)
                          : t("Not specified")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Crop Information Card */}
              <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="rounded-xl bg-emerald-50 dark:bg-green-950/60 border border-emerald-100 dark:border-transparent p-2.5 text-emerald-600 dark:text-green-400">
                    <Sprout size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-heading">
                      {t("Current Crop")}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-body">
                      {t("Crop cycle and growth stage details")}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 font-body">
                  {/* Crop Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      {t("Crop Name")}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.crop}
                        onChange={(e) => setFormData({ ...formData, crop: e.target.value })}
                        placeholder="e.g. Sugarcane"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-slate-100"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {profile.crop ? getLocalizedMarketLabel(profile.crop, language) : t("Not specified")}
                      </p>
                    )}
                  </div>

                  {/* Variety */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      {t("Variety")}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.crop_variety}
                        onChange={(e) => setFormData({ ...formData, crop_variety: e.target.value })}
                        placeholder="e.g. Co 0238"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-slate-100"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {profile.crop_variety || t("Not specified")}
                      </p>
                    )}
                  </div>

                  {/* Growth Stage */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      {t("Growth Stage")}
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.growth_stage}
                        onChange={(e) => setFormData({ ...formData, growth_stage: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-slate-100"
                      >
                        <option value="">{t("Select Growth Stage")}</option>
                        {GROWTH_STAGES.map((stg) => (
                          <option key={stg} value={stg}>
                            {t(stg)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {profile.growth_stage ? t(profile.growth_stage) : t("Vegetative Stage")}
                      </p>
                    )}
                  </div>

                  {/* Sowing Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      {t("Sowing Date")}
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={formData.sowing_date}
                        onChange={(e) => setFormData({ ...formData, sowing_date: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-slate-100"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {profile.sowing_date || t("Not specified")}
                      </p>
                    )}
                  </div>

                  {/* Expected Harvest Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      {t("Expected Harvest Date")}
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={formData.expected_harvest_date}
                        onChange={(e) => setFormData({ ...formData, expected_harvest_date: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-slate-100"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {profile.expected_harvest_date || t("Not specified")}
                      </p>
                    )}
                  </div>

                  {/* Crop Area */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      {t("Crop Area")}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.crop_area}
                        onChange={(e) => setFormData({ ...formData, crop_area: e.target.value })}
                        placeholder="e.g. 2 Acres"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-slate-100"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {profile.crop_area || t("Not specified")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </form>

            {/* Personalized Recommendations ("Recommended Actions") */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-transparent p-2.5 text-amber-600 dark:text-amber-400">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-heading">
                    {t("Recommended Actions")}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-body">
                    {t("Tailored advice based on your current crop and growth stage")}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 p-4 transition duration-200 hover:border-emerald-200 dark:hover:border-slate-700"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{rec.icon}</span>
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-green-400 font-heading">
                          {t(rec.category)}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-body">
                        {t(rec.description)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right / Secondary Column (Crop Status Card & Upcoming Farm Activities) */}
          <div className="space-y-6">
            {/* Crop Status Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-transparent p-2.5 text-blue-600 dark:text-blue-400">
                  <Layers size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-heading">
                    {t("Crop Status")}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-body">
                    {t("Real-time crop development summary")}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4 font-body">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    <span>{t("Growth Progress")}</span>
                    <span className="text-emerald-600 dark:text-green-400 font-bold">{growthProgress}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-500 rounded-full"
                      style={{ width: `${growthProgress}%` }}
                    />
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500 dark:text-slate-400">{t("Crop Name")}:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {profile.crop ? getLocalizedMarketLabel(profile.crop, language) : t("Not specified")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-slate-500 dark:text-slate-400">{t("Growth Stage")}:</span>
                    <span className="font-bold text-emerald-700 dark:text-green-400">
                      {profile.growth_stage ? t(profile.growth_stage) : t("Vegetative Stage")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-slate-500 dark:text-slate-400">{t("Days Since Sowing")}:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {daysSinceSowing > 0 ? `${daysSinceSowing} ${t("Days")}` : t("Not specified")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-slate-500 dark:text-slate-400">{t("Crop Area")}:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {profile.crop_area || profile.farm_size || t("Not specified")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Farm Activities Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-transparent p-2.5 text-purple-600 dark:text-purple-400">
                  <Calendar size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-heading">
                    {t("Upcoming Farm Activities")}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-body">
                    {t("Schedule of tasks for your crop")}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3 font-body">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3 transition hover:bg-emerald-50/40 dark:hover:bg-slate-800/80"
                  >
                    <div className="flex items-center gap-3">
                      <Clock size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {t(act.title)}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {t(act.category)}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                      {act.isWeekly
                        ? t("Weekly check")
                        : act.daysOffset
                        ? t("inDays", { count: act.daysOffset })
                        : t(act.dateStr || "Pending")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
