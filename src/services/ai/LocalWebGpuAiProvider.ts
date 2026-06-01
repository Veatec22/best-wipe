import type { MLCEngine } from "@mlc-ai/web-llm";
import {
  buildAskReportMessages,
  buildAskSqlMessages,
  extractReportChartConfig,
  extractSqlSelect,
} from "./prompts";
import type {
  AiProvider,
  AskAiReportRequest,
  AskAiReportResponse,
  AskAiSqlRequest,
  AskAiSqlResponse,
  ModelInstallProgress,
} from "./types";
import { assertIntegratedWebLlmModel } from "./webLlmModels";

export class LocalWebGpuAiProvider implements AiProvider {
  readonly kind = "local-webgpu" as const;

  private engine: MLCEngine | null = null;
  private loadedModelId: string | null = null;
  private loadingPromise: Promise<MLCEngine> | null = null;
  private warmedModelIds = new Set<string>();

  async preloadModel(
    modelId: string,
    onProgress?: (progress: ModelInstallProgress) => void,
  ): Promise<void> {
    const engine = await this.ensureEngine(modelId, onProgress);
    onProgress?.({ progress: 1, text: "Warming up WebLLM inference..." });
    await this.warmupModel(engine, modelId);
  }

  async askSqlHelp(
    request: AskAiSqlRequest,
    onProgress?: (progress: ModelInstallProgress) => void,
  ): Promise<AskAiSqlResponse> {
    const engine = await this.ensureEngine(request.modelId, onProgress);
    const messages = buildAskSqlMessages(request);
    const completion = await engine.chat.completions.create({
      messages,
      temperature: 0.1,
      top_p: 0.85,
      max_tokens: 700,
    });
    const rawText = completion.choices[0]?.message.content?.trim() ?? "";
    return {
      sql: extractSqlSelect(rawText),
      rawText,
      modelId: request.modelId,
    };
  }

  async askReportHelp(
    request: AskAiReportRequest,
    onProgress?: (progress: ModelInstallProgress) => void,
  ): Promise<AskAiReportResponse> {
    const engine = await this.ensureEngine(request.modelId, onProgress);
    const messages = buildAskReportMessages(request);
    const completion = await engine.chat.completions.create({
      messages,
      temperature: 0.05,
      top_p: 0.8,
      max_tokens: 180,
    });
    const rawText = completion.choices[0]?.message.content?.trim() ?? "";
    return {
      ...extractReportChartConfig(rawText, request.columns),
      rawText,
      modelId: request.modelId,
    };
  }

  async unload(): Promise<void> {
    await this.engine?.unload();
    this.engine = null;
    this.loadedModelId = null;
    this.loadingPromise = null;
  }

  private async ensureEngine(
    modelId: string,
    onProgress?: (progress: ModelInstallProgress) => void,
  ): Promise<MLCEngine> {
    if (!navigator.gpu) {
      throw new Error("WebGPU is unavailable in this browser.");
    }
    if (this.engine && this.loadedModelId === modelId) return this.engine;
    if (this.loadingPromise && this.loadedModelId === modelId) return this.loadingPromise;

    await this.unload();
    this.loadedModelId = modelId;
    this.loadingPromise = this.createEngine(modelId, onProgress);

    try {
      this.engine = await this.loadingPromise;
      return this.engine;
    } finally {
      this.loadingPromise = null;
    }
  }

  private async createEngine(
    modelId: string,
    onProgress?: (progress: ModelInstallProgress) => void,
  ): Promise<MLCEngine> {
    const webllm = await import("@mlc-ai/web-llm");
    await assertIntegratedWebLlmModel(modelId);
    return webllm.CreateMLCEngine(modelId, {
      appConfig: {
        ...webllm.prebuiltAppConfig,
        cacheBackend: "indexeddb",
      },
      initProgressCallback: report => {
        onProgress?.({
          progress: report.progress,
          text: report.text,
        });
      },
      logLevel: "INFO",
    });
  }

  private async warmupModel(engine: MLCEngine, modelId: string): Promise<void> {
    if (this.warmedModelIds.has(modelId)) return;
    await engine.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Return only SQL.",
        },
        {
          role: "user",
          content: "Return exactly: SELECT 1;",
        },
      ],
      temperature: 0,
      max_tokens: 8,
    });
    this.warmedModelIds.add(modelId);
  }
}
