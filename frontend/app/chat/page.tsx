"use client";

import { API_URL, apiFetch } from "@/lib/api";
import {
  detectVoiceLanguage,
  getVoiceLanguageCode,
} from "@/lib/voiceLanguages";
import { getVoicePreferences, getSpeechSpeedRate } from "@/lib/voicePreferences";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Mic,
  Square,
  ArrowLeft,
  Plus,
  Trash2,
  History,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
} from "lucide-react";
import "@/app/globals.css";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from "@/components/LanguageProvider";
import { useRequireSession } from "@/lib/session";
import "./chat.css";

interface ToolCallRecord {
  tool: string;
  arguments?: Record<string, unknown>;
  success: boolean;
  result_summary?: string;
}

interface WorkflowItem {
  name: string;
  description: string;
  allowed_tools?: string[];
  max_rounds?: number;
  enabled?: boolean;
}

interface Message {
  type: "user" | "ai";
  text: string;
  id?: number;
  feedback?: boolean;
  confidenceScore?: number;
  confidenceLevel?: string;
  needsHumanReview?: boolean;
  workflow?: string;
  toolCalls?: ToolCallRecord[];
  toolCallsCount?: number;
  jobId?: string;
}

interface ChatSessionItem {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

function formatWorkflowTitle(name: string): string {
  if (!name) return "";
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `agri_${crypto.randomUUID()}`;
  }
  return `agri_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function ChatContent() {
  const router = useRouter();
  const { language, t } = useTranslation();
  const { session, checkingSession } = useRequireSession();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      type: "ai",
      text: "Hello! 👋 I am your AI Agricultural Advisor. Ask me anything about crops, farming, weather, diseases, market information or government schemes.",
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState("");
  // Start conservatively until the browser connection state has been checked.
  // This prevents a cached offline page from briefly trying to create a new
  // server session and showing "Creating Chat Session...".
  const [isOnline, setIsOnline] = useState(false);
  const [connectionChecked, setConnectionChecked] = useState(false);
  const searchParams = useSearchParams();
  const hasAutoAsked = useRef(false);
  const cacheReady = useRef(false);
  const [sessionId, setSessionId] = useState<number | null>(null);

  const [sessionsList, setSessionsList] = useState<ChatSessionItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // AI Agent & Workflow states
  const [chatMode, setChatMode] = useState<"standard" | "agent">("standard");
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>("general_advisory");
  const [loadingWorkflows, setLoadingWorkflows] = useState<boolean>(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoadingWorkflows(true);
      setWorkflowError(null);
      const res = await apiFetch(`${API_URL}/agent/workflows`);
      if (res.status === 401) {
        setWorkflowError("Session expired. Please log in again.");
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Failed to fetch workflows (HTTP ${res.status})`);
      }
      const data = await res.json();
      const list: WorkflowItem[] = Array.isArray(data.workflows) ? data.workflows : [];
      setWorkflows(list);
      if (list.length > 0) {
        setSelectedWorkflow((prev) => {
          if (list.some((w) => w.name === prev)) return prev;
          const hasGeneral = list.some((w) => w.name === "general_advisory");
          return hasGeneral ? "general_advisory" : list[0].name;
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load agent workflows";
      setWorkflowError(msg);
    } finally {
      setLoadingWorkflows(false);
    }
  }, []);

  useEffect(() => {
    if (chatMode === "agent" && workflows.length === 0 && !loadingWorkflows && !workflowError) {
      void fetchWorkflows();
    }
  }, [chatMode, workflows.length, loadingWorkflows, workflowError, fetchWorkflows]);

  const loadSessions = useCallback(async (userId: string | number) => {
    try {
      setLoadingSessions(true);
      const res = await apiFetch(`${API_URL}/chat/sessions/${userId}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setSessionsList(list);
        return list;
      }
    } catch (err) {
      console.error("Failed to fetch chat sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
    return [];
  }, []);

  const selectSession = useCallback(
    async (id: number) => {
      try {
        setSessionId(id);
        const res = await apiFetch(`${API_URL}/chat/session/${id}/messages`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.messages) && data.messages.length > 0) {
            setMessages(data.messages);
          } else {
            setMessages([{ type: "ai", text: t("Chat greeting") }]);
          }
        }
      } catch (err) {
        console.error("Failed to load session messages:", err);
      }
    },
    [t],
  );

  const createNewSession = useCallback(async () => {
    console.log("New Chat clicked");
    if (!session) {
      console.warn("[createNewSession] No active user session found");
      return;
    }

    try {
      setStatus("Starting new chat...");
      console.log(`[createNewSession] Sending request: POST ${API_URL}/chat/session?user_id=${session.userId}`);
      const response = await apiFetch(
        `${API_URL}/chat/session?user_id=` + session.userId,
        { method: "POST" },
      );

      console.log("[createNewSession] Response status:", response.status);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to create new chat session");
      }

      const data = await response.json();
      console.log("[createNewSession] Parsed response data:", data);

      if (!data.session_id) {
        throw new Error("Invalid session ID returned from server");
      }

      setSessionId(data.session_id);
      setMessages([{ type: "ai", text: t("Chat greeting") }]);
      setQuestion("");
      setStatus("");
      localStorage.removeItem("agriadvisor_last_conversation");

      const updatedSessions = await loadSessions(session.userId);
      console.log("[createNewSession] Updated sessions list:", updatedSessions);
    } catch (err) {
      console.error("[createNewSession] Error creating new chat session:", err);
      const msg = err instanceof Error ? err.message : "Failed to create new chat session";
      setStatus(`❌ ${msg}`);
    }
  }, [session, t, loadSessions]);

  const deleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session) return;
    try {
      const res = await apiFetch(`${API_URL}/chat/session/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSessionsList((prev) => prev.filter((s) => s.id !== id));
        if (sessionId === id) {
          void createNewSession();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const syncConnection = () => {
      setIsOnline(navigator.onLine);
      setConnectionChecked(true);
    };
    syncConnection();
    window.addEventListener("online", syncConnection);
    window.addEventListener("offline", syncConnection);
    return () => {
      window.removeEventListener("online", syncConnection);
      window.removeEventListener("offline", syncConnection);
    };
  }, []);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("agriadvisor_last_conversation");
      if (cached) {
        const parsed = JSON.parse(cached) as Message[];
        if (Array.isArray(parsed) && parsed.length > 1) setMessages(parsed);
      }
    } catch {
      localStorage.removeItem("agriadvisor_last_conversation");
    } finally {
      cacheReady.current = true;
    }
  }, []);

  useEffect(() => {
    if (cacheReady.current) {
      localStorage.setItem(
        "agriadvisor_last_conversation",
        JSON.stringify(messages.slice(-30)),
      );
    }
  }, [messages]);

