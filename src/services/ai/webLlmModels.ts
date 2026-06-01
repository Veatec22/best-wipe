import type { ModelRecord } from "@mlc-ai/web-llm";

export const DEFAULT_WEBLLM_MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
const LLM_MODEL_TYPE = 0;

export interface WebLlmModelOption {
  id: string;
  label: string;
  vramRequiredMb?: number;
  lowResourceRequired?: boolean;
}

export async function getIntegratedWebLlmModelOptions(): Promise<WebLlmModelOption[]> {
  const webllm = await import("@mlc-ai/web-llm");
  return webllm.prebuiltAppConfig.model_list.filter(isTextModel).map(toOption);
}

export async function assertIntegratedWebLlmModel(modelId: string): Promise<void> {
  const webllm = await import("@mlc-ai/web-llm");
  const found = webllm.prebuiltAppConfig.model_list.some(
    record => record.model_id === modelId && isTextModel(record),
  );
  if (!found) throw new Error(`WebLLM model is not integrated: ${modelId}`);
}

function isTextModel(record: ModelRecord): boolean {
  return record.model_type === undefined || record.model_type === LLM_MODEL_TYPE;
}

function toOption(record: ModelRecord): WebLlmModelOption {
  return {
    id: record.model_id,
    label: record.model_id,
    vramRequiredMb: record.vram_required_MB,
    lowResourceRequired: record.low_resource_required,
  };
}
