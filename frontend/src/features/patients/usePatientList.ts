import { useMemo, useState } from 'react';
import type { MenuOption } from '@/components/common/OptionMenu';
import { daysSince, formatDayRange, recallStatus } from '@/features/patients/format';
import { matchesSearch } from '@/lib/search';
import type { PatientSummary } from '@/types/clinic';

export const PAGE_SIZES = [10, 25, 50, 100];

const BRANCHES = ['Pasay', 'Taguig'];
// Each multi-select filter has an explicit "all" choice. It replaces the specific picks, and a
// specific pick drops it. Picking it and picking nothing both mean no limit.
const ALL_BRANCHES = 'all';
const ANY_STATUS = 'any';
const ANY_TIME = 'any';

// Status choices. A patient matches a filter with several picks if they fit any of them.
const STATUSES: {
  value: string;
  label: string;
  test: (p: PatientSummary, today: string) => boolean;
}[] = [
  {
    value: 'overdue',
    label: 'Overdue recall',
    test: (p, today) => recallStatus(p.nextRecall, today).tone === 'overdue',
  },
  {
    value: 'today',
    label: 'Due today',
    test: (p, today) => recallStatus(p.nextRecall, today).tone === 'today',
  },
  { value: 'balance', label: 'Has balance', test: (p) => p.balance > 0 },
];

// Quick choices for Last visit: how many days ago the last visit may be.
export const VISIT_PRESETS: { value: string; label: string; test: (days: number) => boolean }[] = [
  { value: ANY_TIME, label: 'Any time', test: () => true },
  { value: 'today', label: 'Today', test: (d) => d === 0 },
  { value: '7', label: 'Last 7 days', test: (d) => d <= 7 },
  { value: '30', label: 'Last 30 days', test: (d) => d <= 30 },
];

// Days are "YYYY-MM-DD" and dates are ISO text, so plain text order is date order.
const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const names = new Intl.Collator('en');

// How the list can be ordered. Ties keep the order they came in.
const SORTS: Record<string, (a: PatientSummary, b: PatientSummary) => number> = {
  'Recently visited': (a, b) => byText(b.lastVisit, a.lastVisit),
  'Name A–Z': (a, b) => names.compare(a.name, b.name),
  'Highest balance': (a, b) => b.balance - a.balance,
  'Next recall': (a, b) => byText(a.nextRecall ?? '9999', b.nextRecall ?? '9999'),
};
const SORT_OPTIONS: MenuOption[] = Object.keys(SORTS).map((name) => ({ value: name, label: name }));

const NO_RANGE = { from: '', to: '' };

// "Nothing picked", one pick, or how many were picked.
const summarize = (labels: string[]): string | null =>
  labels.length === 0 ? null : labels.length === 1 ? labels[0] : `${labels.length} selected`;

