import React, { useRef, useState, useEffect, useCallback } from "react";
import { Camera, X, RefreshCcw, CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/components/LanguageProvider";

interface WebcamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export default function WebcamModal({ isOpen, onClose, onCapture }: WebcamModalProps) {
  const { t } = useTranslation();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const startCamera = useCallback(async () => {
    setError("");
    setCapturedImage(null);
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      console.error("Error accessing webcam: ", err);
      setError(t("Could not access camera. Please check permissions."));
    }
  }, [facingMode, t, stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, facingMode]);

  const toggleFacingMode = () => {
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext("2d");
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageUrl = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedImage(imageUrl);
      stopCamera();
    }
    setIsCapturing(false);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file);
        onClose();
      }
    }, "image/jpeg", 0.9);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Camera className="text-emerald-600 dark:text-emerald-400" size={20} />
            {t("Take Photo")}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="relative bg-black flex-1 min-h-[300px] flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center text-red-500 font-medium">
              {error}
            </div>
          ) : capturedImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={capturedImage} alt="Captured preview" className="max-h-[60vh] object-contain w-full" />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full max-h-[60vh] object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
            />
          )}
          
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Footer / Controls */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-center gap-4">
          {error ? (
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition"
            >
              {t("Close")}
            </button>
          ) : capturedImage ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <RefreshCcw size={18} />
                {t("Retake")}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition"
              >
                <CheckCircle2 size={18} />
                {t("Use Photo")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                title={t("Switch Camera")}
              >
                <RefreshCcw size={20} />
              </button>
              <button
                type="button"
                onClick={handleCapture}
                disabled={isCapturing || !stream}
                className="w-16 h-16 bg-white border-4 border-emerald-600 rounded-full shadow-lg hover:scale-105 active:scale-95 transition flex items-center justify-center disabled:opacity-50 disabled:hover:scale-100"
              >
                <div className="w-12 h-12 bg-emerald-600 rounded-full" />
              </button>
              <div className="w-12" /> {/* Spacer to balance flex layout */}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
