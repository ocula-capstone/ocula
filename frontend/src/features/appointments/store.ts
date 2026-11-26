import { useSyncExternalStore } from 'react';
import { minutesOf } from '@/features/appointments/days';
import { manilaToday } from '@/lib/dates';
import { showUndo } from '@/lib/undoToast';
import { agenda, openSlots } from '@/mocks/data/samples';
import type { Appointment, OpenSlot } from '@/types/clinic';

// shortcut: the day's visits live in memory (module state) until the appointments API exists, so
// a status change and its Undo survive leaving the page. Replace with a query + mutations then.
interface State {
  visits: Appointment[];
  slots: OpenSlot[];
}
let state: State = { visits: [...agenda], slots: [...openSlots] };
const listeners = new Set<() => void>();
const set = (next: State) => {
  state = next;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
export const useAppointments = (): State => useSyncExternalStore(subscribe, () => state);

// A patient booking online can hold this many upcoming visits at once; it limits what a fake
// account can tie up. Staff booking at the desk are not limited.
export const MAX_UPCOMING = 2;
// The visits a patient still has ahead: today or later, and not finished, cancelled or missed.
export const upcomingFor = (visits: Appointment[], patient: string, today: string): Appointment[] =>
  visits.filter(
    (v) =>
      v.patient === patient &&
      v.day >= today &&
      ['Booked', 'Waiting', 'In exam'].includes(v.status),
  );

const SLOT_MINUTES = 30;
const slotKey = (day: string, time: string) => `${day} ${time}`;
const inactive = (v: Appointment) => v.status === 'Cancelled' || v.status === 'No-show';

// shortcut: every visit lasts this long until services carry their own length.
export const VISIT_MINUTES = 30;
const overlaps = (a: string, b: string) => Math.abs(minutesOf(a) - minutesOf(b)) < VISIT_MINUTES;

// The booked visits on `day` that overlap a visit starting at `time` (cancelled and no-show ones
// free their time).
export const overlapping = (visits: Appointment[], day: string, time: string): Appointment[] =>
  visits.filter((v) => v.day === day && !inactive(v) && overlaps(v.time, time));

// Does `v` block `doctor`? The same time is fine with a different doctor; "Any doctor" (null)
// clashes with everyone, since it could land on any of them.
export const blocks = (v: Appointment, doctor: string | null): boolean =>
  v.doctor === null || doctor === null || v.doctor === doctor;

export const findConflict = (
  visits: Appointment[],
  day: string,
  time: string,
  doctor: string | null,
): Appointment | undefined => overlapping(visits, day, time).find((v) => blocks(v, doctor));
// A freed or booked time moves its open slot with it.
const withoutSlot = (slots: OpenSlot[], day: string, time: string) =>
  slots.filter((s) => slotKey(s.day, s.time) !== slotKey(day, time));

const change = (id: string, patch: Partial<Appointment>) =>
  set({ ...state, visits: state.visits.map((v) => (v.id === id ? { ...v, ...patch } : v)) });
const find = (id: string) => state.visits.find((v) => v.id === id);

// Puts a visit back exactly as it was (and its open slot, if its time was freed or taken).
function restore(before: Appointment, slots: OpenSlot[]) {
  set({ visits: state.visits.map((v) => (v.id === before.id ? before : v)), slots });
}

// Every action below shows an Undo message.
function step(id: string, patch: Partial<Appointment>, message: (v: Appointment) => string) {
  const before = find(id);
  if (!before) return;
  const slots = state.slots;
  change(id, patch);
  showUndo(message(before), () => restore(before, slots));
}

export const checkIn = (id: string) =>
  step(
    id,
    { status: 'Waiting', waitingSince: new Date().toISOString() },
    (v) => `${v.patient} checked in`,
  );

export const startExam = (id: string) =>
  step(id, { status: 'In exam' }, (v) => `Exam started for ${v.patient}`);

export const markNoShow = (id: string) =>
  step(id, { status: 'No-show' }, (v) => `${v.patient} marked as no-show`);

// Cancels a visit, frees its time, and remembers who cancelled and when (today, in Manila).
export function cancelVisit(id: string, by: 'patient' | 'clinic' | 'other') {
  const before = find(id);
  if (!before) return;
  const slots = state.slots;
  set({
    visits: state.visits.map((v) =>
      v.id === id ? { ...v, status: 'Cancelled', cancelledBy: by, cancelledOn: manilaToday() } : v,
    ),
    slots: [
      ...slots,
      { id: `free-${id}`, day: before.day, time: before.time, minutes: SLOT_MINUTES },
    ],
  });
  showUndo(`${before.patient}'s visit cancelled`, () => restore(before, slots));
}

// Back one step: Waiting to Booked, In exam to Waiting, Done to In exam.
export const undoCheckIn = (id: string) =>
  step(
    id,
    { status: 'Booked', waitingSince: undefined },
    (v) => `${v.patient} moved back to Booked`,
  );
export const undoStart = (id: string) =>
  step(id, { status: 'Waiting' }, (v) => `${v.patient} moved back to Waiting`);
export const reopenVisit = (id: string) =>
  step(id, { status: 'In exam' }, (v) => `${v.patient}'s visit reopened`);

// Puts a cancelled or missed visit back to Booked, taking its time back. Refused, with a message,
// if someone else has booked that time since.
export function restoreVisit(id: string) {
  const before = find(id);
  if (!before) return;
  const others = state.visits.filter((v) => v.id !== id);
  if (findConflict(others, before.day, before.time, before.doctor)) {
    showUndo(`${before.time} is taken now, so ${before.patient}'s visit can't be restored.`);
    return;
  }
  const slots = state.slots;
  set({
    visits: state.visits.map((v) =>
      v.id === id ? { ...v, status: 'Booked', cancelledBy: undefined, cancelledOn: undefined } : v,
    ),
    slots: withoutSlot(slots, before.day, before.time),
  });
  showUndo(`${before.patient}'s visit restored`, () => restore(before, slots));
}

export interface BookingInput {
  patient: string;
  patientId?: string;
  service: string;
  doctor: string | null;
  day: string;
  time: string;
}

// Books a new visit, or moves `reschedule` (its old time becomes open again).
export function saveBooking(input: BookingInput, reschedule?: string): Appointment | null {
  const others = state.visits.filter((v) => v.id !== reschedule);
  if (findConflict(others, input.day, input.time, input.doctor)) return null;
  const before = reschedule ? find(reschedule) : undefined;
  const slots = state.slots;
  let nextSlots = withoutSlot(slots, input.day, input.time);
  if (before) {
    nextSlots = [
      ...nextSlots,
      { id: `free-${before.id}`, day: before.day, time: before.time, minutes: SLOT_MINUTES },
    ];
  }
  const visit: Appointment = before
    ? { ...before, ...input, status: 'Booked' }
    : { id: `a-${Date.now()}`, ...input, status: 'Booked' };
  set({
    visits: before
      ? state.visits.map((v) => (v.id === before.id ? visit : v))
      : [...state.visits, visit],
    slots: nextSlots,
  });
  showUndo(before ? `${visit.patient}'s visit moved` : `Visit booked for ${visit.patient}`, () => {
    if (before) restore(before, slots);
    else set({ visits: state.visits.filter((v) => v.id !== visit.id), slots });
  });
  return visit;
}
