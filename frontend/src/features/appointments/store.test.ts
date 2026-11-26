import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/mocks/data/samples', () => ({
  agenda: [
    {
      id: 'a1',
      patient: 'Ana Reyes',
      day: '2026-11-26',
      time: '6:30 PM',
      service: 'Eye exam',
      doctor: null,
      status: 'Booked',
    },
  ],
  openSlots: [{ id: 's1', day: '2026-11-26', time: '7:45 PM', minutes: 30 }],
}));

const load = async () => {
  vi.resetModules();
  const store = await import('@/features/appointments/store');
  const toast = await import('@/lib/undoToast');
  return { store, toast };
};

describe('appointments store', () => {
  beforeEach(() => vi.useFakeTimers());

  it('checks in, starts the wait, and Undo puts the visit back', async () => {
    const { store, toast } = await load();
    const { renderHook, act } = await import('@testing-library/react');
    const { result } = renderHook(() => store.useAppointments());
    act(() => store.checkIn('a1'));
    expect(result.current.visits[0].status).toBe('Waiting');
    expect(result.current.visits[0].waitingSince).toBeTruthy();
    act(() => toast.currentToast()!.undo());
    expect(result.current.visits[0].status).toBe('Booked');
    expect(result.current.visits[0].waitingSince).toBeUndefined();
  });

  it('frees the slot on cancel and refuses a double booking', async () => {
    const { store } = await load();
    const { renderHook, act } = await import('@testing-library/react');
    const { result } = renderHook(() => store.useAppointments());
    act(() => store.cancelVisit('a1'));
    expect(result.current.visits[0].status).toBe('Cancelled');
    expect(result.current.slots.some((s) => s.time === '6:30 PM')).toBe(true);
    const input = {
      patient: 'Paolo',
      service: 'Eye exam',
      doctor: null,
      day: '2026-11-26',
      time: '7:45 PM',
    };
    act(() => void store.saveBooking(input));
    expect(result.current.slots.some((s) => s.time === '7:45 PM')).toBe(false);
    expect(store.saveBooking({ ...input, patient: 'Rosa' })).toBeNull();
  });

  it('starts an exam after a check-in, and Undo goes back to Waiting', async () => {
    const { store, toast } = await load();
    const { renderHook, act } = await import('@testing-library/react');
    const { result } = renderHook(() => store.useAppointments());
    act(() => store.checkIn('a1'));
    act(() => store.startExam('a1'));
    expect(result.current.visits[0].status).toBe('In exam');
    act(() => toast.currentToast()!.undo());
    expect(result.current.visits[0].status).toBe('Waiting');
  });

  it('marks a no-show, and Undo brings the visit back as Booked', async () => {
    const { store, toast } = await load();
    const { renderHook, act } = await import('@testing-library/react');
    const { result } = renderHook(() => store.useAppointments());
    act(() => store.markNoShow('a1'));
    expect(result.current.visits[0].status).toBe('No-show');
    act(() => toast.currentToast()!.undo());
    expect(result.current.visits[0].status).toBe('Booked');
  });

  it('moves a visit to a new time, freeing its old one, and Undo puts both back', async () => {
    const { store, toast } = await load();
    const { renderHook, act } = await import('@testing-library/react');
    const { result } = renderHook(() => store.useAppointments());
    const move = {
      patient: 'Ana Reyes',
      service: 'Eye exam',
      doctor: null,
      day: '2026-11-26',
      time: '7:45 PM',
    };
    act(() => void store.saveBooking(move, 'a1'));
    expect(result.current.visits).toHaveLength(1);
    expect(result.current.visits[0].time).toBe('7:45 PM');
    expect(result.current.slots.map((x) => x.time)).toEqual(['6:30 PM']);
    act(() => toast.currentToast()!.undo());
    expect(result.current.visits[0].time).toBe('6:30 PM');
    expect(result.current.slots.map((x) => x.time)).toEqual(['7:45 PM']);
  });

  it('does not let a new booking take a time another visit already has', async () => {
    const { store } = await load();
    const clash = {
      patient: 'Paolo',
      service: 'Eye exam',
      doctor: null,
      day: '2026-11-26',
      time: '6:30 PM',
    };
    expect(store.saveBooking(clash)).toBeNull();
  });
});
