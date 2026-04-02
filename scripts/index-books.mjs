#!/usr/bin/env node
/**
 * Parses Project Gutenberg txt files in public/books/ and generates books.json
 * Chapter content is loaded on-demand at runtime via bookParser.ts.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BOOKS_DIR = join(__dirname, '..', 'public', 'books');
const OUTPUT = join(BOOKS_DIR, 'books.json');

// Chapter detection patterns — applied to TRIMMED lines
// Each entry: { re, fmt } where fmt(match) → string title
const CHAPTER_PATTERNS = [
  // "CHAPTER 1. Loomings." or "CHAPTER I. Title." or "CHAPTER LXI"
  // Use \.? to consume the dot so it doesn't leak into subtitle
  { re: /^CHAPTER\s+(\d+|[IVXLCDM]{1,8})\.?\s*(.*)?$/i,
    fmt: (m) => cleanTitle(`Chapter ${m[1]}`, m[2]) },

  // "Chapter I.]" (Pride & Prejudice) — strip bracket
  { re: /^Chapter\s+(\d+|[IVXLCDM]{1,8})[\.\]]*\s*(.*)?$/i,
    fmt: (m) => cleanTitle(`Chapter ${m[1]}`, m[2]) },

  // "ACT I" or "ACT V"
  { re: /^ACT\s+([IVXLCDM]{1,6}|[0-9]+)\s*$/i,
    fmt: (m) => `Act ${m[1].toUpperCase()}` },

  // "BOOK FIRST" / "BOOK SECOND" etc.
  { re: /^BOOK\s+(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH|THIRTEENTH)\s*$/i,
    fmt: (m) => `Book ${capitalize(m[1])}` },

  // "BOOK I." or "BOOK II" — \b after roman/digit prevents matching "book into..."
  { re: /^BOOK\s+(\d+|[IVXLCDM]{1,8})\b\.?\s*(.*)?$/i,
    fmt: (m) => cleanTitle(`Book ${m[1]}`, m[2]) },

  // Bare Roman numerals only (I through XXXIX) as the ENTIRE trimmed line
  // minLen/maxLen guard applied before regex
  { re: /^(X{0,3}(?:IX|IV|V?I{0,3}))$/,
    minLen: 1, maxLen: 6,
    fmt: (m) => `Part ${m[1]}` },
];

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function cleanTitle(prefix, suffix) {
  if (!suffix) return prefix;
  const cleaned = suffix
    .replace(/^[\.\s]+/, '')        // leading dots/spaces (from "CHAPTER 1. Title" pattern)
    .replace(/\]\s*$/, '')          // trailing ]
    .replace(/\s+\d+\s*$/, '')      // trailing page number (JFK report style)
    .replace(/\s{2,}/g, ' ')        // multiple spaces
    .trim();
  return cleaned ? `${prefix}: ${cleaned}` : prefix;
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

function extractMetadata(lines) {
  let title = '', author = '';
  for (const line of lines.slice(0, 50)) {
    if (!title) { const m = line.match(/^Title:\s*(.+)/); if (m) title = m[1].trim(); }
    if (!author) { const m = line.match(/^Author:\s*(.+)/); if (m) author = m[1].trim(); }
    if (title && author) break;
  }
  return { title, author };
}

function findContentBoundaries(lines) {
  let startLine = 0, endLine = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('*** START OF THE PROJECT GUTENBERG')) startLine = i + 1;
    if (lines[i].includes('*** END OF THE PROJECT GUTENBERG')) { endLine = i; break; }
  }
  return { startLine, endLine };
}

function matchChapter(trimmedLine) {
  for (const p of CHAPTER_PATTERNS) {
    if (p.minLen !== undefined && trimmedLine.length < p.minLen) continue;
    if (p.maxLen !== undefined && trimmedLine.length > p.maxLen) continue;
    const m = trimmedLine.match(p.re);
    if (m) return p.fmt(m);
  }
  return null;
}

function detectChapters(lines, startLine, endLine) {
  // Collect all candidate (chapter header, lineIdx) pairs
  const candidates = [];
  for (let i = startLine; i < endLine; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    const title = matchChapter(t);
    if (title) candidates.push({ lineIdx: i, title });
  }

  if (candidates.length === 0) {
    return [{ id: 'ch1', title: 'Full Text', lineStart: startLine, lineEnd: endLine }];
  }

  // Remove TOC clusters: runs of ≥3 candidates where consecutive gap ≤ 5 lines
  const inTOC = new Set();
  let runStart = 0;
  for (let i = 1; i <= candidates.length; i++) {
    const atEnd = i === candidates.length;
    const gap = atEnd ? 999 : candidates[i].lineIdx - candidates[i - 1].lineIdx;
    if (gap > 5 || atEnd) {
      const runLen = i - runStart;
      if (runLen >= 3) {
        for (let j = runStart; j < i; j++) inTOC.add(j);
      }
      runStart = i;
    }
  }

  const body = candidates.filter((_, idx) => !inTOC.has(idx));

  const source = body.length > 0 ? body : candidates;

  const chapters = [];
  for (let i = 0; i < source.length; i++) {
    const { lineIdx, title } = source[i];
    const lineEnd = i + 1 < source.length ? source[i + 1].lineIdx - 1 : endLine;
    chapters.push({ id: `ch${chapters.length + 1}`, title, lineStart: lineIdx + 1, lineEnd });
  }

  return chapters;
}

function processBook(filePath) {
  const filename = basename(filePath);
  const raw = readFileSync(filePath, 'utf8');
  const lines = raw.split('\n');

  const { title, author } = extractMetadata(lines);
  const { startLine, endLine } = findContentBoundaries(lines);
  const chapters = detectChapters(lines, startLine, endLine);

  const id = slugify(title || basename(filename, '.txt'));

  console.log(`  ${filename}`);
  console.log(`    "${title}" by ${author} — ${chapters.length} chapters`);
  if (chapters.length > 0) {
    console.log(`    First: "${chapters[0].title}"  Last: "${chapters[chapters.length - 1].title}"`);
  }
  console.log('');

  return { id, title: title || basename(filename, '.txt'), author: author || 'Unknown',
           filename, chapterCount: chapters.length, chapters };
}

function main() {
  console.log('Indexing books...\n');
  const txtFiles = readdirSync(BOOKS_DIR).filter(f => f.endsWith('.txt')).sort()
    .map(f => join(BOOKS_DIR, f));

  const books = txtFiles.map(processBook);

  writeFileSync(OUTPUT, JSON.stringify(books, null, 2), 'utf8');
  console.log(`✓ ${books.length} books → books.json  (${books.reduce((s,b)=>s+b.chapterCount,0)} total chapters)`);
}

main();
