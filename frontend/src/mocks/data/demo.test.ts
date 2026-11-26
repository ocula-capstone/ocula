import { describe, expect, it } from 'vitest';
import { minutesOf } from '@/features/appointments/days';
import { recallStatus } from '@/features/patients/format';
import { buildDemo } from '@/mocks/data/demo';

// Thursday 26 Nov 2026, 3:00 PM in Manila.
const NOW = new Date('2026-11-26T07:00:00Z');
const TODAY = '2026-11-26';
const demo = buildDemo(NOW);
const daysAgo = (day: string) => Math.round((Date.parse(TODAY) - Date.parse(day)) / 86_400_000);
const distinct = <T>(rows: T[], pick: (r: T) => unknown) => new Set(rows.map(pick)).size;

describe('demo data: enough to fill every screen', () => {
  it('has at least 10 rows for every list screen', () => {
    const counts = {
      patients: demo.patients.length,
      agenda: demo.agenda.length,
      recalls: demo.recalls.length,
      receipts: demo.receipts.length,
      jobOrders: demo.jobOrders.length,
      stock: demo.stock.length,
      scans: demo.scans.length,
      todayQueue: demo.todayQueue.length,
      doctorSchedule: demo.doctorSchedule.length,
      myExams: demo.myExams.length,
    };
    for (const [name, n] of Object.entries(counts)) expect(n, name).toBeGreaterThanOrEqual(10);
  });

  it('gives every patient a total visit count, and the test patient one per exam on file', () => {
    expect(demo.patients.every((x) => Number.isInteger(x.visits) && x.visits >= 1)).toBe(true);
    const mine = demo.patients.find((x) => x.id === demo.myPatientNumber)!;
    expect(mine.visits).toBe(demo.myExams.length);
  });

  it('uses unique ids', () => {
    for (const [name, ids] of Object.entries({
      patients: demo.patients.map((p) => p.id),
      agenda: demo.agenda.map((a) => a.id),
      receipts: demo.receipts.map((r) => r.id),
      jobOrders: demo.jobOrders.map((j) => j.id),
      stock: demo.stock.map((s) => s.sku),
      scans: demo.scans.map((s) => s.id),
    })) {
      expect(new Set(ids).size, name).toBe(ids.length);
    }
  });

  it('only mentions patients that exist', () => {
    const byId = new Map(demo.patients.map((p) => [p.id, p.name]));
    const names = new Set(byId.values());
    for (const a of demo.agenda) expect(byId.get(a.patientId ?? ''), a.id).toBe(a.patient);
    for (const r of demo.recalls) expect(names.has(r.patient), r.id).toBe(true);
    for (const r of demo.receipts) expect(names.has(r.patient), r.id).toBe(true);
    for (const j of demo.jobOrders) expect(names.has(j.patient), j.id).toBe(true);
    for (const s of demo.scans) expect(names.has(s.patient), s.id).toBe(true);
  });
});

