/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unique SABI ID helpers (4 digits + 1 uppercase letter, e.g. 4829K).
 */

export const SABI_UNIQUE_ID_REGEX = /^\d{4}[A-Z]$/;

const SABI_ID_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Deterministic 5-character Unique SABI ID generator.
 * The same email always yields the same ID, so an ID can never "drift" between
 * the profile row, the auth metadata and the recovery document.
 */
export function generateDeterministicSabiId(email: string): string {
  const normalized = (email || 'scholar@sabi.ng').trim().toLowerCase();
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const absHash = Math.abs(hash);
  const fourDigits = String((absHash % 9000) + 1000);
  const oneLetter = SABI_ID_LETTERS[absHash % SABI_ID_LETTERS.length];
  return `${fourDigits}${oneLetter}`;
}

/** Normalizes a candidate-supplied ID to canonical uppercase form. */
export function normalizeSabiUniqueId(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}

export function isValidSabiUniqueId(value: unknown): boolean {
  return SABI_UNIQUE_ID_REGEX.test(normalizeSabiUniqueId(value));
}
