const MIN_PARAGRAPH_LENGTH = 10;

export async function loadChapterContent(
  filename: string,
  lineStart: number,
  lineEnd: number,
): Promise<string[]> {
  const response = await fetch(`/books/${encodeURIComponent(filename)}`);

  if (!response.ok) {
    throw new Error(
      `Failed to load book file: ${filename} (${response.status})`,
    );
  }

  const text = await response.text();
  const allLines = text.split('\n');
  const chapterLines = allLines.slice(lineStart, lineEnd);
  const joined = chapterLines.join('\n');

  const rawParagraphs = joined.split(/\n\s*\n/);

  return rawParagraphs
    // Normalize within-paragraph line breaks to single spaces
    .map((paragraph) => paragraph.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((paragraph) => paragraph.length >= MIN_PARAGRAPH_LENGTH);
}
