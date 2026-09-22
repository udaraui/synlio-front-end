/**
 * Generates a smart prefix based on the input name
 *
 * Examples:
 * - "Synlio Work Tool" -> "SWT"
 * - "Developments" -> "DEV"
 * - "Bug Fixings" -> "BUF"
 * - "Database Query Optimization Actions" -> "DQO"
 * - "Project Management" -> "PMA"
 * - "Single" -> "SIN"
 *
 * @param name - The full name to generate prefix from
 * @returns The generated prefix in uppercase
 */
export function generatePrefix(name: string): string {
  if (!name || name.trim().length === 0) {
    return '';
  }

  const trimmedName = name.trim();

  // Split by spaces and filter out empty strings
  let words = trimmedName.split(/\s+/).filter(word => word.length > 0);

  // Special case: if name starts with "The", remove it before processing
  if (words.length > 1 && words[0].toLowerCase() === 'the') {
    words = words.slice(1);
  }

  if (words.length === 0) {
    return '';
  }

  // If single word
  if (words.length === 1) {
    const word = words[0];
    // Take first 3 characters
    return word.substring(0, 3).toUpperCase();
  }

  // If two words
  if (words.length === 2) {
    // Take first letter of first word + first 2 letters of second word
    // Examples: "Project Management" → "PMA", "Quality Assurance" → "QAS"
    const firstLetter = words[0][0];
    const secondPart = words[1].substring(0, 2);
    return (firstLetter + secondPart).toUpperCase();
  }

  // If three words
  if (words.length === 3) {
    // Take first letter of each word
    return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  }

  // If four or more words
  // Take first letter of each word up to 4 words, or intelligently skip smaller words
  const filteredWords = words.filter(word => {
    // Skip very small words (like "a", "an", "the", "of", "in", "on", etc.)
    const skipWords = ['a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'or', 'but'];
    return word.length > 2 || !skipWords.includes(word.toLowerCase());
  });

  // If we still have words after filtering
  if (filteredWords.length > 0) {
    // If we have 3 or fewer filtered words, use them all
    if (filteredWords.length <= 3) {
      return filteredWords.map(w => w[0]).join('').toUpperCase();
    }

    // If we have more than 3 filtered words, take first 3
    return filteredWords.slice(0, 3).map(w => w[0]).join('').toUpperCase();
  }

  // Fallback: take first letter of first 3 words (even if they were small words)
  return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
}

/**
 * Validates if a prefix meets the minimum requirements
 *
 * @param prefix - The prefix to validate
 * @returns true if valid, false otherwise
 */
export function isValidPrefix(prefix: string): boolean {
  if (!prefix || prefix.trim().length === 0) {
    return false;
  }

  // Prefix should be 2-5 characters, alphanumeric
  const trimmed = prefix.trim();
  return trimmed.length >= 2 && trimmed.length <= 5 && /^[A-Z0-9]+$/.test(trimmed);
}

/**
 * Generates alternative prefixes by appending letters from the original name
 * Used to resolve collisions
 */
export function generatePrefixAlternatives(name: string): string[] {
  const base = generatePrefix(name);
  if (!base) return [];

  const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  const alts = new Set<string>();
  alts.add(base);

  // Try appending each letter from the name
  for (let i = 0; i < cleanName.length; i++) {
    const char = cleanName[i];
    if (base.length < 5) {
      alts.add((base + char).substring(0, 5));
    }
  }

  // Also try 2 letters combinations if space permits
  if (base.length <= 3) {
    for (let i = 0; i < cleanName.length; i++) {
      for (let j = i + 1; j < cleanName.length; j++) {
        alts.add((base + cleanName[i] + cleanName[j]).substring(0, 5));
      }
    }
  }

  return Array.from(alts);
}

