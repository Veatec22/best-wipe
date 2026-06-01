import type {
  AiProvider,
  AskAiReportRequest,
  AskAiReportResponse,
  AskAiSqlRequest,
  AskAiSqlResponse,
} from "./types";

export class DisabledAiProvider implements AiProvider {
  readonly kind = "disabled" as const;

  async askSqlHelp(_request: AskAiSqlRequest): Promise<AskAiSqlResponse> {
    throw new Error("Ask AI is disabled.");
  }

  async askReportHelp(_request: AskAiReportRequest): Promise<AskAiReportResponse> {
    throw new Error("Ask AI is disabled.");
  }
}
