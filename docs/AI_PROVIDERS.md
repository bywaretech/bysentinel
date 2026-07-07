# AI Providers

BySentinel analyzes incidents with the provider configured in the dashboard.
Settings are persisted in the `/data` volume and can be changed without
rebuilding Docker images.

The collector always applies a second redaction pass before AI analysis. If a
provider is unavailable or disabled, BySentinel falls back to deterministic
heuristics.

## Supported providers

| Provider    | Base URL | API key      | Notes                                                                             |
| ----------- | -------- | ------------ | --------------------------------------------------------------------------------- |
| OpenAI      | Optional | Required     | Defaults to OpenAI's chat completions API.                                        |
| OpenRouter  | Optional | Required     | Use any OpenRouter model id, such as `openai/gpt-4.1-mini`.                       |
| Anthropic   | Optional | Required     | Uses the Messages API.                                                            |
| DeepSeek    | Optional | Required     | Defaults to `https://api.deepseek.com` and uses `/chat/completions`.              |
| Ollama      | Required | Not required | Run Ollama wherever you prefer and paste a reachable URL.                         |
| Custom HTTP | Required | Optional     | Receives BySentinel's prompt payload and returns `content`, `text` or `response`. |

## Dashboard configuration

Open the dashboard, authenticate with `BYSENTINEL_ADMIN_TOKEN`, and set:

- `enabled`
- provider
- model
- base URL, when needed
- API key
- timeout

The API key is stored server-side and is never returned by `GET /api/settings/ai`;
the API only returns `hasApiKey`.

## DeepSeek

Select `DeepSeek`, paste your API key, and use one of DeepSeek's chat model IDs,
for example:

```txt
deepseek-v4-flash
```

Leave Base URL empty to use BySentinel's default:

```txt
https://api.deepseek.com
```

If you override it, use the base URL only. Do not paste
`/chat/completions`; BySentinel appends that path.

## Local AI with Ollama

The Docker Compose files do not start Ollama. Run it separately and use a URL
reachable from the collector container:

```txt
http://host.docker.internal:11434
```

On a VPS, prefer a private network address or a local reverse proxy with access
controls. Do not expose Ollama publicly without authentication.

## Custom HTTP provider

The custom provider sends:

```json
{
  "systemPrompt": "...",
  "userPrompt": "...",
  "model": "runtime-analyzer",
  "temperature": 0.1,
  "maxTokens": 1500,
  "jsonMode": true
}
```

Return one of:

```json
{ "content": "{...json analysis...}", "model": "my-model" }
```

```json
{ "text": "{...json analysis...}" }
```

```json
{ "response": "{...json analysis...}" }
```

The returned content must match BySentinel's analysis schema or the collector
will use the heuristic fallback.
