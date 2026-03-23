export async function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Truncate string to maxLen, appending ellipsis if needed.
 */
export function truncate(str: string, maxLen: number): string {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3).trim() + '...';
}

/**
 * Clean whitespace: collapse runs, trim.
 */
export function cleanWhitespace(str: string): string {
  if (!str) return '';
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Extract keywords from a title string for tag generation.
 * Splits on common delimiters, lowercases, deduplicates.
 */
export function extractKeywords(title: string, maxKeywords = 20): string[] {
  if (!title) return [];
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .filter(w => !STOP_WORDS.has(w));
  return [...new Set(words)].slice(0, maxKeywords);
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'this', 'that', 'are', 'was',
  'were', 'been', 'being', 'have', 'has', 'had', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'can', 'not', 'but', 'its',
  'our', 'your', 'his', 'her', 'they', 'them', 'their', 'what', 'which',
  'who', 'whom', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'than', 'too', 'very', 'just', 'also',
]);
