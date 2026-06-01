export type AiProviderKind = "local-webgpu" | "disabled";

export type AiRequestStatus = "idle" | "loading-model" | "ready" | "generating" | "error";

export interface SchemaTableMap {
  [tableName: string]: string[];
}

export interface AskAiSqlRequest {
  gameContext: string;
  taskBrief: string;
  schemaTables: SchemaTableMap;
  userSql?: string;
  modelId: string;
}

export interface AskAiSqlResponse {
  sql: string;
  rawText: string;
  modelId: string;
}

export interface AskAiReportRequest {
  taskBrief: string;
  columns: string[];
  sampleRows: unknown[][];
  modelId: string;
}

export interface AskAiReportResponse {
  chartType: "bar" | "line";
  xColumn: string;
  yColumn: string;
  rawText: string;
  modelId: string;
}

export interface ModelInstallProgress {
  progress: number;
  text: string;
}

export interface AiProvider {
  readonly kind: AiProviderKind;
  preloadModel?(
    modelId: string,
    onProgress?: (progress: ModelInstallProgress) => void,
  ): Promise<void>;
  askSqlHelp(
    request: AskAiSqlRequest,
    onProgress?: (progress: ModelInstallProgress) => void,
  ): Promise<AskAiSqlResponse>;
  askReportHelp(
    request: AskAiReportRequest,
    onProgress?: (progress: ModelInstallProgress) => void,
  ): Promise<AskAiReportResponse>;
  unload?(): Promise<void>;
}
