import { manilaHour } from '@/lib/dates';

export function greeting(now: Date = new Date()): string {
  const hour = manilaHour(now);
  if (hour < 12) return 'Good morning';
  return hour < 18 ? 'Good afternoon' : 'Good evening';
}

// "Sam Staff" -> "Sam"; "Dr. Olivia Optometrist" -> "Dr. Optometrist".
export function greetingName(fullName: string): string {
  const words = fullName.trim().split(/\s+/);
  return /^dr\.?$/i.test(words[0]) ? `Dr. ${words[words.length - 1]}` : words[0];
}

// "Good evening, Sam" for a page title.
export const greetingFor = (fullName: string, now: Date = new Date()): string =>
  `${greeting(now)}, ${greetingName(fullName)}`;
