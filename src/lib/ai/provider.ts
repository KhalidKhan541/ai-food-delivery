import { z } from "zod";

// --- Types ----------------------------------------------------------------

export type ProviderName = "openai" | "anthropic" | "gemini" | "ollama";

export interface ProviderConfig {
  name: ProviderName;
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "function";
  content: string;
  name?: string;
  functionCall?: { name: string; arguments: string };
}

export interface CompletionRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
  stream?: boolean;
  responseFormat?: { type: "text" | "json_object" };
}

export interface CompletionResponse {
  id: string;
  provider: ProviderName;
  model: string;
  content: string;
  finishReason: "stop" | "length" | "function_call" | "content_filter";
  usage: TokenUsage;
  latencyMs: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
}

export interface EmbeddingResponse {
  provider: ProviderName;
  embeddings: number[][];
  usage: TokenUsage;
}

// --- Validation schemas ---------------------------------------------------

const providerConfigSchema = z.object({
  name: z.enum(["openai", "anthropic", "gemini", "ollama"]),
  apiKey: z.string().min(1),
  baseUrl: z.string().url(),
  model: z.string().min(1),
  maxTokens: z.number().int().positive().default(4096),
  temperature: z.number().min(0).max(2).default(0.7),
  timeout: z.number().int().positive().default(30_000),
});

// --- Pricing (USD per 1k tokens) -----------------------------------------

const PRICING: Record<ProviderName, Record<string, { input: number; output: number }>> = {
  openai: {
    "gpt-4o": { input: 0.0025, output: 0.01 },
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
  },
  anthropic: {
    "claude-sonnet-4-20250514": { input: 0.003, output: 0.015 },
    "claude-3-haiku-20240307": { input: 0.00025, output: 0.00125 },
  },
  gemini: {
    "gemini-1.5-pro": { input: 0.00125, output: 0.005 },
    "gemini-1.5-flash": { input: 0.000075, output: 0.0003 },
  },
  ollama: {
    llama3: { input: 0, output: 0 },
  },
};

// --- Provider Adapters ----------------------------------------------------

interface ProviderAdapter {
  complete(req: CompletionRequest): Promise<CompletionResponse>;
  embed(req: EmbeddingRequest): Promise<EmbeddingResponse>;
}

class OpenAIAdapter implements ProviderAdapter {
  constructor(private cfg: ProviderConfig) {}

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const start = Date.now();
    const res = await fetch(`${this.cfg.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: this.cfg.model,
        messages: req.messages,
        temperature: req.temperature ?? this.cfg.temperature,
        max_tokens: req.maxTokens ?? this.cfg.maxTokens,
        stop: req.stop,
        stream: false,
        response_format: req.responseFormat,
      }),
      signal: AbortSignal.timeout(this.cfg.timeout!),
    });
    if (!res.ok) throw new ProviderError(this.cfg.name, res.status, await res.text());
    const data = await res.json();
    const msg = data.choices[0].message;
    const usage = data.usage;
    const cost = this.estimateCost(usage.prompt_tokens, usage.completion_tokens);
    return {
      id: data.id,
      provider: this.cfg.name,
      model: this.cfg.model,
      content: msg.content ?? "",
      finishReason: data.choices[0].finish_reason,
      usage: { promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, totalTokens: usage.total_tokens, estimatedCostUsd: cost },
      latencyMs: Date.now() - start,
    };
  }

  async embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
    const start = Date.now();
    const input = Array.isArray(req.input) ? req.input : [req.input];
    const res = await fetch(`${this.cfg.baseUrl}/v1/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.cfg.apiKey}` },
      body: JSON.stringify({ model: req.model ?? "text-embedding-3-small", input }),
      signal: AbortSignal.timeout(this.cfg.timeout!),
    });
    if (!res.ok) throw new ProviderError(this.cfg.name, res.status, await res.text());
    const data = await res.json();
    const embeddings = data.data.map((d: { embedding: number[] }) => d.embedding);
    const usage = data.usage;
    return {
      provider: this.cfg.name,
      embeddings,
      usage: { promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, totalTokens: usage.total_tokens, estimatedCostUsd: this.estimateCost(usage.prompt_tokens, usage.completion_tokens) },
    };
  }

  private estimateCost(prompt: number, completion: number): number {
    const p = PRICING.openai[this.cfg.model] ?? { input: 0.0025, output: 0.01 };
    return (prompt / 1000) * p.input + (completion / 1000) * p.output;
  }
}

class AnthropicAdapter implements ProviderAdapter {
  constructor(private cfg: ProviderConfig) {}

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const start = Date.now();
    const systemMsg = req.messages.find((m) => m.role === "system");
    const nonSystem = req.messages.filter((m) => m.role !== "system");
    const res = await fetch(`${this.cfg.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.cfg.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.cfg.model,
        max_tokens: req.maxTokens ?? this.cfg.maxTokens,
        system: systemMsg?.content,
        messages: nonSystem.map((m) => ({ role: m.role, content: m.content })),
        temperature: req.temperature ?? this.cfg.temperature,
      }),
      signal: AbortSignal.timeout(this.cfg.timeout!),
    });
    if (!res.ok) throw new ProviderError(this.cfg.name, res.status, await res.text());
    const data = await res.json();
    const content = data.content?.[0]?.text ?? "";
    const cost = this.estimateCost(data.usage?.input_tokens ?? 0, data.usage?.output_tokens ?? 0);
    return {
      id: data.id,
      provider: this.cfg.name,
      model: this.cfg.model,
      content,
      finishReason: data.stop_reason === "end_turn" ? "stop" : "length",
      usage: { promptTokens: data.usage?.input_tokens ?? 0, completionTokens: data.usage?.output_tokens ?? 0, totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0), estimatedCostUsd: cost },
      latencyMs: Date.now() - start,
    };
  }

  async embed(_req: EmbeddingRequest): Promise<EmbeddingResponse> {
    throw new ProviderError("anthropic", 400, "Anthropic does not support embeddings");
  }

  private estimateCost(prompt: number, completion: number): number {
    const p = PRICING.anthropic[this.cfg.model] ?? { input: 0.003, output: 0.015 };
    return (prompt / 1000) * p.input + (completion / 1000) * p.output;
  }
}

