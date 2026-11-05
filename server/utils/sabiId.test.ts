/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for the Unique SABI ID helpers (Phase 0: the generator was moved out
 * of the client bundle into a server-side, testable module).
 */

import { describe, expect, it } from 'vitest';
import {
  SABI_UNIQUE_ID_REGEX,
  generateDeterministicSabiId,
  isValidSabiUniqueId,
  normalizeSabiUniqueId,
} from './sabiId';

describe('generateDeterministicSabiId', () => {
  it('always produces the 4-numbers + 1-letter format', () => {
    const emails = [
      'candidate@gmail.com',
      'ada.obi@yahoo.com',
      'chinedu+utme@outlook.com',
      'a@b.co',
      '',
    ];

    for (const email of emails) {
      expect(generateDeterministicSabiId(email)).toMatch(SABI_UNIQUE_ID_REGEX);
    }
  });

  it('is deterministic for the same email regardless of case or padding', () => {
    const canonical = generateDeterministicSabiId('candidate@gmail.com');

    expect(generateDeterministicSabiId('Candidate@Gmail.com')).toBe(canonical);
    expect(generateDeterministicSabiId('  candidate@gmail.com  ')).toBe(canonical);
  });

  it('does not emit the ambiguous letters I or O', () => {
    for (let i = 0; i < 200; i++) {
      const id = generateDeterministicSabiId(`scholar${i}@sabi.ng`);
      expect(id[4]).not.toBe('I');
      expect(id[4]).not.toBe('O');
    }
  });

  it('spreads different emails across different IDs', () => {
    const ids = new Set(
      Array.from({ length: 50 }, (_, i) => generateDeterministicSabiId(`user${i}@sabi.ng`))
    );

    expect(ids.size).toBeGreaterThan(45);
  });

  it('falls back to the default scholar account for an empty email', () => {
    expect(generateDeterministicSabiId('')).toBe(generateDeterministicSabiId('scholar@sabi.ng'));
  });
});

describe('normalizeSabiUniqueId', () => {
  it('trims and upper-cases candidate input', () => {
    expect(normalizeSabiUniqueId('  4829k ')).toBe('4829K');
  });

  it('tolerates null and undefined', () => {
    expect(normalizeSabiUniqueId(null)).toBe('');
    expect(normalizeSabiUniqueId(undefined)).toBe('');
  });
});

describe('isValidSabiUniqueId', () => {
  it('accepts well-formed IDs', () => {
    expect(isValidSabiUniqueId('4829K')).toBe(true);
    expect(isValidSabiUniqueId(' 4829k ')).toBe(true);
  });

  it('rejects malformed IDs', () => {
    for (const value of ['829K', '48291', '4829KK', 'ABCDE', '', null]) {
      expect(isValidSabiUniqueId(value)).toBe(false);
    }
  });
});
