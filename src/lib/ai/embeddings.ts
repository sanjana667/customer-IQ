/**
 * Simple embedding generation using Claude's text representation.
 * Since we don't have pgvector, we store embeddings as JSON text.
 * We use a simple TF-IDF-like approach for semantic similarity.
 * For production, use OpenAI embeddings API or similar.
 */

// Simple word tokenizer
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

// Stop words
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "this", "that", "these", "those",
  "it", "its", "they", "their", "we", "our", "you", "your", "i", "my",
  "not", "no", "so", "if", "as", "up", "out", "about", "into", "very",
  "just", "also", "than", "then", "when", "where", "who", "what", "how",
]);

// Vocabulary for consistent vector dimensions
const VOCAB_SIZE = 200;

function getVocabWords(texts: string[]): string[] {
  const freq = new Map<string, number>();
  for (const text of texts) {
    const tokens = tokenize(text).filter((t) => !STOP_WORDS.has(t));
    for (const token of tokens) {
      freq.set(token, (freq.get(token) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, VOCAB_SIZE)
    .map(([word]) => word);
}

// Generate a simple bag-of-words vector for a single text
// We use a fixed-size hash-based approach for consistent dimensions
export function generateSimpleEmbedding(text: string): number[] {
  const tokens = tokenize(text).filter((t) => !STOP_WORDS.has(t));
  const vector = new Array(VOCAB_SIZE).fill(0);

  for (const token of tokens) {
    // Hash the token to a bucket
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 31 + token.charCodeAt(i)) % VOCAB_SIZE;
    }
    vector[Math.abs(hash)] += 1;
  }

  // L2 normalize
  const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
  if (norm > 0) {
    return vector.map((v) => v / norm);
  }
  return vector;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot; // already normalized
}

export function vectorToString(vector: number[]): string {
  return JSON.stringify(vector);
}

export function stringToVector(str: string): number[] {
  try {
    return JSON.parse(str);
  } catch {
    return [];
  }
}
