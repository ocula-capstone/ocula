// "Dr. Olivia Optometrist" -> "OO". The title is skipped so doctors do not all read "DO".
export const initials = (fullName: string): string =>
  fullName
    .replace(/^dr\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
