export const runtime = 'edge';

import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are a typo correction assistant. Given user input text, check for spelling errors.
Respond ONLY with a JSON object, no markdown, no explanation outside JSON.
Format: { "hasTypo": boolean, "original": string, "corrected": string, "explanation": string }
If no typo, set corrected = original and hasTypo = false.
The explanation should be a short, spoken-friendly sentence in English.`;

export async function POST(request: Request): Promise<Response> {
  let text: string;

  try {
    const body = await request.json();
    text = body?.text;
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return Response.json({ error: 'Text is required' }, { status: 400 });
  }

  if (text.length > 500) {
    return Response.json(
      { error: 'Text must be under 500 characters' },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create(
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: text }],
      },
      { signal: controller.signal },
    );

    const raw =
      message.content[0].type === 'text' ? message.content[0].text : '';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const result = JSON.parse(cleaned);

    return Response.json(result);
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return Response.json(
      {
        error: isTimeout ? 'Request timed out' : 'Failed to check text',
        hasTypo: false,
        original: text,
        corrected: text,
      },
      { status: 500 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