class GeminiAdapter implements ProviderAdapter {
  constructor(private cfg: ProviderConfig) {}

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const start = Date.now();
    const contents = req.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    const systemInstruction = req.messages.find((m) => m.role === "system");
    const res = await fetch(`${this.cfg.baseUrl}/v1beta/models/${this.cfg.model}:generateContent?key=${this.cfg.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        ...(systemInstruction && { systemInstruction: { parts: [{ text: systemInstruction.content }] } }),
        generationConfig: {
          temperature: req.temperature ?? this.cfg.temperature,
          maxOutputTokens: req.maxTokens ?? this.cfg.maxTokens,
        },
      }),
      signal: AbortSignal.timeout(this.cfg.timeout!),
    });
    if (!res.ok) throw new ProviderError(this.cfg.name, res.status, await res.text());
    const data = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const usage = data.usageMetadata ?? {};
    const cost = this.estimateCost(usage.promptTokenCount ?? 0, usage.candidatesTokenCount ?? 0);
    return {
      id: crypto.randomUUID(),
      provider: this.cfg.name,
      model: this.cfg.model,
      content,
      finishReason: data.candidates?.[0]?.finishReason === "STOP" ? "stop" : "length",
      usage: { promptTokens: usage.promptTokenCount ?? 0, completionTokens: usage.candidatesTokenCount ?? 0, totalTokens: usage.totalTokenCount ?? 0, estimatedCostUsd: cost },
      latencyMs: Date.now() - start,
    };
  }

  async embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
    const start = Date.now();
    const input = Array.isArray(req.input) ? req.input : [req.input];
    const res = await fetch(`${this.cfg.baseUrl}/v1beta/models/${req.model ?? "text-embedding-004"}:embedContent?key=${this.cfg.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { parts: input.map((i) => ({ text: i })) } }),
      signal: AbortSignal.timeout(this.cfg.timeout!),
    });
    if (!res.ok) throw new ProviderError(this.cfg.name, res.status, await res.text());
    const data = await res.json();
    return {
      provider: this.cfg.name,
      embeddings: [data.embedding?.values ?? []],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0 },
    };
  }

  private estimateCost(prompt: number, completion: number): number {
    const p = PRICING.gemini[this.cfg.model] ?? { input: 0.00125, output: 0.005 };
    return (prompt / 1000) * p.input + (completion / 1000) * p.output;
  }
}

class OllamaAdapter implements ProviderAdapter {
  constructor(private cfg: ProviderConfig) {}

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const start = Date.now();
    const res = await fetch(`${this.cfg.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.cfg.model,
        messages: req.messages,
        options: { temperature: req.temperature ?? this.cfg.temperature, num_predict: req.maxTokens ?? this.cfg.maxTokens },
        stream: false,
      }),
      signal: AbortSignal.timeout(this.cfg.timeout!),
    });
    if (!res.ok) throw new ProviderError(this.cfg.name, res.status, await res.text());
    const data = await res.json();
    const content = data.message?.content ?? "";
    return {
      id: crypto.randomUUID(),
      provider: this.cfg.name,
      model: this.cfg.model,
      content,
      finishReason: data.done ? "stop" : "length",
      usage: { promptTokens: data.prompt_eval_count ?? 0, completionTokens: data.eval_count ?? 0, totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0), estimatedCostUsd: 0 },
      latencyMs: Date.now() - start,
    };
  }

  async embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
    const input = Array.isArray(req.input) ? req.input[0] : req.input;
    const res = await fetch(`${this.cfg.baseUrl}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: req.model ?? this.cfg.model, prompt: input }),
      signal: AbortSignal.timeout(this.cfg.timeout!),
    });
    if (!res.ok) throw new ProviderError(this.cfg.name, res.status, await res.text());
    const data = await res.json();
    return {
      provider: this.cfg.name,
      embeddings: [data.embedding ?? []],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0 },
    };
  }
}