// Everything the patient list does: search, filters, sorting and paging. The page only draws it.
// Filters start empty (nothing is pre-picked); within one filter the picks are "any of these" and
// the filters then narrow each other.
export function usePatientList(patients: PatientSummary[], q: string, today: string) {
  const [branches, setBranches] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [visitPicks, setVisitPicks] = useState<string[]>([]);
  // A range picked on the calendar, as "YYYY-MM-DD"; "" means that end is open.
  const [range, setRange] = useState(NO_RANGE);
  // Sorts picked, in the order they were ticked: the first leads, the next ones break ties.
  const [sorts, setSorts] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(0);

  // Every change of filter, sort or page size starts again from the first page.
  const change =
    <T>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(0);
    };

  // A new search from the top bar starts again from the first page too.
  const [pageQ, setPageQ] = useState(q);
  if (pageQ !== q) {
    setPageQ(q);
    setPage(0);
  }

  const found = useMemo(
    () => patients.filter((p) => matchesSearch(q, p.name, p.id, p.phone)),
    [patients, q],
  );

  const branchOptions = useMemo<MenuOption[]>(
    () => [
      { value: ALL_BRANCHES, label: 'All branches', count: found.length },
      ...BRANCHES.map((b) => ({
        value: b,
        label: b,
        count: found.filter((p) => p.branch === b).length,
      })),
    ],
    [found],
  );
  const statusOptions = useMemo<MenuOption[]>(
    () =>
      STATUSES.map(({ value, label, test }) => ({
        value,
        label,
        count: found.filter((p) => test(p, today)).length,
      })),
    [found, today],
  );

  const hasRange = range.from !== '';
  // A quick choice or the calendar range that fits keeps the patient. "Any time", or nothing
  // picked, keeps everyone.
  const visitOk = (day: string) =>
    (visitPicks.length === 0 && !hasRange) ||
    visitPicks.includes(ANY_TIME) ||
    (hasRange && day >= range.from && (!range.to || day <= range.to)) ||
    visitPicks.some((v) => VISIT_PRESETS.find((w) => w.value === v)?.test(daysSince(day, today)));

  const rows = useMemo(
    () =>
      found
        .filter(
          (p) =>
            branches.length === 0 || branches.includes(ALL_BRANCHES) || branches.includes(p.branch),
        )
        .filter(
          (p) =>
            statuses.length === 0 ||
            statuses.includes(ANY_STATUS) ||
            STATUSES.some((s) => statuses.includes(s.value) && s.test(p, today)),
        )
        .filter((p) => visitOk(p.lastVisit))
        // Newest visit is the last tiebreak, so the order is steady even with nothing picked.
        .sort((a, b) => {
          for (const name of [...sorts, 'Recently visited']) {
            const order = SORTS[name](a, b);
            if (order) return order;
          }
          return 0;
        }),
    // visitOk reads visitPicks and range, both listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [found, branches, statuses, visitPicks, range, sorts, today],
  );

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const shown = rows.slice(current * pageSize, (current + 1) * pageSize);

  // Ticking the "all" choice clears the specific picks; ticking a specific one drops "all".
  const withAll =
    (selected: string[], all: string, set: (v: string[]) => void) => (next: string[]) =>
      change(set)(
        next.includes(all) && !selected.includes(all) ? [all] : next.filter((v) => v !== all),
      );

  const pickedStatuses = statusOptions.filter((o) => statuses.includes(o.value));
  const visitLabels = [
    ...visitPicks.map((v) => VISIT_PRESETS.find((w) => w.value === v)?.label ?? v),
    ...(hasRange ? [formatDayRange(range.from, range.to, today)] : []),
  ];

  return {
    shown,
    total: rows.length,
    page: current,
    pageCount,
    pageSize,
    setPage,
    setPageSize: change(setPageSize),

    filtering: branches.length > 0 || statuses.length > 0 || visitPicks.length > 0 || hasRange,
    clearAll: () => {
      setBranches([]);
      setStatuses([]);
      setVisitPicks([]);
      setRange(NO_RANGE);
      setPage(0);
    },

    branch: {
      // Two or three names fit on the button, so they are listed rather than counted.
      summary: branches.includes(ALL_BRANCHES)
        ? 'All branches'
        : BRANCHES.filter((b) => branches.includes(b)).join(', ') || null,
      active: branches.length > 0 && !branches.includes(ALL_BRANCHES),
      options: branchOptions,
      selected: branches,
      onChange: withAll(branches, ALL_BRANCHES, setBranches),
    },
    status: {
      summary: statuses.includes(ANY_STATUS)
        ? 'Any status'
        : summarize(pickedStatuses.map((o) => (o.count ? `${o.label} · ${o.count}` : o.label))),
      active: statuses.length > 0 && !statuses.includes(ANY_STATUS),
      options: [{ value: ANY_STATUS, label: 'Any status' }, ...statusOptions],
      selected: statuses,
      onChange: withAll(statuses, ANY_STATUS, setStatuses),
    },
    visit: {
      summary: visitPicks.includes(ANY_TIME) ? 'Any time' : summarize(visitLabels),
      active: hasRange || (visitPicks.length > 0 && !visitPicks.includes(ANY_TIME)),
      presets: VISIT_PRESETS,
      picks: visitPicks,
      from: range.from,
      to: range.to,
      onPicks: (next: string[]) => {
        withAll(visitPicks, ANY_TIME, setVisitPicks)(next);
        // "Any time" replaces the calendar range too.
        if (next.includes(ANY_TIME) && !visitPicks.includes(ANY_TIME)) setRange(NO_RANGE);
      },
      onRange: (from: string, to: string) => {
        setRange({ from, to });
        setVisitPicks(visitPicks.filter((v) => v !== ANY_TIME));
        setPage(0);
      },
    },
    sort: {
      summary: summarize(sorts),
      options: SORT_OPTIONS,
      selected: sorts,
      onChange: change(setSorts),
    },
  };
}
