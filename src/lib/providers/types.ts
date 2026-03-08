export type ProviderCapability = "image" | "video" | "llm";

export interface GenerateImageParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  seed?: number;
}

export interface GenerateVideoParams {
  prompt: string;
  imageUrl?: string;
  duration?: number;
  fps?: number;
}

export interface LLMChatParams {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  maxTokens?: number;
  temperature?: number;
}

export interface GenerateResult {
  url?: string;
  base64?: string;
  revisedPrompt?: string;
  error?: string;
}

export interface LLMResult {
  text: string;
  error?: string;
}

export interface AIProvider {
  id: string;
  name: string;
  capabilities: ProviderCapability[];
  isConfigured: () => boolean;
  generateImage?: (params: GenerateImageParams) => Promise<GenerateResult>;
  generateVideo?: (params: GenerateVideoParams) => Promise<GenerateResult>;
  chat?: (params: LLMChatParams) => Promise<LLMResult>;
}
