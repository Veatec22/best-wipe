import { create } from "zustand";
import type {
  AiRequestStatus,
  AskAiReportResponse,
  AskAiSqlResponse,
  ModelInstallProgress,
} from "./types";
import { DEFAULT_WEBLLM_MODEL_ID } from "./webLlmModels";

const MODEL_OVERRIDE_KEY = "data_fever.ai.modelOverride";
const USED_SLOTS_KEY = "data_fever.ai.usedSlots";
const DEFAULT_AI_DAILY_LIMIT = 3;

interface AiState {
  envModelId: string;
  modelId: string;
  modelSource: "env" | "admin";
  used: number;
  total: number;
  status: AiRequestStatus;
  progress: ModelInstallProgress | null;
  error: string | null;
  readyModelId: string | null;
  lastSuggestion: AskAiSqlResponse | null;
  lastReportSuggestion: AskAiReportResponse | null;
  setModelOverride(modelId: string): void;
  resetModelOverride(): void;
  resetUsage(): void;
  startLoadingModel(): void;
  startGenerating(): void;
  setProgress(progress: ModelInstallProgress): void;
  markModelReady(modelId: string): void;
  finishRequest(response: AskAiSqlResponse): void;
  finishReportRequest(response: AskAiReportResponse): void;
  failRequest(message: string): void;
}

export const useAiStore = create<AiState>(set => {
  const envModelId = getEnvModelId();
  const modelOverride = getStoredModelOverride();
  const initialModelId = modelOverride ?? envModelId;

  return {
    envModelId,
    modelId: initialModelId,
    modelSource: modelOverride ? "admin" : "env",
    used: getStoredUsedSlots(),
    total: getDailyLimit(),
    status: "idle",
    progress: null,
    error: null,
    readyModelId: null,
    lastSuggestion: null,
    lastReportSuggestion: null,
    setModelOverride(modelId) {
      safeLocalStorageSet(MODEL_OVERRIDE_KEY, modelId);
      set({
        modelId,
        modelSource: "admin",
        error: null,
        readyModelId: null,
        lastSuggestion: null,
        lastReportSuggestion: null,
      });
    },
    resetModelOverride() {
      safeLocalStorageRemove(MODEL_OVERRIDE_KEY);
      set(state => ({
        modelId: state.envModelId,
        modelSource: "env",
        error: null,
        readyModelId: null,
        lastSuggestion: null,
        lastReportSuggestion: null,
      }));
    },
    resetUsage() {
      safeLocalStorageSet(USED_SLOTS_KEY, "0");
      set({
        used: 0,
        error: null,
      });
    },
    startLoadingModel() {
      set({
        status: "loading-model",
        progress: { progress: 0, text: "Preparing WebLLM model..." },
        error: null,
      });
    },
    startGenerating() {
      set({
        status: "generating",
        progress: null,
        error: null,
      });
    },
    setProgress(progress) {
      set({
        status: "loading-model",
        progress,
      });
    },
    markModelReady(modelId) {
      set({
        status: "ready",
        progress: null,
        error: null,
        readyModelId: modelId,
      });
    },
    finishRequest(response) {
      set(state => {
        const used = Math.min(state.used + 1, state.total);
        safeLocalStorageSet(USED_SLOTS_KEY, String(used));
        return {
          used,
          status: "ready",
          progress: null,
          error: null,
          lastSuggestion: response,
        };
      });
    },
    finishReportRequest(response) {
      set(state => {
        const used = Math.min(state.used + 1, state.total);
        safeLocalStorageSet(USED_SLOTS_KEY, String(used));
        return {
          used,
          status: "ready",
          progress: null,
          error: null,
          lastReportSuggestion: response,
        };
      });
    },
    failRequest(message) {
      set({
        status: "error",
        progress: null,
        error: message,
      });
    },
  };
});

function getEnvModelId(): string {
  return import.meta.env.VITE_WEBLLM_MODEL_ID?.trim() || DEFAULT_WEBLLM_MODEL_ID;
}

function getDailyLimit(): number {
  const parsed = Number(import.meta.env.VITE_AI_DAILY_LIMIT ?? DEFAULT_AI_DAILY_LIMIT);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_AI_DAILY_LIMIT;
  return Math.floor(parsed);
}

function getStoredModelOverride(): string | null {
  const stored = safeLocalStorageGet(MODEL_OVERRIDE_KEY);
  return stored?.trim() || null;
}

function getStoredUsedSlots(): number {
  const parsed = Number(safeLocalStorageGet(USED_SLOTS_KEY) ?? "0");
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage can be unavailable in restricted WebViews.
  }
}

function safeLocalStorageRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // localStorage can be unavailable in restricted WebViews.
  }
}
