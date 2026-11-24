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
