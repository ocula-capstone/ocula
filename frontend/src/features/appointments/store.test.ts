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
    {
      id: 'a2',
      patient: 'Rosa Villanueva',
      day: '2026-11-26',
      time: '8:00 AM',
      service: 'Eye exam',
      doctor: null,
      status: 'Done',
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
    act(() => toast.currentToast()!.undo?.());
    expect(result.current.visits[0].status).toBe('Booked');
    expect(result.current.visits[0].waitingSince).toBeUndefined();
  });

  it('frees the slot on cancel and refuses a double booking', async () => {
    const { store } = await load();
    const { renderHook, act } = await import('@testing-library/react');
    const { result } = renderHook(() => store.useAppointments());
    act(() => store.cancelVisit('a1', 'patient'));
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
    act(() => toast.currentToast()!.undo?.());
    expect(result.current.visits[0].status).toBe('Waiting');
  });

  it('marks a no-show, and Undo brings the visit back as Booked', async () => {
    const { store, toast } = await load();
    const { renderHook, act } = await import('@testing-library/react');
    const { result } = renderHook(() => store.useAppointments());
    act(() => store.markNoShow('a1'));
    expect(result.current.visits[0].status).toBe('No-show');
    act(() => toast.currentToast()!.undo?.());
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
    expect(result.current.visits).toHaveLength(2);
    expect(result.current.visits[0].time).toBe('7:45 PM');
    expect(result.current.slots.map((x) => x.time)).toEqual(['6:30 PM']);
    act(() => toast.currentToast()!.undo?.());
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

  it('records who cancelled and when, and Undo clears it', async () => {
    const { store, toast } = await load();
    const { renderHook, act } = await import('@testing-library/react');
    vi.setSystemTime(new Date('2026-11-25T04:00:00Z'));
    const { result } = renderHook(() => store.useAppointments());
    act(() => store.cancelVisit('a1', 'clinic'));
    expect(result.current.visits[0]).toMatchObject({
      status: 'Cancelled',
      cancelledBy: 'clinic',
      cancelledOn: '2026-11-25',
    });
    act(() => toast.currentToast()!.undo?.());
    expect(result.current.visits[0].status).toBe('Booked');
    expect(result.current.visits[0].cancelledBy).toBeUndefined();
  });

  it('undoes a check-in: back to Booked, wait cleared', async () => {
    const { store } = await load();
    const { renderHook, act } = await import('@testing-library/react');
    const { result } = renderHook(() => store.useAppointments());
    act(() => store.checkIn('a1'));
    act(() => store.undoCheckIn('a1'));
    expect(result.current.visits[0].status).toBe('Booked');
    expect(result.current.visits[0].waitingSince).toBeUndefined();
  });

  it('undoes starting an exam: back to Waiting', async () => {
    const { store } = await load();
    const { renderHook, act } = await import('@testing-library/react');
    const { result } = renderHook(() => store.useAppointments());
    act(() => store.checkIn('a1'));
    act(() => store.startExam('a1'));
    act(() => store.undoStart('a1'));
    expect(result.current.visits[0].status).toBe('Waiting');
  });

  it('reopens a finished visit: back in the exam room, and Undo finishes it again', async () => {
    const { store, toast } = await load();
    const { renderHook, act } = await import('@testing-library/react');
    const { result } = renderHook(() => store.useAppointments());
    act(() => store.reopenVisit('a2'));
    expect(result.current.visits.find((x) => x.id === 'a2')!.status).toBe('In exam');
    act(() => toast.currentToast()!.undo?.());
    expect(result.current.visits.find((x) => x.id === 'a2')!.status).toBe('Done');
  });

  it('restores a cancelled or missed visit to Booked, and takes its time back', async () => {
    const { store } = await load();
    const { renderHook, act } = await import('@testing-library/react');
    const { result } = renderHook(() => store.useAppointments());
    act(() => store.cancelVisit('a1', 'patient'));
    expect(result.current.slots.some((x) => x.time === '6:30 PM')).toBe(true);
    act(() => store.restoreVisit('a1'));
    expect(result.current.visits[0].status).toBe('Booked');
    expect(result.current.visits[0].cancelledBy).toBeUndefined();
    expect(result.current.slots.some((x) => x.time === '6:30 PM')).toBe(false);
  });

  it('will not restore a visit whose time someone else has taken since', async () => {
    const { store } = await load();
    const { renderHook, act } = await import('@testing-library/react');
    const { result } = renderHook(() => store.useAppointments());
    act(() => store.cancelVisit('a1', 'patient'));
    act(
      () =>
        void store.saveBooking({
          patient: 'Paolo',
          service: 'Eye exam',
          doctor: null,
          day: '2026-11-26',
          time: '6:30 PM',
        }),
    );
    act(() => store.restoreVisit('a1'));
    expect(result.current.visits.find((x) => x.id === 'a1')!.status).toBe('Cancelled');
  });

  it('does not open a slot when a reschedule keeps the same time (only the doctor changes)', async () => {
    const { store } = await load();
    const { renderHook, act } = await import('@testing-library/react');
    const { result } = renderHook(() => store.useAppointments());
    const before = result.current.slots.length;
    act(
      () =>
        void store.saveBooking(
          {
            patient: 'Ana Reyes',
            service: 'Eye exam',
            doctor: 'Dr. Jun Bueza',
            day: '2026-11-26',
            time: '6:30 PM',
          },
          'a1',
        ),
    );
    expect(result.current.visits[0].doctor).toBe('Dr. Jun Bueza');
    expect(result.current.slots).toHaveLength(before);
    expect(result.current.slots.some((x) => x.time === '6:30 PM')).toBe(false);
  });

  it('never leaves two open slots with the same id or time, however often a visit moves and cancels', async () => {
    const { store } = await load();
    const { renderHook, act } = await import('@testing-library/react');
    const { result } = renderHook(() => store.useAppointments());
    const move = (time: string) =>
      act(
        () =>
          void store.saveBooking(
            { patient: 'Ana Reyes', service: 'Eye exam', doctor: null, day: '2026-11-26', time },
            'a1',
          ),
      );
    move('9:00 AM');
    move('9:30 AM');
    act(() => store.cancelVisit('a1', 'patient'));
    act(() => store.cancelVisit('a1', 'patient'));
    const ids = result.current.slots.map((x) => x.id);
    const times = result.current.slots.map((x) => `${x.day} ${x.time}`);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(times).size).toBe(times.length);
  });

  it('does not open a second slot when a cancelled visit is moved', async () => {
    const { store } = await load();
    const { renderHook, act } = await import('@testing-library/react');
    const { result } = renderHook(() => store.useAppointments());
    act(() => store.cancelVisit('a1', 'clinic'));
    const slotsAfterCancel = result.current.slots.filter((x) => x.time === '6:30 PM').length;
    act(
      () =>
        void store.saveBooking(
          {
            patient: 'Ana Reyes',
            service: 'Eye exam',
            doctor: null,
            day: '2026-11-26',
            time: '9:00 AM',
          },
          'a1',
        ),
    );
    expect(slotsAfterCancel).toBe(1);
    expect(result.current.slots.filter((x) => x.time === '6:30 PM')).toHaveLength(1);
  });
});
