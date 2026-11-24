// Reads a list saved in localStorage. Missing, corrupt or non-list text gives an empty list,
// so a bad saved value can never stop the mock layer from loading.
export function readSavedList(key: string): unknown[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

// Saves a list in localStorage. Saving is best effort: if the browser refuses (storage full or
// blocked), the mock keeps working for this session instead of failing the request.
export function writeSavedList(key: string, list: unknown[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // nothing to do: the data just will not survive a reload
  }
}
