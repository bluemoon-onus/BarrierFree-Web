export interface Chapter {
  id: string;
  title: string;
  paragraphs: string[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  chapters: Chapter[];
}

async function loadBooksFromModule() {
  const booksModule = await import('../../public/books/books.json');
  return booksModule.default as Book[];
}

export async function loadBooks(): Promise<Book[]> {
  if (typeof window === 'undefined') {
    return loadBooksFromModule();
  }

  const response = await fetch('/books/books.json', {
    cache: 'force-cache',
  });

  if (!response.ok) {
    throw new Error('Failed to load books');
  }

  return (await response.json()) as Book[];
}

export async function getBook(id: string): Promise<Book | null> {
  const books = await loadBooks();
  return books.find((book) => book.id === id) ?? null;
}