// --- Error ---------------------------------------------------------------

export class ProviderError extends Error {
  constructor(public provider: ProviderName, public statusCode: number, public detail: string) {
    super(`[${provider}] ${statusCode}: ${detail}`);
    this.name = "ProviderError";
  }
}

// --- AI Provider Manager --------------------------------------------------

export class AIProviderManager {
  private providers = new Map<ProviderName, ProviderAdapter>();
  private configs = new Map<ProviderName, ProviderConfig>();
  private fallbackOrder: ProviderName[] = ["openai", "anthropic", "gemini", "ollama"];

  register(config: ProviderConfig): void {
    const parsed = providerConfigSchema.parse(config);
    const adapter = this.createAdapter(parsed);
    this.providers.set(parsed.name, adapter);
    this.configs.set(parsed.name, parsed);
  }

  private createAdapter(cfg: ProviderConfig): ProviderAdapter {
    switch (cfg.name) {
      case "openai": return new OpenAIAdapter(cfg);
      case "anthropic": return new AnthropicAdapter(cfg);
      case "gemini": return new GeminiAdapter(cfg);
      case "ollama": return new OllamaAdapter(cfg);
    }
  }

  setFallbackOrder(order: ProviderName[]): void {
    this.fallbackOrder = order;
  }

  getAvailable(): ProviderName[] {
    return this.fallbackOrder.filter((n) => this.providers.has(n));
  }

  async complete(req: CompletionRequest, preferred?: ProviderName): Promise<CompletionResponse> {
    const order = preferred ? [preferred, ...this.fallbackOrder.filter((n) => n !== preferred)] : this.fallbackOrder;
    let lastError: Error | undefined;
    for (const name of order) {
      const adapter = this.providers.get(name);
      if (!adapter) continue;
      try {
        return await adapter.complete(req);
      } catch (err) {
        lastError = err as Error;
        if (err instanceof ProviderError && err.statusCode >= 400 && err.statusCode < 500) throw err;
      }
    }
    throw lastError ?? new Error("No providers configured");
  }

  async embed(req: EmbeddingRequest, preferred?: ProviderName): Promise<EmbeddingResponse> {
    const order = preferred ? [preferred, ...this.fallbackOrder.filter((n) => n !== preferred)] : this.fallbackOrder;
    let lastError: Error | undefined;
    for (const name of order) {
      const adapter = this.providers.get(name);
      if (!adapter) continue;
      try {
        return await adapter.embed(req);
      } catch (err) {
        lastError = err as Error;
      }
    }
    throw lastError ?? new Error("No providers support embeddings");
  }

  getConfig(name: ProviderName): ProviderConfig | undefined {
    return this.configs.get(name);
  }

  calculateCost(model: string, provider: ProviderName, promptTokens: number, completionTokens: number): number {
    const p = PRICING[provider]?.[model];
    if (!p) return 0;
    return (promptTokens / 1000) * p.input + (completionTokens / 1000) * p.output;
  }
}

// --- Singleton ------------------------------------------------------------

let instance: AIProviderManager | null = null;

export function getAIProvider(): AIProviderManager {
  if (!instance) {
    instance = new AIProviderManager();
    const envKey = process.env.AI_PROVIDER ?? "openai";
    const apiKey = process.env.AI_API_KEY ?? "";
    if (apiKey) {
      instance.register({
        name: envKey as ProviderName,
        apiKey,
        baseUrl: process.env.AI_BASE_URL ?? getDefaultBaseUrl(envKey as ProviderName),
        model: process.env.AI_MODEL ?? getDefaultModel(envKey as ProviderName),
      });
    }
  }
  return instance;
}

function getDefaultBaseUrl(name: ProviderName): string {
  switch (name) {
    case "openai": return "https://api.openai.com";
    case "anthropic": return "https://api.anthropic.com";
    case "gemini": return "https://generativelanguage.googleapis.com";
    case "ollama": return "http://localhost:11434";
  }
}

function getDefaultModel(name: ProviderName): string {
  switch (name) {
    case "openai": return "gpt-4o-mini";
    case "anthropic": return "claude-3-haiku-20240307";
    case "gemini": return "gemini-1.5-flash";
    case "ollama": return "llama3";
  }
}
