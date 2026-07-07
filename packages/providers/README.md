# @bysentinel/providers

HTTP provider implementations for BySentinel AI analysis.

## Providers

- `OpenAIProvider`
- `OpenRouterProvider`
- `AnthropicProvider`
- `OllamaProvider`
- `CustomHttpProvider`
- `createProvider({ provider, ...config })`

Providers only handle transport and normalize model responses into
`AICompletionResult`. Prompting, schema validation, retry/repair and fallback
logic live in `@bysentinel/core` via `analyzeIncident`.

## Example

```ts
import { analyzeIncident } from "@bysentinel/core";
import { createProvider } from "@bysentinel/providers";

const provider = createProvider({
  provider: "openai",
  apiKey: process.env.BYSENTINEL_AI_API_KEY,
});

const result = await analyzeIncident({
  event,
  provider,
  model: "gpt-4.1-mini",
});
```

Ollama is marked as local (`isLocal: true`) and defaults to
`http://127.0.0.1:11434`.
