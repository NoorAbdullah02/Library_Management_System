import { customAlphabet } from "nanoid";

/**
 * Identifier & code generation: membership numbers, copy barcodes, ISBN
 * validation. Kept dependency-light and deterministic so it can run anywhere
 * (server actions, seed scripts, edge).
 */

// Crockford-ish base32 (no ambiguous chars) for human-readable barcodes.
const barcodeAlphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const nanoBarcode = customAlphabet(barcodeAlphabet, 8);
const nanoNumeric = customAlphabet("0123456789", 6);

/** Library copy barcode, e.g. `LMN-7F3KQ9PD`. */
export function generateBarcode(prefix = "LMN") {
  return `${prefix}-${nanoBarcode()}`;
}

/** Member card number, e.g. `LIB-2026-048213`. */
export function generateMembershipNumber(year = new Date().getFullYear()) {
  return `LIB-${year}-${nanoNumeric()}`;
}

/** Validate an ISBN-10 or ISBN-13 (checksum included). */
export function isValidISBN(input: string): boolean {
  const isbn = input.replace(/[\s-]/g, "").toUpperCase();
  if (isbn.length === 10) return isValidISBN10(isbn);
  if (isbn.length === 13) return isValidISBN13(isbn);
  return false;
}

function isValidISBN10(isbn: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const char = isbn[i]!;
    const value = char === "X" ? 10 : Number(char);
    sum += value * (10 - i);
  }
  return sum % 11 === 0;
}

function isValidISBN13(isbn: string): boolean {
  if (!/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += Number(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return sum % 10 === 0;
}

/** Normalize an ISBN to digits-only (preserving trailing X). */
export function normalizeISBN(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * Payload encoded in a copy's QR code. Scanning resolves directly to the copy
 * detail page in the app.
 */
export function copyQrPayload(appUrl: string, copyId: string) {
  return `${appUrl.replace(/\/$/, "")}/copies/${copyId}`;
}
