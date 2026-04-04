#!/usr/bin/env node
/**
 * Pre-generates OpenAI TTS audio files.
 *
 * Output layout:
 *   public/audio/manifest.json          ← UI/navigation phrases only
 *   public/audio/{sha1}.mp3             ← UI phrase audio files
 *   public/audio/{book-id}/{book-id}.json  ← per-book manifest (ch1 + ch2)
 *   public/audio/{book-id}/{sha1}.mp3      ← per-book audio files
 *
 * Run: node --env-file=.env.local scripts/generate-audio.mjs
 *
 * Flags:
 *   --ui-only    Skip book audio generation
 *   --books-only Skip UI audio generation
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
const UI_MANIFEST_PATH = path.join(AUDIO_DIR, 'manifest.json');
const VOICE = 'nova';
const MODEL = 'tts-1';
const MIN_PARAGRAPH_LENGTH = 10;

const args = process.argv.slice(2);
const uiOnly = args.includes('--ui-only');
const booksOnly = args.includes('--books-only');

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
  const rawParagraphs = chapterLines.join('\n').split(/\n\s*\n/);
  const paragraphs = rawParagraphs
    .map((p) => p.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((p) => p.length >= MIN_PARAGRAPH_LENGTH);
  const sentences = [];
  for (const para of paragraphs) sentences.push(...splitSentences(para));
  return sentences;
}

/**
 * Generate a single TTS audio file if it doesn't already exist.
 * Returns the relative URL path (/audio/... or /audio/{bookId}/...).
 */
async function ensureAudio(text, destDir, urlPrefix) {
  const key = `${VOICE}|${MODEL}|${text}`;
  const hash = crypto.createHash('sha1').update(key).digest('hex');
  const filename = `${hash}.mp3`;
  const filepath = path.join(destDir, filename);

  try {
    await fs.access(filepath);
    process.stdout.write(`  SKIP  ${text.slice(0, 72)}\n`);
    return { key, url: `${urlPrefix}/${filename}`, generated: false };
  } catch { /* generate */ }

  process.stdout.write(`  GEN   ${text.slice(0, 72)}\n`);
  const audio = await openai.audio.speech.create({ model: MODEL, voice: VOICE, input: text });
  const buffer = Buffer.from(await audio.arrayBuffer());
  await fs.writeFile(filepath, buffer);
  return { key, url: `${urlPrefix}/${filename}`, generated: true };
}

// ── Static UI phrases ─────────────────────────────────────────────────────────

const books = require('../public/books/books.json');

const uiPhrases = [
  // Welcome
  'Welcome to AccessReader. Press Enter or click Get Started to open the library.',
  'Opening library.',

  // Library
  `${books.length} books available. Press 0 for search, 1 through ${books.length} for books. Use up and down arrow keys to navigate.`,
  'Returning to welcome screen.',
  'Search box. Type a book title or author and press Enter.',
  'Press the down arrow to move to search results.',
  'Press Escape to return to the library. Press 0 to search again.',
  'Searching.',
  'Search cleared.',

  // Per-book: navigation + selection (library-level UI)
  ...books.map((b, i) => `${i + 1}. ${b.title} by ${b.author}.`),
  ...books.map((b) => `Opening ${b.title}.`),

  // Reader system messages
  'Loading chapter.',
  'Space to pause or resume. Down or right arrow for next sentence. Up or left arrow for previous sentence. Escape to return to the library.',
  'Paused.',
  'Resuming.',
  'Next.',
  'Previous.',
  'End of chapter.',
  'Returning to library.',
  'Reading beyond this point is not yet supported in the beta. Thank you for trying AccessReader.',

  // Per-book chapter-start announcements
  ...books.flatMap((b) =>
    b.chapters.slice(0, 2).map((ch) => `Now reading ${b.title}, ${ch.title}.`)
  ),

  // Keyboard input: a–z, 0–9, special keys
  ...'abcdefghijklmnopqrstuvwxyz'.split(''),
  ...'0123456789'.split(''),
  'delete',
];

// ── Section 1: UI phrases → /public/audio/ ───────────────────────────────────

if (!booksOnly) {
  console.log('\n── UI Phrases ──────────────────────────────────────────────────');
  await fs.mkdir(AUDIO_DIR, { recursive: true });

  // Load existing manifest (rebuild = only UI phrases kept)
  let uiManifest = {};
  try {
    uiManifest = JSON.parse(await fs.readFile(UI_MANIFEST_PATH, 'utf8'));
    // Strip any book-sentence entries that were previously mixed in
    // (book entries have paths like /audio/{bookId}/...)
    uiManifest = Object.fromEntries(
      Object.entries(uiManifest).filter(([, v]) => !v.match(/\/audio\/[^/]+\/[^/]+\.mp3/))
    );
  } catch { /* fresh */ }

  let uiGen = 0;
  let uiSkip = 0;

  for (const text of [...new Set(uiPhrases)]) {
    const { key, url, generated } = await ensureAudio(text, AUDIO_DIR, '/audio');
    uiManifest[key] = url;
    generated ? uiGen++ : uiSkip++;
  }

  await fs.writeFile(UI_MANIFEST_PATH, JSON.stringify(uiManifest, null, 2));
  console.log(`\nUI done — generated: ${uiGen}, skipped: ${uiSkip}, total: ${Object.keys(uiManifest).length}`);
}

// ── Section 2: Book sentences → /public/audio/{book-id}/ ─────────────────────

if (!uiOnly) {
  console.log('\n── Book Audio ──────────────────────────────────────────────────');

  for (const book of books) {
    const bookDir = path.join(AUDIO_DIR, book.id);
    const bookManifestPath = path.join(bookDir, `${book.id}.json`);
    await fs.mkdir(bookDir, { recursive: true });

    let bookManifest = {};
    try {
      bookManifest = JSON.parse(await fs.readFile(bookManifestPath, 'utf8'));
    } catch { /* fresh */ }

    let bookGen = 0;
    let bookSkip = 0;

    // Generate all sentences for chapters 1 and 2 (full beta range, no char limit)
    for (let ci = 0; ci < Math.min(2, book.chapters.length); ci++) {
      const chapter = book.chapters[ci];
      console.log(`\n  [${book.id}] ${chapter.title}`);

      let sentences;
      try {
        sentences = await loadChapterSentences(book.filename, chapter.lineStart, chapter.lineEnd);
      } catch (err) {
        console.warn(`  WARN  Could not load ${book.filename} ${chapter.id}: ${err.message}`);
        continue;
      }

      console.log(`  ${sentences.length} sentences`);

      for (const text of sentences) {
        const { key, url, generated } = await ensureAudio(
          text,
          bookDir,
          `/audio/${book.id}`,
        );
        bookManifest[key] = url;
        generated ? bookGen++ : bookSkip++;
      }
    }

    await fs.writeFile(bookManifestPath, JSON.stringify(bookManifest, null, 2));
    console.log(`  → ${book.id}: generated ${bookGen}, skipped ${bookSkip}, total ${Object.keys(bookManifest).length}`);
  }
}

console.log('\n✓ Audio generation complete.');
