#!/usr/bin/env node
/**
 * Pre-generates OpenAI TTS audio for all static UI phrases.
 * Run once: node scripts/generate-audio.mjs
 * Requires OPENAI_API_KEY in environment (or .env.local via dotenv).
 *
 * Output: public/audio/{sha1}.mp3  +  public/audio/manifest.json
 * The manifest maps "voice|model|text" → "/audio/{sha1}.mp3"
 */

import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

// Load .env.local if present
try {
  const { config } = await import('dotenv');
  config({ path: path.resolve(process.cwd(), '.env.local') });
} catch { /* dotenv not installed — rely on env vars */ }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const AUDIO_DIR = path.resolve(__dirname, '../public/audio');
const MANIFEST_PATH = path.join(AUDIO_DIR, 'manifest.json');
const VOICE = 'nova';
const MODEL = 'tts-1';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Phrases to pre-generate ──────────────────────────────────────────────────

const books = require('../public/books/books.json');

const phrases = [
  // Welcome screen
  'Welcome to AccessReader. Press Enter or click Get Started to open the library.',
  'Opening library.',

  // Library screen
  `Library. ${books.length} books available. Press a number 1 through 9 to select, or use arrow keys. Press Escape to go back.`,
  'Returning to welcome screen.',

  // Per-book: navigation + selection
  ...books.map((b, i) => `${i + 1}. ${b.title} by ${b.author}.`),
  ...books.map((b) => `Opening ${b.title}.`),

  // Reader controls (heard every chapter load)
  'Loading chapter.',
  'Space to pause or resume. Down or right arrow for next sentence. Up or left arrow for previous sentence. Escape to return to the library.',
  'Paused.',
  'Resuming.',
  'Next.',
  'Previous.',
  'End of chapter.',
  'Returning to library.',
];

// ── Generate ─────────────────────────────────────────────────────────────────

await fs.mkdir(AUDIO_DIR, { recursive: true });

// Load existing manifest
let manifest = {};
try {
  const raw = await fs.readFile(MANIFEST_PATH, 'utf8');
  manifest = JSON.parse(raw);
} catch { /* fresh start */ }

let generated = 0;
let skipped = 0;

for (const text of phrases) {
  const key = `${VOICE}|${MODEL}|${text}`;
  const hash = crypto.createHash('sha1').update(key).digest('hex');
  const filename = `${hash}.mp3`;
  const filepath = path.join(AUDIO_DIR, filename);

  // Skip if already on disk
  try {
    await fs.access(filepath);
    manifest[key] = `/audio/${filename}`;
    skipped++;
    process.stdout.write(`  SKIP  ${text.slice(0, 60)}\n`);
    continue;
  } catch { /* file missing — generate */ }

  process.stdout.write(`  GEN   ${text.slice(0, 60)}\n`);

  const audio = await openai.audio.speech.create({
    model: MODEL,
    voice: VOICE,
    input: text,
  });
  const buffer = Buffer.from(await audio.arrayBuffer());
  await fs.writeFile(filepath, buffer);

  manifest[key] = `/audio/${filename}`;
  generated++;
}

await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

console.log(`\nDone. Generated: ${generated}, Skipped: ${skipped}, Total: ${Object.keys(manifest).length}`);
