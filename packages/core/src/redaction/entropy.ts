/** Shannon entropy in bits-per-character for a string. */
export function shannonEntropy(value: string): number {
  if (value.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const ch of value) freq.set(ch, (freq.get(ch) ?? 0) + 1);

  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / value.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

const TOKEN_CHARS = /^[A-Za-z0-9+/_=.-]+$/;

/**
 * Heuristic: does this token look like an opaque high-entropy secret?
 * Tuned to avoid flagging normal words, sentences and hex ids that are short.
 */
export function looksHighEntropy(
  value: string,
  { minLength = 24, minEntropy = 4.0 }: { minLength?: number; minEntropy?: number } = {},
): boolean {
  const token = value.trim();
  if (token.length < minLength) return false;
  if (!TOKEN_CHARS.test(token)) return false;
  // Require a mix of character classes so long slugs/paths don't trip it.
  const classes =
    Number(/[a-z]/.test(token)) +
    Number(/[A-Z]/.test(token)) +
    Number(/[0-9]/.test(token)) +
    Number(/[+/_=.-]/.test(token));
  if (classes < 2) return false;
  return shannonEntropy(token) >= minEntropy;
}
