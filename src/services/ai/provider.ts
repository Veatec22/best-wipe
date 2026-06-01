import { LocalWebGpuAiProvider } from "./LocalWebGpuAiProvider";

const localWebGpuAiProvider = new LocalWebGpuAiProvider();

export function getLocalWebGpuAiProvider(): LocalWebGpuAiProvider {
  return localWebGpuAiProvider;
}