useEffect(() => {
  const timer = window.setTimeout(() => {
    setMessages((previous) =>
      previous.length === 1 && previous[0].type === "ai"
        ? [{ type: "ai", text: t("Chat greeting") }]
        : previous
    );
  }, 0);

  return () => {
    window.clearTimeout(timer);
  };
}, [t]);

  useEffect(() => {
    async function initSessions() {
      if (!connectionChecked || !session || checkingSession) return;
      if (!isOnline) {
        setStatus("Offline — reconnect to ask new questions.");
        return;
      }
      const existing = await loadSessions(session.userId);
      if (existing && existing.length > 0) {
        void selectSession(existing[0].id);
      } else {
        void createNewSession();
      }
    }

    initSessions();
  }, [
    checkingSession,
    session,
    connectionChecked,
    isOnline,
    loadSessions,
    selectSession,
    createNewSession,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // Ask AI Query
  const askAI = useCallback(
    async (customQuestion?: string) => {
      if (!isOnline) {
        setStatus("Offline — reconnect to ask new questions.");
        return;
      }
      if (!session) {
        return;
      }
      if (!sessionId) {
        setStatus("Creating Chat Session...");
        return;
      }
      if (chatMode === "agent") {
        if (loadingWorkflows) {
          setStatus("Loading agent workflows, please wait...");
          return;
        }
        if (workflowError || workflows.length === 0) {
          setStatus("Agent workflows could not be loaded. Please click Retry.");
          return;
        }
      }
      const currentQuestion = customQuestion ?? question;
      if (!currentQuestion.trim()) {
        return;
      }
      setMessages((previous) => [
        ...previous,
        {
          type: "user",
          text: currentQuestion,
        },
      ]);
      if (!customQuestion) {
        setQuestion("");
      }
      window.history.replaceState({}, "", "/chat");

      try {
        setLoading(true);

        if (chatMode === "agent") {
          setStatus(`🤖 Queuing AI Agent (${formatWorkflowTitle(selectedWorkflow)})...`);
          const idempotencyKey = generateIdempotencyKey();

          const jobResponse = await apiFetch(`${API_URL}/agent/jobs`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": idempotencyKey,
            },
            body: JSON.stringify({
              message: currentQuestion,
              session_id: sessionId !== null ? String(sessionId) : null,
              language,
              workflow: selectedWorkflow,
            }),
          });

          if (jobResponse.status === 401) {
            setStatus("❌ Session expired. Please log in again.");
            setMessages((previous) => [
              ...previous,
              {
                type: "ai",
                text: "Your session has expired. Please refresh or log in again to continue.",
              },
            ]);
            return;
          }

          if (!jobResponse.ok) {
            const errorData = await jobResponse.json().catch(() => ({}));
            const errDetail = errorData.detail || `Agent job submission failed (HTTP ${jobResponse.status})`;
            throw new Error(errDetail);
          }

          const jobData = await jobResponse.json();
          const jobId: string = jobData.job_id;
          setActiveJobId(jobId);

          // If deduplicated request returned 200 with completed result
          if (jobData.status === "COMPLETED" && jobData.result) {
            const resPayload = jobData.result;
            const answer = resPayload.answer || "Agent completed the task successfully.";
            const toolCalls = Array.isArray(resPayload.tool_calls) ? resPayload.tool_calls : [];
            const toolCallsCount =
              typeof resPayload.tool_calls_count === "number"
                ? resPayload.tool_calls_count
                : toolCalls.length;

            setMessages((previous) => [
              ...previous,
              {
                type: "ai",
                text: answer,
                workflow: selectedWorkflow,
                toolCalls,
                toolCallsCount,
                jobId,
              },
            ]);
            setStatus("");
            if (session) void loadSessions(session.userId);
            const voicePrefs = getVoicePreferences();
            if (voicePrefs.auto_read_responses) {
              void speakAnswer(answer);
            }
            return;
          }

          // Poll GET /agent/jobs/{job_id}
          let pollAttempts = 0;
          const maxAttempts = 30; // 30 * 1.5s = ~45s
          let isDone = false;

          while (pollAttempts < maxAttempts && !isDone) {
            await new Promise((r) => setTimeout(r, 1500));
            pollAttempts++;

            const pollRes = await apiFetch(`${API_URL}/agent/jobs/${jobId}`);
            if (pollRes.status === 401) {
              setStatus("❌ Session expired while checking agent job.");
              setMessages((previous) => [
                ...previous,
                {
                  type: "ai",
                  text: "Your session expired while waiting for the AI agent job to complete. Please log in again.",
                  workflow: selectedWorkflow,
                  jobId,
                },
              ]);
              isDone = true;
              break;
            }

            if (!pollRes.ok) {
              setStatus("⚠️ Could not verify agent job status.");
              setMessages((previous) => [
                ...previous,
                {
                  type: "ai",
                  text: `Unable to verify the status of your agent request (Job ID: ${jobId}) due to a network or server communication error. The background job may still complete.`,
                  workflow: selectedWorkflow,
                  jobId,
                },
              ]);
              isDone = true;
              break;
            }

            const currentJob = await pollRes.json();
            if (currentJob.status === "COMPLETED") {
              isDone = true;
              const resPayload = currentJob.result || {};
              const answer = resPayload.answer || "Agent completed the task successfully.";
              const toolCalls = Array.isArray(resPayload.tool_calls) ? resPayload.tool_calls : [];
              const toolCallsCount =
                typeof resPayload.tool_calls_count === "number"
                  ? resPayload.tool_calls_count
                  : toolCalls.length;

              setMessages((previous) => [
                ...previous,
                {
                  type: "ai",
                  text: answer,
                  workflow: selectedWorkflow,
                  toolCalls,
                  toolCallsCount,
                  jobId,
                },
              ]);
              setStatus("");
              if (session) void loadSessions(session.userId);
              const voicePrefs = getVoicePreferences();
              if (voicePrefs.auto_read_responses) {
                void speakAnswer(answer);
              }
              break;
            } else if (currentJob.status === "FAILED") {
              isDone = true;
              const errorMsg =
                currentJob.error_summary && currentJob.error_summary.trim()
                  ? currentJob.error_summary.trim()
                  : "An unexpected error occurred during agent execution.";
              setStatus("❌ Agent job failed.");
              setMessages((previous) => [
                ...previous,
                {
                  type: "ai",
                  text: `Agent job could not be completed: ${errorMsg}`,
                  workflow: selectedWorkflow,
                  jobId,
                },
              ]);
              break;
            } else {
              const stateLabel =
                currentJob.status === "RETRY_WAIT"
                  ? "retrying"
                  : (currentJob.status || "processing").toLowerCase();
              setStatus(
                `⚙️ AI Agent is working (${stateLabel}... ${Math.round(pollAttempts * 1.5)}s)`,
              );
            }
          }

          if (!isDone) {
            setStatus("⏳ Agent job is still running in background.");
            setMessages((previous) => [
              ...previous,
              {
                type: "ai",
                text: `Your request is still being processed by the background agent worker (Job ID: ${jobId}). You can check back shortly or review your session history.`,
                workflow: selectedWorkflow,
                jobId,
              },
            ]);
          }
        } else {
          // Standard Chat flow
          setStatus("🧠 AI is analysing your question...");
          console.log("Sending Language:", language);
          const response = await apiFetch(`${API_URL}/chat`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              session_id: String(sessionId),
              user_id: session.userId,
              message: currentQuestion,
              language,
            }),
          });
          if (!response.ok) {
            const error = await response.json();
            console.error("Backend Error:", error);
            throw new Error("Backend error");
          }
          const data = await response.json();

          window.dispatchEvent(new Event("activityUpdated"));

          const answer =
            data.response_in_user_language ||
            data.english_response ||
            "Sorry, I could not generate a recommendation.";

          setMessages((previous) => [
            ...previous,
            {
              type: "ai",
              text: answer,
              id: data.assistant_message_id,
              confidenceScore: data.confidence_score,
              confidenceLevel: data.response_quality?.confidence_level,
              needsHumanReview: data.response_quality?.needs_human_review,
            },
          ]);

          setStatus("");
          if (session) void loadSessions(session.userId);
          const voicePrefs = getVoicePreferences();
          if (voicePrefs.auto_read_responses) {
            void speakAnswer(answer, undefined, data.assistant_message_id);
          }
        }
      } catch (error) {
        console.error(error);
        const errMsg =
          chatMode === "agent"
            ? "Unable to complete AI agent request. Please try again."
            : "Unable to connect to the agricultural AI server. Please try again.";
        setStatus("❌ Unable to connect to AI server.");
        setMessages((previous) => [
          ...previous,
          {
            type: "ai",
            text: errMsg,
          },
        ]);
      } finally {
        setLoading(false);
        setActiveJobId(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      isOnline,
      language,
      question,
      session,
      sessionId,
      loadSessions,
      chatMode,
      selectedWorkflow,
      workflows.length,
      loadingWorkflows,
      workflowError,
    ],
  );

  useEffect(() => {
    const query = searchParams.get("q");
    if (!query) return;
    // A dashboard question can arrive before the new chat session is created.
    // Wait until it exists so the question is sent and saved reliably.
    if (!sessionId) return;
    if (hasAutoAsked.current) return;
    hasAutoAsked.current = true;
    setQuestion(query);
    askAI(query);
    window.history.replaceState({}, "", "/chat");
  }, [searchParams, askAI, sessionId]);

  // Enter Key
  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    if (!isOnline) {
      setStatus("Offline — reconnect to ask new questions.");
      return;
    }
    if (!sessionId) {
      setStatus("Creating Chat Session...");
      return;
    }
    if (!loading && activeJobId === null) {
      if (
        chatMode === "agent" &&
        (loadingWorkflows || workflowError || workflows.length === 0)
      ) {
        return;
      }
      askAI();
    }
  }

  async function rateResponse(index: number, helpful: boolean) {
    const message = messages[index];
    if (!message.id || !session) return;
    try {
      const response = await apiFetch(`${API_URL}/chat/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: Number(session.userId),
          message_id: message.id,
          helpful,
        }),
      });
      if (!response.ok) throw new Error("Unable to save response feedback");
      setMessages((previous) =>
        previous.map((item, itemIndex) =>
          itemIndex === index ? { ...item, feedback: helpful } : item,
        ),
      );
    } catch (error) {
      console.error(error);
      setStatus("Unable to save feedback while offline.");
    }
  }

// Voice Input & Output Management
const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const speechRecognitionRef = useRef<any>(null);
const mediaStreamRef = useRef<MediaStream | null>(null);
const autoStopTimerRef = useRef<NodeJS.Timeout | null>(null);
const isManualStopRef = useRef<boolean>(false);
const isRecordingRef = useRef<boolean>(false);
const audioChunksRef = useRef<Blob[]>([]);
const activeAudioRef = useRef<HTMLAudioElement | null>(null);
const activeAudioUrlRef = useRef<string | null>(null);
const activeTtsIdRef = useRef<number>(0);
const activeTtsMessageIdRef = useRef<string | number | null>(null);
const [playingMessageIndex, setPlayingMessageIndex] = useState<number | null>(null);

const stopSpeechPlayback = useCallback(() => {
  activeTtsIdRef.current += 1;
  activeTtsMessageIdRef.current = null;

  if (activeAudioRef.current) {
    try {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current.src = "";
    } catch {
      // ignore
    }
    activeAudioRef.current = null;
  }
  if (activeAudioUrlRef.current) {
    try {
      URL.revokeObjectURL(activeAudioUrlRef.current);
    } catch {
      // ignore
    }
    activeAudioUrlRef.current = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
  setIsSpeaking(false);
  setPlayingMessageIndex(null);
  setStatus("");
}, []);

const cleanupMicrophone = useCallback(() => {
  if (autoStopTimerRef.current) {
    clearTimeout(autoStopTimerRef.current);
    autoStopTimerRef.current = null;
  }
  if (mediaStreamRef.current) {
    mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }
}, []);

const stopRecording = useCallback(() => {
  isManualStopRef.current = true;
  isRecordingRef.current = false;

  if (speechRecognitionRef.current) {
    const rec = speechRecognitionRef.current;
    speechRecognitionRef.current = null;
    rec.onstart = null;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    try {
      rec.stop();
    } catch {
      try {
        rec.abort();
      } catch {
        // ignore
      }
    }
  }

  if (mediaRecorderRef.current) {
    const mr = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (mr.state !== "inactive") {
      try {
        mr.stop();
      } catch {
        // ignore
      }
    }
  }

  cleanupMicrophone();
  setIsRecording(false);
  setStatus("");
}, [cleanupMicrophone]);

useEffect(() => {
  return () => {
    stopRecording();
    stopSpeechPlayback();
  };
}, [stopRecording, stopSpeechPlayback]);

async function recordAudio(forceBackendRecorder = false) {
  if (isRecordingRef.current) {
    stopRecording();
    return;
  }

  isManualStopRef.current = false;

  type BrowserSpeechRecognitionResultEvent = {
    results: { [index: number]: { [index: number]: { transcript: string } } };
  };
  type BrowserSpeechRecognitionErrorEvent = {
    error: string;
  };
  type BrowserSpeechRecognition = {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: (() => void) | null;
    onresult: ((event: BrowserSpeechRecognitionResultEvent) => void) | null;
    onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
    abort: () => void;
  };

  const speechRecognitionWindow = window as typeof window & {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  };
  const SpeechRecognitionConstructor =
    speechRecognitionWindow.SpeechRecognition ||
    speechRecognitionWindow.webkitSpeechRecognition;

  // Chrome and Edge support the same eight BCP-47 language codes used by the
  // backend. Prefer this path because it does not depend on Sarvam credits or
  // a local FFmpeg installation. Sarvam/Whisper remains the browser fallback.
  if (SpeechRecognitionConstructor && !forceBackendRecorder) {
    const recognition = new SpeechRecognitionConstructor();
    speechRecognitionRef.current = recognition;
    const voicePrefs = getVoicePreferences();
    const recognitionLanguage =
      getVoiceLanguageCode(voicePrefs.voice_input_language || language);

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = recognitionLanguage;
    recognition.onstart = () => {
      isRecordingRef.current = true;
      setIsRecording(true);
      setStatus(`🔴 Listening in ${recognitionLanguage}...`);
    };
    recognition.onresult = (
      event: BrowserSpeechRecognitionResultEvent,
    ) => {
      if (isManualStopRef.current) return;
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setQuestion(transcript);
        setStatus(
          `✅ Voice recognized in ${recognitionLanguage}. Click Send to ask your question.`,
        );
      } else {
        setStatus("No speech detected. Tap 'Ask by voice' to try again.");
      }
    };
    recognition.onerror = (
      event: BrowserSpeechRecognitionErrorEvent,
    ) => {
      console.error("Browser speech recognition error:", event.error);
      if (isManualStopRef.current || event.error === "aborted") {
        setIsRecording(false);
        isRecordingRef.current = false;
        cleanupMicrophone();
        return;
      }
      if (event.error === "no-speech") {
        setStatus("No speech detected. Tap 'Ask by voice' to try again.");
        setIsRecording(false);
        isRecordingRef.current = false;
        cleanupMicrophone();
        return;
      }
      if (event.error === "not-allowed") {
        setStatus(
          "Microphone permission denied. Allow microphone access in Chrome.",
        );
        setIsRecording(false);
        isRecordingRef.current = false;
        cleanupMicrophone();
        return;
      }
      setStatus(
        "Chrome voice recognition was unavailable. Switching to multilingual recording—please speak again.",
      );
      cleanupMicrophone();
      window.setTimeout(() => {
        if (!isManualStopRef.current) {
          void recordAudio(true);
        }
      }, 250);
    };
    recognition.onend = () => {
      speechRecognitionRef.current = null;
      setIsRecording(false);
      isRecordingRef.current = false;
      cleanupMicrophone();
    };
    try {
      recognition.start();
    } catch (error) {
      console.error("Unable to start browser speech recognition:", error);
      if (!isManualStopRef.current) {
        setStatus(
          "Switching to multilingual recording—please speak after the microphone activates.",
        );
        window.setTimeout(() => {
          if (!isManualStopRef.current) {
            void recordAudio(true);
          }
        }, 250);
      }
    }
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    mediaStreamRef.current = stream;

    if (isManualStopRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      return;
    }

    const preferredMimeType = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ].find((mimeType) =>
      MediaRecorder.isTypeSupported(mimeType),
    );
    const mediaRecorder = new MediaRecorder(
      stream,
      preferredMimeType
        ? { mimeType: preferredMimeType }
        : undefined,
    );

    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstart = () => {
      isRecordingRef.current = true;
      setIsRecording(true);
      setStatus("🔴 Listening...");
    };

    mediaRecorder.onstop = async () => {
      setIsRecording(false);
      isRecordingRef.current = false;
      const wasManualStop = isManualStopRef.current;

      cleanupMicrophone();

      const audioBlob = new Blob(audioChunksRef.current, {
        type: mediaRecorder.mimeType || "audio/webm",
      });
      if (audioBlob.size < 800) {
        if (!wasManualStop) {
          setStatus(
            "No usable audio was captured. Check the selected microphone and try again.",
          );
        } else {
          setStatus("");
        }
        return;
      }

      setStatus("🎤 Converting speech...");

      const mimeType = mediaRecorder.mimeType || "audio/webm";
      const extension = mimeType.includes("webm")
        ? "webm"
        : mimeType.includes("mp4")
          ? "m4a"
          : mimeType.includes("ogg")
            ? "ogg"
            : "wav";

      const audioFile = new File(
        [audioBlob],
        `recording.${extension}`,
        {
          type: mimeType,
        },
      );

      const formData = new FormData();

      formData.append("file", audioFile);
      formData.append("language", language);

      try {
        const response = await apiFetch(
          `${API_URL}/speech-to-text`,
          {
            method: "POST",
            body: formData,
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.detail || "Speech recognition failed",
          );
        }

        const transcript = String(result.transcript || "").trim();
        if (!transcript) {
          throw new Error("No speech detected. Please try again.");
        }

        setQuestion(transcript);

        setStatus(
          result.engine === "whisper"
            ? "✅ Whisper recognized your voice. Click Send to ask your question."
            : "✅ Sarvam recognized your voice. Click Send to ask your question.",
        );
      } catch (error) {
        console.error(error);
        if (!wasManualStop) {
          const message =
            error instanceof Error
              ? error.message
              : "Voice recognition failed.";
          setStatus(`❌ ${message}`);
        } else {
          setStatus("");
        }
      }
    };

    mediaRecorder.start();

    if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
    autoStopTimerRef.current = setTimeout(() => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
    }, 7000);
  } catch (error) {
    console.error(error);
    setIsRecording(false);
    isRecordingRef.current = false;
    cleanupMicrophone();
    setStatus("❌ Microphone permission denied.");
  }
}

  // Speak AI Response
async function speakAnswer(text: string, messageIndex?: number, messageId?: string | number) {
  if (!text.trim()) {
    return;
  }

  // Prevent duplicate trigger if this exact message is already playing
  if (messageId !== undefined && activeTtsMessageIdRef.current === messageId && isSpeaking) {
    return;
  }

  // Stop any existing TTS audio and increment token to invalidate pending async fetches
  stopSpeechPlayback();

  const currentTtsId = activeTtsIdRef.current;
  if (messageId !== undefined) {
    activeTtsMessageIdRef.current = messageId;
  }
  if (messageIndex !== undefined) {
    setPlayingMessageIndex(messageIndex);
  }

  const cleanText = text
    .replace(/\*\*/g, "")
    .replace(/#/g, "")
    .replace(/\n/g, " ");

  const voicePrefs = getVoicePreferences();
  const voiceLanguage =
    voicePrefs.voice_output_language ||
    detectVoiceLanguage(
      cleanText,
      language,
    );

  async function playBrowserTTS() {
    if (activeTtsIdRef.current !== currentTtsId) {
      return;
    }

    if (!("speechSynthesis" in window)) {
      if (activeTtsIdRef.current === currentTtsId) {
        setStatus("❌ Browser voice output is not supported.");
        setIsSpeaking(false);
        setPlayingMessageIndex(null);
      }
      return;
    }

    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }

    if (activeTtsIdRef.current !== currentTtsId) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = getVoiceLanguageCode(voiceLanguage);
    utterance.rate = getSpeechSpeedRate(voicePrefs.speech_speed);
    utterance.pitch = 1;
    utterance.volume = 1;

    let voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      voices = await new Promise<SpeechSynthesisVoice[]>((resolve) => {
        const timeout = window.setTimeout(
          () => resolve(window.speechSynthesis.getVoices()),
          1000,
        );
        window.speechSynthesis.addEventListener(
          "voiceschanged",
          () => {
            window.clearTimeout(timeout);
            resolve(window.speechSynthesis.getVoices());
          },
          { once: true },
        );
      });
    }

    if (activeTtsIdRef.current !== currentTtsId) {
      return;
    }

    const matchingVoice = voices.find((voice) =>
      voice.lang
        .toLowerCase()
        .startsWith(
          utterance.lang.toLowerCase().split("-")[0],
        ),
    );

    if (matchingVoice) {
      utterance.voice = matchingVoice;
    } else if (voiceLanguage !== "en") {
      if (activeTtsIdRef.current === currentTtsId) {
        setIsSpeaking(false);
        setPlayingMessageIndex(null);
        setStatus(
          "❌ Online voice is unavailable and this device has no matching language voice.",
        );
      }
      return;
    }

    utterance.onstart = () => {
      if (activeTtsIdRef.current !== currentTtsId) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
        return;
      }
      setIsSpeaking(true);
      setStatus("🔊 Playing browser voice...");
    };

    utterance.onend = () => {
      if (activeTtsIdRef.current === currentTtsId) {
        setIsSpeaking(false);
        setPlayingMessageIndex(null);
        setStatus("");
      }
    };

    utterance.onerror = (event) => {
      console.error("Browser TTS error:", event);
      if (activeTtsIdRef.current === currentTtsId) {
        setIsSpeaking(false);
        setPlayingMessageIndex(null);
        setStatus("❌ Browser voice output failed.");
      }
    };

    if (activeTtsIdRef.current === currentTtsId) {
      window.speechSynthesis.speak(utterance);
    }
  }

  try {
    setIsSpeaking(true);
    setStatus("🔊 Generating voice response...");

    const response = await apiFetch(
      `${API_URL}/speak`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleanText,
          language: voiceLanguage,
        }),
      },
    );

    if (activeTtsIdRef.current !== currentTtsId) {
      return;
    }

    if (!response.ok) {
      console.warn(
        "Edge TTS / Sarvam TTS failed. Using browser TTS.",
      );

      void playBrowserTTS();
      return;
    }

    const voiceEngine =
      response.headers.get("X-Voice-Engine") ||
      "voice service";
    const voiceCode =
      response.headers.get("X-Voice-Language") ||
      getVoiceLanguageCode(voiceLanguage);

    const audioBlob = await response.blob();

    if (activeTtsIdRef.current !== currentTtsId) {
      return;
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    activeAudioRef.current = audio;
    activeAudioUrlRef.current = audioUrl;

    audio.onended = () => {
      if (activeAudioUrlRef.current) {
        try {
          URL.revokeObjectURL(activeAudioUrlRef.current);
        } catch {}
        activeAudioUrlRef.current = null;
      }
      activeAudioRef.current = null;
      if (activeTtsIdRef.current === currentTtsId) {
        setIsSpeaking(false);
        setPlayingMessageIndex(null);
        setStatus("");
      }
    };

    audio.onerror = () => {
      if (activeAudioUrlRef.current) {
        try {
          URL.revokeObjectURL(activeAudioUrlRef.current);
        } catch {}
        activeAudioUrlRef.current = null;
      }
      activeAudioRef.current = null;
      if (activeTtsIdRef.current === currentTtsId) {
        void playBrowserTTS();
      }
    };

    if (activeTtsIdRef.current !== currentTtsId) {
      if (activeAudioUrlRef.current) {
        try {
          URL.revokeObjectURL(activeAudioUrlRef.current);
        } catch {}
        activeAudioUrlRef.current = null;
      }
      activeAudioRef.current = null;
      return;
    }

    setStatus(
      `🔊 Playing ${voiceCode} using ${voiceEngine}...`,
    );
    await audio.play();
  } catch (error) {
    console.error(
      "TTS unavailable; browser fallback started:",
      error,
    );

    if (activeTtsIdRef.current === currentTtsId) {
      void playBrowserTTS();
    }
  }
}

  if (checkingSession) return null;

  return (
    <DashboardLayout>
      <div className="chat-container-layout">
        {/* Left Sidebar */}
        <aside className={`chat-sidebar ${sidebarOpen ? "" : "collapsed"}`}>
          <div className="chat-sidebar-header">
            <h2 className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 text-base">
              <History size={18} className="text-emerald-600 dark:text-emerald-400" />
              <span>{t("Chat History")}</span>
            </h2>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={t("Close Sidebar")}
            >
              <PanelLeftClose size={18} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              console.log("New Chat clicked");
              void createNewSession();
            }}
            className="new-chat-btn"
          >
            <Plus size={18} />
            <span>{t("New Chat")}</span>
          </button>

          <div className="session-list">
            {loadingSessions && sessionsList.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">{t("Loading chats...")}</p>
            ) : sessionsList.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">{t("No previous chats.")}</p>
            ) : (
              sessionsList.map((item) => {
                const isActive = item.id === sessionId;
                return (
                  <div
                    key={item.id}
                    onClick={() => void selectSession(item.id)}
                    className={`session-item ${isActive ? "active" : ""}`}
                  >
                    <div className="session-item-content">
                      <MessageSquare size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span className="session-title">{item.title}</span>
                    </div>
                    <button
                      type="button"
                      aria-label="Delete chat session"
                      onClick={(e) => void deleteSession(item.id, e)}
                      className="session-delete-btn"
                      title={t("Delete Chat")}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Main Chat Area */}
        <section className="chat-area flex-1">
          <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-2xl mb-4 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-emerald-100 dark:hover:bg-slate-700 transition cursor-pointer"
                title={sidebarOpen ? t("Close History") : t("Open History")}
              >
                {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined" && window.history.length > 1) {
                    router.back();
                  } else {
                    router.push("/dashboard");
                  }
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all duration-300 font-bold text-sm shadow-md group cursor-pointer"
              >
                <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
                <span>{t("Back")}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-sm sm:text-base">
              <span className="text-xl">🤖</span>
              <span>{t("AI Assistant")}</span>
            </div>
          </div>

          {/* Mode Selector and Workflow Bar */}
          <div className="chat-mode-bar flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Mode:
              </span>
              <div className="chat-mode-toggle" role="radiogroup" aria-label="Chat Mode">
                <button
                  type="button"
                  role="radio"
                  aria-checked={chatMode === "standard"}
                  disabled={loading}
                  className={`chat-mode-btn ${chatMode === "standard" ? "active" : ""}`}
                  onClick={() => setChatMode("standard")}
                >
                  Standard Chat
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={chatMode === "agent"}
                  disabled={loading}
                  className={`chat-mode-btn ${chatMode === "agent" ? "active" : ""}`}
                  onClick={() => {
                    setChatMode("agent");
                    if (workflows.length === 0 && !loadingWorkflows) {
                      void fetchWorkflows();
                    }
                  }}
                >
                  ⚡ AI Agent
                </button>
              </div>
            </div>

            {chatMode === "agent" && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                {loadingWorkflows ? (
                  <span className="text-slate-500 dark:text-slate-400 animate-pulse">Loading workflows...</span>
                ) : workflowError ? (
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <span>{workflowError}</span>
                    <button
                      type="button"
                      onClick={() => void fetchWorkflows()}
                      className="underline hover:no-underline font-semibold text-xs cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <label htmlFor="workflow-select" className="font-semibold text-slate-600 dark:text-slate-300">
                      Workflow:
                    </label>
                    <select
                      id="workflow-select"
                      className="workflow-select-dropdown"
                      value={selectedWorkflow}
                      onChange={(e) => setSelectedWorkflow(e.target.value)}
                      disabled={loading}
                    >
                      {workflows.map((wf) => (
                        <option key={wf.name} value={wf.name}>
                          {formatWorkflowTitle(wf.name)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {chatMode === "agent" && !loadingWorkflows && !workflowError && workflows.length > 0 && (
            <div className="text-[11px] text-slate-600 dark:text-slate-300 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl mb-3 flex items-start gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">Capability:</span>
              <span>
                {workflows.find((w) => w.name === selectedWorkflow)?.description ||
                  "Autonomous agricultural advisor with tool execution."}
              </span>
            </div>
          )}

        <div className="chat-messages">
          {messages.map((message, index) => (
            <div
              key={index}
              className={
                message.type === "user"
                  ? "message-row user-row"
                  : "message-row ai-row"
              }
            >
              {message.type === "ai" && (
                <div className="message-avatar ai-avatar">🤖</div>
              )}
              <div
                className={
                  message.type === "user"
                    ? "message user-message"
                    : "message ai-message"
                }
              >
                <p>{message.text}</p>
                {/* Agent metadata badge and expandable tool details */}
                {message.workflow && (
                  <div className="agent-meta-container">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                        ⚡ {formatWorkflowTitle(message.workflow)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {(message.toolCallsCount ?? (message.toolCalls?.length || 0)) === 0
                          ? "Direct LLM response (no tools needed)"
                          : `${message.toolCallsCount ?? message.toolCalls?.length} tool${(message.toolCallsCount ?? message.toolCalls?.length) === 1 ? "" : "s"} called`}
                      </span>
                    </div>

                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <details className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 group">
                        <summary className="cursor-pointer select-none font-medium hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors list-none flex items-center gap-1">
                          <span className="text-[10px] transform group-open:rotate-90 transition-transform">▶</span>
                          <span>View tool execution details</span>
                        </summary>
                        <div className="mt-2 pl-3 space-y-1.5 border-l-2 border-slate-200 dark:border-slate-700">
                          {message.toolCalls.map((tc, tcIdx) => (
                            <div key={tcIdx} className="flex items-start gap-2">
                              <span
                                className={
                                  tc.success
                                    ? "text-emerald-600 dark:text-emerald-400 font-bold"
                                    : "text-amber-600 dark:text-amber-400 font-bold"
                                }
                              >
                                {tc.success ? "✓" : "✗"}
                              </span>
                              <div>
                                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                                  {tc.tool}
                                </span>
                                {tc.result_summary && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    {tc.result_summary}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}
                {message.type === "ai" && index !== 0 && (
                  <button
                    className={`speak-message-btn ${playingMessageIndex === index && isSpeaking ? "playing font-bold text-red-600 dark:text-red-400" : ""}`}
                    disabled={loading || isRecording}
                    onClick={() => {
                      if (playingMessageIndex === index && isSpeaking) {
                        stopSpeechPlayback();
                      } else {
                        void speakAnswer(message.text, index);
                      }
                    }}
                  >
                    {playingMessageIndex === index && isSpeaking
                      ? `⏹️ ${t("Stop")}`
                      : `🔊 ${t("Listen")}`}
                  </button>
                )}
                {message.type === "ai" && index !== 0 && message.id && (
                  <div className="feedback-actions">
                    <span>{t("Was this helpful?")}</span>
                    <button
                      className={`feedback-btn ${message.feedback === true ? "selected" : ""}`}
                      aria-label="Mark this response as helpful"
                      onClick={() => rateResponse(index, true)}
                    >
                      👍
                    </button>
                    <button
                      className={`feedback-btn ${message.feedback === false ? "selected" : ""}`}
                      aria-label="Mark this response as not helpful"
                      onClick={() => rateResponse(index, false)}
                    >
                      👎
                    </button>
                  </div>
                )}
              </div>
              {message.type === "user" && (
                <div className="message-avatar user-avatar">👤</div>
              )}
            </div>
          ))}
          {loading && (
            <div className="message-row ai-row">
              <div className="message-avatar ai-avatar">🤖</div>
              <div className="message ai-message thinking">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* STATUS */}
        {status && <div className="chat-status">{t(status)}</div>}

        {/* INPUT AREA */}

        <p className="ai-disclaimer">
          🌱 {t("AI recommendations should be verified before making important farming decisions.")}
        </p>

        <div className="voice-first-controls">
          <button
            type="button"
            className={isRecording ? "voice-btn recording" : "voice-btn"}
            onClick={() => {
              if (isRecording) {
                stopRecording();
              } else {
                void recordAudio();
              }
            }}
            disabled={
              !isOnline ||
              loading ||
              activeJobId !== null ||
              isSpeaking ||
              sessionId === null ||
              (chatMode === "agent" &&
                (loadingWorkflows || !!workflowError || workflows.length === 0))
            }
            aria-label={
              isRecording
                ? "Stop listening"
                : "Tap to ask your farming question by voice"
            }
            title={isRecording ? "Stop listening" : "Tap and speak"}
          >
            {isRecording ? (
              <>
                <Square size={26} strokeWidth={2.5} className="fill-current text-white" />
                <span>{t("Stop listening")}</span>
              </>
            ) : (
              <>
                <Mic size={34} strokeWidth={2.1} />
                <span>{t("Ask by voice")}</span>
              </>
            )}
          </button>

          <div className="text-fallback-label">
            <span>or type your question</span>
          </div>

          <div className="chat-input-container">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                language === "te"
                  ? "మీ వ్యవసాయ ప్రశ్నను అడగండి..."
                  : language === "hi"
                    ? "अपना कृषि प्रश्न पूछें..."
                    : "Ask your farming question..."
              }
            />
            <button
              type="button"
              className="send-btn"
              onClick={() => askAI()}
              disabled={
                !isOnline ||
                loading ||
                activeJobId !== null ||
                !question.trim() ||
                sessionId === null ||
                (chatMode === "agent" &&
                  (loadingWorkflows || !!workflowError || workflows.length === 0))
              }
              aria-label="Send question"
            >
              {loading ? "..." : "➤"}
            </button>
          </div>
        </div>
      </section>
      </div>
    </DashboardLayout>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<main className="chat-loading">Loading AgriAdvisor...</main>}>
      <ChatContent />
    </Suspense>
  );
}
