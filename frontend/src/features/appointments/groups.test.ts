import { describe, expect, it } from 'vitest';
import {
  cancelNote,
  canMarkNoShow,
  countNoShows,
  groupVisits,
  summaryLine,
} from '@/features/appointments/groups';
import type { Appointment, VisitStatus } from '@/types/clinic';

const TODAY = '2026-11-26';
const v = (
  id: string,
  time: string,
  status: VisitStatus,
  over: Partial<Appointment> = {},
): Appointment => ({
  id,
  patient: `Patient ${id}`,
  day: TODAY,
  time,
  service: 'Eye exam',
  doctor: null,
  status,
  ...over,
});
const ids = (rows: Appointment[]) => rows.map((r) => r.id);

describe('groupVisits', () => {
  const visits = [
    v('booked-late', '3:00 PM', 'Booked'),
    v('booked-early', '1:00 PM', 'Booked'),
    v('exam', '10:30 AM', 'In exam'),
    v('wait-new', '11:00 AM', 'Waiting', { waitingSince: '2026-11-26T03:10:00Z' }),
    v('wait-old', '11:30 AM', 'Waiting', { waitingSince: '2026-11-26T02:50:00Z' }),
    v('done-b', '9:30 AM', 'Done'),
    v('done-a', '9:00 AM', 'Done'),
    v('gone-b', '12:30 PM', 'Cancelled'),
    v('gone-a', '9:30 AM', 'No-show'),
  ];
  const groups = groupVisits(visits, TODAY, TODAY);

  it('has five groups in order: needs attention, in exam, later today, done, not attending', () => {
    expect(groups.map((g) => g.title)).toEqual([
      'Needs attention now',
      'In exam',
      'Later today',
      'Done',
      'Not attending',
    ]);
  });

  it('needs attention is for waiting patients only, whoever has waited longest first', () => {
    expect(ids(groups[0].visits)).toEqual(['wait-old', 'wait-new']);
    expect(groups[0].visits.every((x) => x.status === 'Waiting')).toBe(true);
  });

  it('done is for done patients only; in exam has only those in the exam room', () => {
    expect(ids(groups[1].visits)).toEqual(['exam']);
    expect(groups[3].visits.every((x) => x.status === 'Done')).toBe(true);
  });

  it('lists the others by time: booked, done, then cancelled and no-show together', () => {
    expect(ids(groups[2].visits)).toEqual(['booked-early', 'booked-late']);
    expect(ids(groups[3].visits)).toEqual(['done-a', 'done-b']);
    expect(ids(groups[4].visits)).toEqual(['gone-a', 'gone-b']);
  });

  it('leaves out a group with nothing in it', () => {
    expect(groupVisits([v('x', '1:00 PM', 'Booked')], TODAY, TODAY).map((g) => g.title)).toEqual([
      'Later today',
    ]);
  });

  it('calls the booked group "Scheduled" on a day that is not today', () => {
    const next = groupVisits(
      [v('x', '1:00 PM', 'Booked', { day: '2026-11-27' })],
      '2026-11-27',
      TODAY,
    );
    expect(next.map((g) => g.title)).toEqual(['Scheduled']);
  });
});

describe('summaryLine', () => {
  it('says how many visits there are, and how many did not happen only when some did not', () => {
    expect(summaryLine(11, 2, 'today')).toBe(
      'Showing all 11 visits today, plus 2 that did not happen.',
    );
    expect(summaryLine(11, 0, 'today')).toBe('Showing all 11 visits today.');
    expect(summaryLine(1, 0, 'on Fri, Nov 27')).toBe('Showing all 1 visit on Fri, Nov 27.');
  });
});

describe('countNoShows', () => {
  it('counts one patient’s no-shows across every day, by record id', () => {
    const all = [
      v('1', '9:00 AM', 'No-show', { patientId: 'P-1', day: '2026-11-20' }),
      v('2', '9:00 AM', 'No-show', { patientId: 'P-1' }),
      v('3', '9:00 AM', 'No-show', { patientId: 'P-2' }),
      v('4', '9:00 AM', 'Done', { patientId: 'P-1' }),
    ];
    expect(countNoShows(all, all[1])).toBe(2);
    expect(countNoShows(all, all[2])).toBe(1);
  });

  it('falls back to the name when a visit has no record id', () => {
    const all = [
      v('1', '9:00 AM', 'No-show', { patient: 'Ana' }),
      v('2', '9:00 AM', 'No-show', { patient: 'Ana' }),
    ];
    expect(countNoShows(all, all[0])).toBe(2);
  });
});

describe('canMarkNoShow', () => {
  // 3:00 PM in Manila.
  const now = new Date('2026-11-26T07:00:00Z');
  it('is offered from 15 minutes after the visit starts, and not before', () => {
    expect(canMarkNoShow(v('a', '2:45 PM', 'Booked'), now)).toBe(true);
    expect(canMarkNoShow(v('b', '2:46 PM', 'Booked'), now)).toBe(false);
    expect(canMarkNoShow(v('c', '4:00 PM', 'Booked'), now)).toBe(false);
  });
  it('is always offered for an earlier day, never for a later one', () => {
    expect(canMarkNoShow(v('d', '9:00 PM', 'Booked', { day: '2026-11-25' }), now)).toBe(true);
    expect(canMarkNoShow(v('e', '9:00 AM', 'Booked', { day: '2026-11-27' }), now)).toBe(false);
  });
});

describe('cancelNote', () => {
  it('says who cancelled and when', () => {
    expect(
      cancelNote(
        v('a', '1:00 PM', 'Cancelled', { cancelledBy: 'patient', cancelledOn: '2026-11-25' }),
      ),
    ).toBe('Cancelled by patient, Nov 25');
    expect(
      cancelNote(
        v('b', '1:00 PM', 'Cancelled', { cancelledBy: 'clinic', cancelledOn: '2026-11-25' }),
      ),
    ).toBe('Cancelled by clinic, Nov 25');
    expect(
      cancelNote(
        v('c', '1:00 PM', 'Cancelled', { cancelledBy: 'other', cancelledOn: '2026-11-25' }),
      ),
    ).toBe('Cancelled, Nov 25');
  });
  it('still reads when the date or the reason is missing', () => {
    expect(cancelNote(v('d', '1:00 PM', 'Cancelled', { cancelledBy: 'patient' }))).toBe(
      'Cancelled by patient',
    );
    expect(cancelNote(v('e', '1:00 PM', 'Cancelled'))).toBe('Cancelled');
  });
});
