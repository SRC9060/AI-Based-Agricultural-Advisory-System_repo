import { API_URL, apiFetch } from "./api";

export interface PredictionItem {
  disease: string;
  confidence: number;
}

export interface DiseaseDetails {
  symptoms: string;
  causes: string;
  treatment: string;
  prevention: string;
  precautions: string;
}

export interface DiseaseDetectionResult {
  success: boolean;
  crop: string;
  disease: string;
  confidence: number;
  is_demo_mode: boolean;
  mode_label: string;
  top_prediction: PredictionItem;
  alternative_predictions: PredictionItem[];
  details: DiseaseDetails;
  recommended_actions: string[];
}

export async function analyzeCropDisease(
  file: File,
  crop?: string,
  userId?: number
): Promise<DiseaseDetectionResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (crop) {
    formData.append("crop", crop);
  }
  if (userId) {
    formData.append("user_id", String(userId));
  }

  const res = await apiFetch(`${API_URL}/disease-detection`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData.detail || "Unable to analyze this image. Please upload a clear image of the crop leaf."
    );
  }

  return res.json();
}
