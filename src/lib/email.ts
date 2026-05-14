export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function nameFromEmail(email: string) {
  const localPart = normalizeEmail(email).split("@")[0] ?? email;
  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function parseEmailList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,;]/)
        .map(normalizeEmail)
        .filter(Boolean),
    ),
  );
}
