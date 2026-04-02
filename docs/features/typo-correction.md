# Feature: Typo Correction API (/api/typo-check)

## Endpoint
`POST /api/typo-check`

## Request
```json
{ "text": "aplle" }
```

## Response
```json
{
  "hasTypo": true,
  "original": "aplle",
  "corrected": "apple",
  "explanation": "Did you mean 'apple' instead of 'aplle'?"
}
```

## Implementation
- Vercel API Route (Edge Runtime)
- Calls Anthropic Claude Haiku (`claude-haiku-4-5-20251001`)
- System prompt instructs Haiku to ONLY check for typos, respond in JSON

## Claude Haiku System Prompt
```
You are a typo correction assistant. Given user input text, check for spelling errors.
Respond ONLY with a JSON object, no markdown, no explanation outside JSON.
Format: { "hasTypo": boolean, "original": string, "corrected": string, "explanation": string }
If no typo, set corrected = original and hasTypo = false.
The explanation should be a short, spoken-friendly sentence in English.
```

## Error Handling
- API timeout (5s) → "Sorry, I couldn't check your input. Please try again."
- Network error → "Connection error. Your input will be used as-is."
- Empty input → "Please type something first."

## Cost Estimate
- Claude Haiku: ~$0.25/M input tokens, ~$1.25/M output tokens
- Average typo check: ~50 input tokens, ~30 output tokens
- 1000 checks ≈ $0.05 — well within budget
