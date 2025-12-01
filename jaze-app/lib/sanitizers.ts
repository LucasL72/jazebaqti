export function sanitizeTextInput(value: string) {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeUrlInput(value: string) {
  return sanitizeTextInput(value).replace(/"/g, "");
}
