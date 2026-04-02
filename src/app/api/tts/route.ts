import OpenAI from 'openai';
import { type NextRequest, NextResponse } from 'next/server';

// Lazy — instantiated on first request so build succeeds without the key
let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

const ALLOWED_VOICES = ['alloy', 'ash', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer'];
const ALLOWED_MODELS = ['tts-1', 'tts-1-hd'];

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { text?: string; voice?: string; model?: string };
  const text = body.text?.trim();

  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const voice = ALLOWED_VOICES.includes(body.voice ?? '') ? body.voice! : 'nova';
  const model = ALLOWED_MODELS.includes(body.model ?? '') ? body.model! : 'tts-1';

  const audio = await getOpenAI().audio.speech.create({
    model: model as 'tts-1' | 'tts-1-hd',
    voice: voice as 'nova',
    input: text.slice(0, 4096),
  });

  const buffer = Buffer.from(await audio.arrayBuffer());

  return new Response(buffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
