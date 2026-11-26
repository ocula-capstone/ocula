// One Undo message at a time, kept for a few seconds so a wrong tap can be taken back. It lives
// outside any page so it survives a button that also changes the page (Start exam opens the
// patient's records).
export interface Toast {
  id: number;
  message: string;
  // Missing for a plain message (nothing to take back).
  undo?: () => void;
}
const SHOW_MS = 6000;
let current: Toast | null = null;
export const currentToast = () => current;
let timer: ReturnType<typeof setTimeout> | undefined;
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function dismissUndo() {
  clearTimeout(timer);
  current = null;
  emit();
}

// Shows `message`, with an Undo link that runs `undo` once when there is one. A newer message replaces the older one.
export function showUndo(message: string, undo?: () => void) {
  clearTimeout(timer);
  current = { id: nextId++, message, undo };
  timer = setTimeout(dismissUndo, SHOW_MS);
  emit();
}

export const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
