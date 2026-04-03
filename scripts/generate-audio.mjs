#!/usr/bin/env node
/**
 * Pre-generates OpenAI TTS audio for all static UI phrases and the first
 * 3000 characters of each book's first 2 chapters (sentence-by-sentence).
 *
 * Run once: node --env-file=.env.local scripts/generate-audio.mjs
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const AUDIO_DIR = path.resolve(__dirname, '../public/audio');
const BOOKS_DIR = path.resolve(__dirname, '../public/books');
const MANIFEST_PATH = path.join(AUDIO_DIR, 'manifest.json');
const VOICE = 'nova';
const MODEL = 'tts-1';
const MIN_PARAGRAPH_LENGTH = 10;
const BOOK_CHAR_LIMIT = 3000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Helpers ───────────────────────────────────────────────────────────────────

function splitSentences(paragraph) {
  if (!paragraph.trim()) return [];
  const text = paragraph.replace(/\s+/g, ' ').trim();
  const result = [];
  const re = /([.!?]+)\s+/g;
  let start = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    const before = text.slice(0, match.index);
    const lastWord = before.split(/\s+/).pop() ?? '';
    if (lastWord.length <= 3 && /^[A-Z]/.test(lastWord)) continue;
    const sentence = text.slice(start, match.index + match[1].length).trim();
    if (sentence.length > 3) result.push(sentence);
    start = match.index + match[0].length;
  }
  const tail = text.slice(start).trim();
  if (tail.length > 3) result.push(tail);
  return result.length > 0 ? result : [text];
}

async function loadChapterSentences(filename, lineStart, lineEnd) {
  const filePath = path.join(BOOKS_DIR, filename);
  const raw = await fs.readFile(filePath, 'utf8');
  const allLines = raw.split('\n');
  const chapterLines = allLines.slice(lineStart, lineEnd);
  const joined = chapterLines.join('\n');
  const rawParagraphs = joined.split(/\n\s*\n/);
  const paragraphs = rawParagraphs
    .map((p) => p.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((p) => p.length >= MIN_PARAGRAPH_LENGTH);

  const sentences = [];
  for (const para of paragraphs) {
    sentences.push(...splitSentences(para));
  }
  return sentences;
}

// ── Static UI phrases ─────────────────────────────────────────────────────────

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

  // Beta end message
  'Reading beyond this point is not yet supported in the beta. Thank you for trying AccessReader.',

  // Search UI
  'Searching.',
  'Search cleared.',

  // Single characters a–z (for key-by-key search announcement)
  ...'abcdefghijklmnopqrstuvwxyz'.split(''),

  // Digits 0–9
  ...'0123456789'.split(''),

  // Special key names
  'delete',
];

// ── Book sentences (first 3000 chars of chapters 0–1) ────────────────────────

const bookSentences = [];

for (const book of books) {
  for (let ci = 0; ci < Math.min(2, book.chapters.length); ci++) {
    const chapter = book.chapters[ci];
    let sentences;
    try {
      sentences = await loadChapterSentences(book.filename, chapter.lineStart, chapter.lineEnd);
    } catch (err) {
      console.warn(`  WARN  Could not load ${book.filename} ch${ci + 1}: ${err.message}`);
      continue;
    }

    let charCount = 0;
    for (const sentence of sentences) {
      if (charCount >= BOOK_CHAR_LIMIT) break;
      bookSentences.push(sentence);
      charCount += sentence.length;
    }
  }
}

// Deduplicate (same sentence might appear in multiple books)
const allPhrases = [...new Set([...phrases, ...bookSentences])];

console.log(`\nUI phrases: ${phrases.length}`);
console.log(`Book sentences (first ${BOOK_CHAR_LIMIT} chars × 2 chapters): ${bookSentences.length}`);
console.log(`Total unique phrases: ${allPhrases.length}\n`);

// ── Generate ──────────────────────────────────────────────────────────────────

await fs.mkdir(AUDIO_DIR, { recursive: true });

let manifest = {};
try {
  const raw = await fs.readFile(MANIFEST_PATH, 'utf8');
  manifest = JSON.parse(raw);
} catch { /* fresh start */ }

let generated = 0;
let skipped = 0;

for (const text of allPhrases) {
  const key = `${VOICE}|${MODEL}|${text}`;
  const hash = crypto.createHash('sha1').update(key).digest('hex');
  const filename = `${hash}.mp3`;
  const filepath = path.join(AUDIO_DIR, filename);

  try {
    await fs.access(filepath);
    manifest[key] = `/audio/${filename}`;
    skipped++;
    process.stdout.write(`  SKIP  ${text.slice(0, 70)}\n`);
    continue;
  } catch { /* file missing — generate */ }

  process.stdout.write(`  GEN   ${text.slice(0, 70)}\n`);

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
