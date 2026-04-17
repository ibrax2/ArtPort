const CONTROL_CHARS_SINGLE_LINE = /[\u0000-\u001F\u007F]/g;
const CONTROL_CHARS_MULTI_LINE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export const TEXT_LIMITS = {
  username: 32,
  email: 254,
  password: 128,
  searchQuery: 120,
  artworkTitle: 120,
  artworkDescription: 1000,
  feedbackText: 1000,
} as const;

export function sanitizeSingleLineText(value: string, maxLength: number): string {
  return value
    .replace(/\r\n?/g, " ")
    .replace(CONTROL_CHARS_SINGLE_LINE, "")
    .slice(0, maxLength);
}

export function sanitizeMultilineText(value: string, maxLength: number): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARS_MULTI_LINE, "")
    .slice(0, maxLength);
}
