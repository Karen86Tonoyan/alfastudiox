import type { AIProvider, ProviderCapability } from "./types";
import { openaiProvider } from "./openai";
import { replicateProvider } from "./replicate";
import { googleProvider } from "./google";
import { huggingfaceProvider } from "./huggingface";
import { mistralProvider } from "./mistral";
import { deepseekProvider } from "./deepseek";
import { xaiProvider } from "./xai";
import { qwenProvider } from "./qwen";
import { kimiProvider } from "./kimi";
import { agnesProvider } from "./agnes";
import { exoProvider } from "./exo";

const allProviders: AIProvider[] = [
  openaiProvider,
  replicateProvider,
  googleProvider,
  huggingfaceProvider,
  mistralProvider,
  deepseekProvider,
  xaiProvider,
  qwenProvider,
  kimiProvider,
  agnesProvider,
  exoProvider,
];

/** Get all registered providers */
export function getAllProviders(): AIProvider[] {
  return allProviders;
}

/** Get providers that have a valid API key configured */
export function getConfiguredProviders(): AIProvider[] {
  return allProviders.filter((p) => p.isConfigured());
}

/** Get providers by capability */
export function getProvidersByCapability(cap: ProviderCapability): AIProvider[] {
  return allProviders.filter((p) => p.capabilities.includes(cap));
}

/** Get a specific provider by id */
export function getProvider(id: string): AIProvider | undefined {
  return allProviders.find((p) => p.id === id);
}

/**
 * Auto-fallback: try configured providers in order until one succeeds.
 * Returns the first successful result or the last error.
 */
export async function generateImageWithFallback(
  params: import("./types").GenerateImageParams,
  preferredProviderId?: string
): Promise<import("./types").GenerateResult> {
  const imageProviders = getProvidersByCapability("image").filter((p) => p.isConfigured());

  // Put preferred provider first
  if (preferredProviderId) {
    const idx = imageProviders.findIndex((p) => p.id === preferredProviderId);
    if (idx > 0) {
      const [pref] = imageProviders.splice(idx, 1);
      imageProviders.unshift(pref);
    }
  }

  let lastError = "Brak skonfigurowanych providerów do generowania obrazów";
  for (const provider of imageProviders) {
    if (!provider.generateImage) continue;
    const result = await provider.generateImage(params);
    if (!result.error) return result;
    lastError = `${provider.name}: ${result.error}`;
    console.warn(`[ProviderFallback] ${provider.name} failed:`, result.error);
  }

  return { error: lastError };
}

export type { AIProvider, ProviderCapability } from "./types";
