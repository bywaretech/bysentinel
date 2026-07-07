import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AnthropicProvider,
  createProvider,
  CustomHttpProvider,
  DeepSeekProvider,
  OllamaProvider,
  OpenAIProvider,
} from "../src/index.js";

const request = {
  systemPrompt: "system",
  userPrompt: "user",
  model: "model-a",
  temperature: 0.1,
  maxTokens: 100,
  jsonMode: true,
};

describe("providers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates providers by name", () => {
    expect(createProvider({ provider: "ollama" }).name).toBe("ollama");
    expect(
      createProvider({ provider: "custom-http", baseUrl: "http://localhost/analyze" }).name,
    ).toBe("custom-http");
    expect(createProvider({ provider: "deepseek", apiKey: "deepseek-test" }).name).toBe("deepseek");
  });

  it("sends OpenAI-compatible chat requests", async () => {
    const fetchMock = mockFetch({
      model: "model-a",
      choices: [{ message: { content: '{"ok":true}' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    });
    const provider = new OpenAIProvider({ apiKey: "sk-test", baseUrl: "https://example.test/v1" });

    const result = await provider.complete(request);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);

    expect(result.content).toBe('{"ok":true}');
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(init.headers).toMatchObject({ authorization: "Bearer sk-test" });
  });

  it("parses Anthropic text blocks", async () => {
    mockFetch({
      model: "claude-test",
      content: [{ type: "text", text: '{"ok":true}' }],
      usage: { input_tokens: 7, output_tokens: 3 },
    });
    const provider = new AnthropicProvider({
      apiKey: "anthropic-test",
      baseUrl: "https://example.test/v1",
    });

    const result = await provider.complete(request);
    expect(result.content).toBe('{"ok":true}');
    expect(result.usage?.promptTokens).toBe(7);
  });

  it("sends DeepSeek OpenAI-compatible chat requests", async () => {
    const fetchMock = mockFetch({
      model: "deepseek-v4-flash",
      choices: [{ message: { content: '{"ok":true}' } }],
      usage: { prompt_tokens: 9, completion_tokens: 4 },
    });
    const provider = new DeepSeekProvider({ apiKey: "deepseek-test" });

    const result = await provider.complete({ ...request, model: "deepseek-v4-flash" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);

    expect(url).toBe("https://api.deepseek.com/chat/completions");
    expect(result.content).toBe('{"ok":true}');
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(init.headers).toMatchObject({ authorization: "Bearer deepseek-test" });
  });

  it("parses Ollama chat responses", async () => {
    mockFetch({ model: "llama", message: { content: '{"ok":true}' }, eval_count: 4 });
    const provider = new OllamaProvider({ baseUrl: "http://localhost:11434" });

    const result = await provider.complete(request);
    expect(provider.isLocal).toBe(true);
    expect(result.content).toBe('{"ok":true}');
    expect(result.usage?.completionTokens).toBe(4);
  });

  it("supports custom HTTP analyzer endpoints", async () => {
    const fetchMock = mockFetch({ content: '{"ok":true}', model: "custom" });
    const provider = new CustomHttpProvider({
      baseUrl: "https://ai.example/analyze",
      apiKey: "token",
    });

    const result = await provider.complete(request);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe("https://ai.example/analyze");
    expect(result.model).toBe("custom");
  });
});

function mockFetch(json: unknown) {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    text: async () => JSON.stringify(json),
  })) as unknown as typeof fetch;
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock as unknown as ReturnType<typeof vi.fn>;
}
