export const JWT_SECRET_MIN_LENGTH = 32;

/** Exact placeholder values that must not be used in production. */
export const JWT_SECRET_KNOWN_PLACEHOLDERS = new Set([
  'CHANGE_THIS_TO_A_STRONG_RANDOM_SECRET_IN_PRODUCTION',
]);

/**
 * Returns true when the secret is absent, too short, or is a known placeholder.
 * Does NOT log or throw — callers decide what to do.
 * Safe to call with undefined (env var not set).
 */
export function isWeakJwtSecret(secret: string | undefined): boolean {
  if (!secret || secret.trim().length === 0) return true;
  if (secret.length < JWT_SECRET_MIN_LENGTH) return true;
  if (JWT_SECRET_KNOWN_PLACEHOLDERS.has(secret)) return true;
  return false;
}