describe('demo data: every filter has something to find', () => {
  it('patients: both branches, every status and every last-visit range', () => {
    const p = demo.patients;
    expect(distinct(p, (x) => x.branch)).toBe(2);
    expect(p.some((x) => recallStatus(x.nextRecall, TODAY).tone === 'overdue')).toBe(true);
    expect(p.some((x) => recallStatus(x.nextRecall, TODAY).tone === 'today')).toBe(true);
    expect(p.some((x) => x.balance > 0)).toBe(true);
    expect(p.some((x) => x.nextRecall === null)).toBe(true);
    const ago = p.map((x) => daysAgo(x.lastVisit));
    expect(ago.some((d) => d === 0)).toBe(true);
    expect(ago.some((d) => d > 0 && d <= 7)).toBe(true);
    expect(ago.some((d) => d > 7 && d <= 30)).toBe(true);
    expect(ago.some((d) => d > 30)).toBe(true);
    expect(ago.every((d) => d >= 0)).toBe(true);
  });

  it('appointments: several days, both doctors, and every status', () => {
    const a = demo.agenda;
    expect(distinct(a, (x) => x.day)).toBeGreaterThanOrEqual(4);
    // From today on, plus history that matters to the desk: earlier no-shows.
    expect(a.filter((x) => x.day < TODAY).every((x) => x.status === 'No-show')).toBe(true);
    expect(new Set(a.map((x) => x.doctor))).toEqual(
      new Set(['Dr. Jun Bueza', 'Dr. Daisie Bueza', null]),
    );
    for (const status of ['Booked', 'Waiting', 'In exam', 'Done', 'No-show', 'Cancelled']) {
      expect(
        a.some((x) => x.status === status),
        status,
      ).toBe(true);
    }
    expect(a.filter((x) => x.status === 'Waiting').every((x) => x.waitingSince)).toBe(true);
    expect(distinct(a, (x) => x.service)).toBeGreaterThanOrEqual(4);
  });

  it('appointments: one patient has missed twice, and a cancelled visit says who and when', () => {
    const a = demo.agenda;
    const missed = a.filter((x) => x.status === 'No-show');
    const twice = missed.filter(
      (x) => missed.filter((y) => y.patientId === x.patientId).length >= 2,
    );
    expect(twice.length).toBeGreaterThanOrEqual(2);
    const cancelled = a.find((x) => x.status === 'Cancelled')!;
    expect(cancelled.cancelledBy).toBeTruthy();
    expect(cancelled.cancelledOn! < TODAY || cancelled.cancelledOn === TODAY).toBe(true);
  });

  it('appointments: no two visits on a day are closer than the 30 minutes a visit takes', () => {
    for (const day of new Set(demo.agenda.map((a) => a.day))) {
      const mins = demo.agenda
        .filter((a) => a.day === day && !['Cancelled', 'No-show'].includes(a.status))
        .map((a) => minutesOf(a.time))
        .sort((x, y) => x - y);
      mins
        .slice(1)
        .forEach((m, i) => expect(m - mins[i], `${day} ${m}`).toBeGreaterThanOrEqual(30));
    }
  });

  it('the front desk queue is today’s visits, and open slots are free times today', () => {
    const today = demo.agenda.filter((a) => a.day === TODAY);
    expect(demo.todayQueue.map((v) => v.patient).sort()).toEqual(
      today
        .filter((a) => !['Cancelled', 'No-show'].includes(a.status))
        .map((a) => a.patient)
        .sort(),
    );
    expect(demo.openSlots.length).toBeGreaterThan(0);
    const taken = new Set(today.map((a) => a.time));
    for (const s of demo.openSlots) expect(taken.has(s.time), s.time).toBe(false);
  });

  it('recalls: every status', () => {
    expect(new Set(demo.recalls.map((r) => r.status))).toEqual(
      new Set(['Overdue', 'Due today', 'Upcoming']),
    );
  });

  it('billing: every status, with some owed for a while', () => {
    expect(new Set(demo.receipts.map((r) => r.status))).toEqual(
      new Set(['Paid', 'Unpaid', 'Partial']),
    );
    expect(demo.receipts.some((r) => r.status !== 'Paid' && r.ageDays >= 14)).toBe(true);
  });

  it('job orders: every stage, and something running late', () => {
    expect(new Set(demo.jobOrders.map((j) => j.stage))).toEqual(
      new Set(['Ordered', 'In lab', 'Ready', 'Picked up']),
    );
    expect(demo.jobOrders.some((j) => j.delayed)).toBe(true);
  });

  it('inventory: every category, and stock that is out, low and fine', () => {
    expect(distinct(demo.stock, (s) => s.category)).toBe(4);
    expect(demo.stock.some((s) => s.qty === 0)).toBe(true);
    expect(demo.stock.some((s) => s.qty > 0 && s.qty <= s.min)).toBe(true);
    expect(demo.stock.some((s) => s.qty > s.min)).toBe(true);
  });

  it('auto-refractor: scans that need review and scans that are verified', () => {
    expect(new Set(demo.scans.map((s) => s.status))).toEqual(new Set(['Needs review', 'Verified']));
  });
});
