/**
 * Simple HTML sanitization utility to prevent XSS attacks.
 * Strips all HTML tags and encodes special characters.
 */

/**
 * Strip HTML tags from a string
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Encode HTML special characters to prevent XSS
 */
export function encodeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sanitize user input - strips HTML tags and trims whitespace
 * Use this for all text fields that will be stored in the database
 */
export function sanitizeText(input: string | undefined | null): string {
  if (!input) return '';
  return stripHtml(input).trim();
}

/**
 * Sanitize a text field but allow basic formatting (newlines)
 * Use this for multi-line text areas like notes and descriptions
 */
export function sanitizeMultiline(input: string | undefined | null): string {
  if (!input) return '';
  // Strip HTML but preserve newlines
  return input.replace(/<(?!br\s*\/?>)[^>]*>/gi, '').trim();
}
