const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,19}$/;

const RESERVED_USERNAMES = new Set([
  "admin",
  "root",
  "api",
  "support",
  "fam",
  "system",
  "gitgud",
  "null",
  "undefined",
]);

/** Lowercases and trims a raw username input so lookups/comparisons are consistent everywhere. */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Validates a normalized username. Returns an error message, or null if valid. */
export function validateUsername(username: string): string | null {
  if (!USERNAME_PATTERN.test(username)) {
    return "Username must be 3-20 characters, start with a letter, and use only lowercase letters, numbers, and underscores.";
  }
  if (RESERVED_USERNAMES.has(username)) {
    return "That username is reserved.";
  }
  return null;
}
