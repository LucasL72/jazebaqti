import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize text input by removing HTML tags and dangerous content.
 * Uses DOMPurify for robust XSS protection.
 */
export function sanitizeTextInput(value: string): string {
  // Use DOMPurify to strip all HTML tags and dangerous content
  const cleaned = DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content
  });

  // Additional cleanup: remove control characters and normalize whitespace
  return cleaned
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sanitize URL input with additional protections against javascript: and data: URIs
 */
export function sanitizeUrlInput(value: string): string {
  const cleaned = sanitizeTextInput(value);

  // Block dangerous URL schemes
  const lowerCleaned = cleaned.toLowerCase();
  if (
    lowerCleaned.startsWith("javascript:") ||
    lowerCleaned.startsWith("data:") ||
    lowerCleaned.startsWith("vbscript:")
  ) {
    return "";
  }

  return cleaned;
}

/**
 * Sanitize HTML content while allowing safe tags.
 * Use this when you need to preserve some HTML formatting.
 */
export function sanitizeHtmlInput(value: string): string {
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br"],
    ALLOWED_ATTR: [],
  });
}
