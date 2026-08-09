import { API_URL, apiFetch } from "./api";
import { loadCache, saveCache } from "./offlineCache";

export interface FarmProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  state: string;
  district: string;
  city: string;
  language: string;
  farmer_type: string;
  crop: string;
  farm_size: string;
  soil_type: string;
  farm_name: string;
  farm_size_unit: string;
  irrigation_type: string;
  farming_type: string;
  crop_variety: string;
  sowing_date: string;
  expected_harvest_date: string;
  crop_area: string;
  growth_stage: string;
}

export async function fetchFarmProfile(userId: number): Promise<FarmProfile> {
  const res = await apiFetch(`${API_URL}/farm/${userId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Unable to fetch farm details");
  }

  const data: FarmProfile = await res.json();

  // Save latest successful response
  saveCache(`farm_${userId}`, data);

  return data;
}

export function loadCachedFarmProfile(
  userId: number
): { data: FarmProfile; timestamp: string } | null {
  const cached = loadCache<FarmProfile>(`farm_${userId}`);

  if (!cached || !cached.data) {
    return null;
  }

  return cached;
}

export async function updateFarmProfile(
  userId: number,
  data: Partial<FarmProfile>
): Promise<FarmProfile> {
  const res = await apiFetch(`${API_URL}/farm/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Unable to update farm details");
  }
  return fetchFarmProfile(userId);
}

export function calculateDaysSinceSowing(sowingDateStr: string): number {
  if (!sowingDateStr) return 0;
  const sowingDate = new Date(sowingDateStr);
  if (isNaN(sowingDate.getTime())) return 0;
  const today = new Date();
  const diffTime = today.getTime() - sowingDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

export function getGrowthStageProgress(growthStage: string): number {
  switch (growthStage) {
    case "Seedling Stage":
      return 20;
    case "Vegetative Stage":
      return 45;
    case "Flowering Stage":
      return 65;
    case "Fruiting Stage":
      return 85;
    case "Harvesting Stage":
      return 100;
    default:
      return 30;
  }
}

export interface RecommendationItem {
  id: string;
  category: "Irrigation" | "Crop Care" | "Fertilizer";
  title: string;
  description: string;
  icon: string;
}

export function getPersonalizedRecommendations(
  profile: Partial<FarmProfile>
): RecommendationItem[] {
  const crop = profile.crop || "crop";
  const stage = profile.growth_stage || "Vegetative Stage";
  const irrigation = profile.irrigation_type || "Rainfed";

  let irrigationDesc = "Check soil moisture before the next irrigation.";
  if (irrigation === "Drip") {
    irrigationDesc = "Check drip emitters and soil moisture levels for optimal water delivery.";
  } else if (irrigation === "Sprinkler") {
    irrigationDesc = "Inspect sprinkler nozzles and schedule watering during early morning hours.";
  } else if (irrigation === "Rainfed") {
    irrigationDesc = "Monitor weather forecasts and preserve soil moisture through mulching.";
  }

  let careDesc = "Monitor the crop regularly for pest and disease symptoms.";
  if (stage === "Seedling Stage") {
    careDesc = "Protect young seedling shoots from cutworms and maintain adequate weed control.";
  } else if (stage === "Flowering Stage") {
    careDesc = "Watch closely for sucking pests and flower drop symptoms.";
  } else if (stage === "Fruiting Stage") {
    careDesc = "Inspect developing fruits for borer attacks and fungal spots.";
  }

  let fertilizerDesc = "Follow the recommended fertilizer schedule for your crop.";
  if (stage === "Vegetative Stage") {
    fertilizerDesc = "Apply nitrogen-rich fertilizer to support vigorous leaf and stem development.";
  } else if (stage === "Flowering Stage") {
    fertilizerDesc = "Boost phosphorus and potassium levels to promote strong root and flower development.";
  } else if (stage === "Fruiting Stage") {
    fertilizerDesc = "Ensure potassium sufficiency to aid grain filling and fruit weight.";
  }

  return [
    {
      id: "irrigation-1",
      category: "Irrigation",
      title: "Irrigation",
      description: irrigationDesc,
      icon: "🌦️",
    },
    {
      id: "care-1",
      category: "Crop Care",
      title: "Crop Care",
      description: careDesc,
      icon: "🌱",
    },
    {
      id: "fertilizer-1",
      category: "Fertilizer",
      title: "Fertilizer",
      description: fertilizerDesc,
      icon: "🌾",
    },
  ];
}

export interface FarmActivity {
  id: string;
  title: string;
  dateStr?: string;
  daysOffset?: number;
  isWeekly?: boolean;
  status: "pending" | "completed";
  category: string;
}

export function getUpcomingActivities(profile: Partial<FarmProfile>): FarmActivity[] {
  return [
    {
      id: "act-1",
      title: "Irrigation",
      dateStr: "In 2 days",
      daysOffset: 2,
      status: "pending",
      category: "Irrigation",
    },
    {
      id: "act-2",
      title: "Fertilizer application",
      dateStr: "In 5 days",
      daysOffset: 5,
      status: "pending",
      category: "Fertilizer",
    },
    {
      id: "act-3",
      title: "Pest monitoring",
      dateStr: "Weekly check",
      isWeekly: true,
      status: "pending",
      category: "Crop Care",
    },
    {
      id: "act-4",
      title: "Crop inspection",
      dateStr: "In 7 days",
      daysOffset: 7,
      status: "pending",
      category: "Inspection",
    },
  ];
}