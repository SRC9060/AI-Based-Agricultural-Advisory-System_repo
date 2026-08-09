"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from "@/components/LanguageProvider";
import { LanguageCode } from "@/lib/languages";
import { useRequireSession } from "@/lib/session";
import { fetchFarmProfile } from "@/lib/farmService";
import { getLocalizedMarketLabel } from "@/lib/marketLocalization";
import {
  analyzeCropDisease,
  DiseaseDetectionResult,
} from "@/lib/diseaseService";
import {
  getLocalizedDiseaseName,
  getLocalizedDiseaseDetails,
  getLocalizedRecommendedActions,
} from "@/lib/diseaseLocalization";
import { getVoiceLanguageCode } from "@/lib/voiceLanguages";
import { getVoicePreferences, getSpeechSpeedRate } from "@/lib/voicePreferences";
import { API_URL, apiFetch } from "@/lib/api";
import {
  Camera,
  Upload,
  Search,
  Trash2,
  RefreshCw,
  Volume2,
  Square,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Info,
  Stethoscope,
  Sprout,
} from "lucide-react";

import WebcamModal from "@/components/ui/WebcamModal";

const COMMON_CROPS = [
  "Tomato",
  "Wheat",
  "Paddy",
  "Cotton",
  "Sugarcane",
  "Potato",
  "Maize",
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export default function DiseaseDetectionPage() {
  const { session, checkingSession } = useRequireSession();
  const { language, t } = useTranslation();

  const [selectedCrop, setSelectedCrop] = useState<string>("");
  const [currentFarmCrop, setCurrentFarmCrop] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string>("");
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<DiseaseDetectionResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string>("");

  // Audio / Voice state
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [webcamModalOpen, setWebcamModalOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Load My Farm profile crop context
  const loadProfile = useCallback(async () => {
    if (!session) return;
    try {
      const data = await fetchFarmProfile(Number(session.userId));
      if (data.crop) {
        setCurrentFarmCrop(data.crop);
        setSelectedCrop(data.crop);
      }
    } catch {
      // Profile pre-population is optional
    }
  }, [session]);

  useEffect(() => {
    if (!checkingSession) {
      loadProfile();
    }
  }, [checkingSession, loadProfile]);

  const stopAudioPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
  }, []);

  // Clean up object URLs and audio on unmount
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      stopAudioPlayback();
    };
  }, [imagePreviewUrl, stopAudioPlayback]);

  const handleFileSelect = (file: File | null) => {
    setValidationError("");
    setAnalysisError("");
    setResult(null);
    stopAudioPlayback();

    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      setValidationError(
        t("Invalid file format. Please select a JPG, JPEG, PNG, or WEBP image.")
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setValidationError(
        t("File size exceeds 10MB limit. Please upload a smaller image.")
      );
      return;
    }

    if (file.size === 0) {
      setValidationError(t("The selected image file is empty."));
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    const newPreviewUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setImagePreviewUrl(newPreviewUrl);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setValidationError("");
    setAnalysisError("");
    setResult(null);
    stopAudioPlayback();
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    try {
      setAnalyzing(true);
      setAnalysisError("");
      setResult(null);
      stopAudioPlayback();

      const res = await analyzeCropDisease(
        selectedFile,
        selectedCrop,
        session ? Number(session.userId) : undefined
      );

      setResult(res);
    } catch (err) {
      setAnalysisError(
        err instanceof Error
          ? err.message
          : t("Unable to analyze this image. Please upload a clear image of the crop leaf.")
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePlayVoice = async () => {
    if (!result) return;
    stopAudioPlayback();

    const voicePrefs = getVoicePreferences();
    const ttsLang = (voicePrefs.voice_output_language || language || "en") as LanguageCode;

    const locDisease = getLocalizedDiseaseName(result.disease, ttsLang);
    const locDetails = getLocalizedDiseaseDetails(
      result.disease,
      ttsLang,
      result.details
    );
    const locCrop = getLocalizedMarketLabel(result.crop, ttsLang);

    const textToRead = `${locCrop}. ${locDisease}. ${t("Symptoms")}: ${locDetails.symptoms}. ${t("Recommended Treatment")}: ${locDetails.treatment}`;

    try {
      setIsPlayingAudio(true);

      const res = await apiFetch(`${API_URL}/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToRead,
          language: ttsLang,
        }),
      });

      if (!res.ok) {
        throw new Error("Edge TTS speech service unavailable");
      }

      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch {
      // Browser SpeechSynthesis Fallback
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = getVoiceLanguageCode(ttsLang);
        utterance.rate = getSpeechSpeedRate(voicePrefs.speech_speed);
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
      } else {
        setIsPlayingAudio(false);
      }
    }
  };

  if (checkingSession) {
    return null;
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Derive localized disease result values dynamically based on current language
  const locDiseaseName = result ? getLocalizedDiseaseName(result.disease, language) : "";
  const locDetails = result ? getLocalizedDiseaseDetails(result.disease, language, result.details) : null;
  const locActions = result ? getLocalizedRecommendedActions(result.disease, language, result.recommended_actions) : [];

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mt-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 font-heading flex items-center gap-3">
          📷 {t("Crop Disease Detection")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-body">
          {t("Upload a crop image to identify possible diseases and get farming recommendations.")}
        </p>
      </div>

      {/* Current Crop Context / Crop Selector Bar */}
      <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm font-body">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 dark:bg-green-950/60 border border-emerald-100 dark:border-transparent p-2 text-emerald-600 dark:text-green-400">
            <Sprout size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {currentFarmCrop
                ? t("Analyzing image for your current crop") + `: ${getLocalizedMarketLabel(currentFarmCrop, language)}`
                : t("Select Crop (Optional)")}
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {selectedCrop ? getLocalizedMarketLabel(selectedCrop, language) : t("General Crop")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="crop-select" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            {t("Crop")}:
          </label>
          <select
            id="crop-select"
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">{t("Select Crop (Optional)")}</option>
            {COMMON_CROPS.map((c) => (
              <option key={c} value={c}>
                {getLocalizedMarketLabel(c, language)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Upload & Preview on Left, Results on Right */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Image Upload & Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Upload Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="rounded-xl bg-emerald-50 dark:bg-green-950/60 border border-emerald-100 dark:border-transparent p-2.5 text-emerald-600 dark:text-green-400">
                <Camera size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-heading">
                  📷 {t("Crop Image")}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-body">
                  {t("Upload a clear image of the affected crop or leaf.")}
                </p>
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`mt-5 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 ${selectedFile
                ? "border-emerald-500/60 bg-emerald-50/30 dark:bg-emerald-950/20"
                : "border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 hover:border-emerald-400 hover:bg-emerald-50/40"
                }`}
            >
              <div className="rounded-2xl bg-emerald-100 dark:bg-slate-700 p-4 text-emerald-700 dark:text-green-400 mb-3 shadow-xs">
                <Upload size={32} />
              </div>

              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-body">
                {t("Drag and drop your crop leaf image here")}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-body">
                {t("Accepted formats: JPG, JPEG, PNG, WEBP (Max 10MB)")}
              </p>

              {/* Action Buttons */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3 font-heading">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 dark:bg-green-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:from-emerald-700 hover:to-green-700 dark:hover:bg-green-600 active:scale-95 transition"
                >
                  <Upload size={16} />
                  <span>{t("Upload Image")}</span>
                </button>

                <input
                  type="file"
                  ref={cameraInputRef}
                  onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => setWebcamModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition"
                >
                  <Camera size={16} className="text-emerald-600 dark:text-green-400" />
                  <span>{t("Take Photo")}</span>
                </button>
              </div>
            </div>

            {validationError && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/80 p-3 text-xs text-red-700 dark:text-red-300 font-body">
                <AlertCircle size={18} className="shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
          </div>

          {/* Image Preview & Details Card */}
          {selectedFile && imagePreviewUrl && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading">
                  {t("Image Preview")}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-green-400 hover:underline"
                  >
                    <RefreshCw size={13} />
                    <span>{t("Change Image")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                  >
                    <Trash2 size={13} />
                    <span>{t("Remove Image")}</span>
                  </button>
                </div>
              </div>

              {/* Image Box */}
              <div className="relative mt-4 h-56 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                <img
                  src={imagePreviewUrl}
                  alt={selectedFile.name || t("Crop Image")}
                  className="h-full w-full object-contain"
                />
              </div>

              {/* File Info */}
              <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 space-y-2 text-xs font-body">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">{t("File Name")}:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
                    {selectedFile.name}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-500 dark:text-slate-400">{t("File Size")}:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatFileSize(selectedFile.size)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-500 dark:text-slate-400">{t("File Type")}:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 uppercase">
                    {selectedFile.type.replace("image/", "")}
                  </span>
                </div>
              </div>

              {/* Analyze Action Button */}
              <button
                type="button"
                disabled={!selectedFile || analyzing}
                onClick={handleAnalyze}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 dark:bg-green-700 px-4 py-3.5 text-sm font-semibold text-white shadow-md hover:from-emerald-700 hover:to-green-700 dark:hover:bg-green-600 disabled:opacity-50 active:scale-98 transition font-heading"
              >
                {analyzing ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>{t("Analyzing your crop image...")}</span>
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    <span>🔍 {t("Analyze Crop")}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: AI Analysis Results (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {analysisError && (
            <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 p-5 text-red-700 dark:text-red-300 font-body flex items-center gap-3">
              <AlertCircle size={22} className="shrink-0" />
              <div>
                <p className="font-semibold text-sm">{analysisError}</p>
              </div>
            </div>
          )}

          {analyzing && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm text-center font-body animate-pulse">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-green-400">
                <Search size={32} className="animate-bounce" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100 font-heading">
                🔍 {t("Analyzing your crop image...")}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t("Comparing leaf symptoms against agricultural knowledge base...")}
              </p>
            </div>
          )}

          {!selectedFile && !result && !analyzing && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 shadow-sm text-center font-body">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                <Stethoscope size={32} />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-slate-200 font-heading">
                {t("Ready to Analyze Crop Disease")}
              </h3>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {t("Select or capture a clear photo of an affected leaf to identify possible diseases, view symptoms, and receive AI treatment recommendations.")}
              </p>
            </div>
          )}

          {/* Result Card */}
          {result && !analyzing && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-50 dark:bg-green-950/60 border border-emerald-100 dark:border-transparent p-2.5 text-emerald-600 dark:text-green-400">
                      <Sprout size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-heading flex items-center gap-2">
                        🌱 {t("Disease Detection Result")}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-body">
                        {t("Crop")}: <span className="font-bold text-slate-800 dark:text-slate-200">{getLocalizedMarketLabel(result.crop, language)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Demo Mode Badge if in demo mode */}
                    {result.is_demo_mode && (
                      <span className="rounded-full bg-amber-100 dark:bg-amber-950/80 px-3 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800 font-heading">
                        {t("DEMO MODE (Standby Model Service)")}
                      </span>
                    )}

                    {/* Audio TTS Buttons */}
                    {isPlayingAudio ? (
                      <button
                        type="button"
                        onClick={stopAudioPlayback}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 text-white px-3.5 py-2 text-xs font-semibold shadow-sm hover:bg-red-700 transition font-heading"
                      >
                        <Square size={14} className="fill-current" />
                        <span>⏹ {t("Stop")}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handlePlayVoice}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white px-3.5 py-2 text-xs font-semibold shadow-sm hover:bg-emerald-700 transition font-heading"
                      >
                        <Volume2 size={14} />
                        <span>🔊 {t("Listen")}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Low Confidence Warning */}
                {result.confidence < 0.5 && (
                  <div className="mt-4 flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-4 text-amber-800 dark:text-amber-200 text-xs font-body">
                    <AlertTriangle size={20} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm font-heading">{t("Low confidence")}</p>
                      <p className="mt-0.5">
                        {t("The image may not be clear enough for reliable identification. Please upload a clearer image showing the affected leaf.")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Primary Diagnosis Box */}
                <div className="mt-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-gradient-to-r from-emerald-50/70 to-green-50/70 dark:from-slate-800/80 dark:to-slate-800/60 p-5 font-body">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-green-400 font-heading">
                      {t("Detected Disease")}
                    </span>
                    <span className="rounded-full bg-emerald-600 dark:bg-green-700 text-white px-3 py-1 text-xs font-bold font-heading shadow-2xs">
                      {t("Confidence")}: {Math.round(result.confidence * 100)}%
                    </span>
                  </div>

                  <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100 font-heading">
                    {locDiseaseName}
                  </h3>

                  <div className="mt-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full"
                        style={{ width: `${Math.round(result.confidence * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Top Prediction & Alternative Predictions */}
                {result.alternative_predictions && result.alternative_predictions.length > 0 && (
                  <div className="mt-5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 font-body space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 font-heading">
                      {t("Alternative Predictions")}
                    </h4>
                    {result.alternative_predictions.map((alt, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {getLocalizedDiseaseName(alt.disease, language)}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">{Math.round(alt.confidence * 100)}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className="h-full bg-slate-400 dark:bg-slate-500 rounded-full"
                            style={{ width: `${Math.round(alt.confidence * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Disease Information Card (RAG Knowledge Base details) */}
              {locDetails && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm font-body">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-heading border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                    <Info size={20} className="text-emerald-600 dark:text-green-400" />
                    {t("Disease Information")}
                  </h3>

                  <div className="mt-4 space-y-4 text-xs sm:text-sm">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 font-heading flex items-center gap-1.5">
                        • {t("Symptoms")}:
                      </h4>
                      <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                        {locDetails.symptoms}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 font-heading flex items-center gap-1.5">
                        • {t("Possible Causes")}:
                      </h4>
                      <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                        {locDetails.causes}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 font-heading flex items-center gap-1.5">
                        • {t("Recommended Treatment")}:
                      </h4>
                      <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                        {locDetails.treatment}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 font-heading flex items-center gap-1.5">
                        • {t("Prevention")}:
                      </h4>
                      <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                        {locDetails.prevention}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 font-heading flex items-center gap-1.5">
                        • {t("Important Precautions")}:
                      </h4>
                      <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                        {locDetails.precautions}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommended Actions */}
              {locActions && locActions.length > 0 && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm font-body">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-heading border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                    <Sparkles size={20} className="text-amber-500" />
                    🌾 {t("Recommended Actions")}
                  </h3>

                  <ul className="mt-4 space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    {locActions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 size={16} className="text-emerald-600 dark:text-green-400 shrink-0 mt-0.5" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <WebcamModal
        isOpen={webcamModalOpen}
        onClose={() => setWebcamModalOpen(false)}
        onCapture={(file) => handleFileSelect(file)}
      />
    </DashboardLayout>
  );
}
