import { afterEach, describe, expect, it, vi } from 'vitest';

// The screens import samples.ts directly, so what is in it reaches every build. Fake patients must
// show only when the dev server runs with the mock switch on (the same one as the mock API).
const load = async () => {
  vi.resetModules();
  return import('@/mocks/data/samples');
};

describe('samples', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('are empty without the mock switch, so a real build never shows fake patients', async () => {
    const s = await load();
    for (const rows of [
      s.patients,
      s.agenda,
      s.recalls,
      s.receipts,
      s.jobOrders,
      s.stock,
      s.scans,
    ]) {
      expect(rows).toHaveLength(0);
    }
    expect(s.todayQueue).toHaveLength(0);
    expect(s.myExams).toHaveLength(0);
    expect(s.myPatientNumber).toBeNull();
  });

  it('are filled when the mock switch is on', async () => {
    vi.stubEnv('VITE_USE_MOCKS', 'true');
    const s = await load();
    for (const rows of [
      s.patients,
      s.agenda,
      s.recalls,
      s.receipts,
      s.jobOrders,
      s.stock,
      s.scans,
    ]) {
      expect(rows.length).toBeGreaterThanOrEqual(10);
    }
  });
});
