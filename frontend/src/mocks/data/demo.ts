import { dateToDay, dayToDate, manilaToday } from '@/lib/dates';
import { formatDocNo, plural } from '@/lib/format';
import type {
  Appointment,
  Branch,
  Exam,
  JobOrder,
  NextVisit,
  OpenSlot,
  PatientSummary,
  Receipt,
  Recall,
  Reading,
  Scan,
  StockItem,
  Visit,
  VisitStatus,
} from '@/types/clinic';

// Made-up people and records for trying the screens: every name and number here is invented. It is
// used only when the dev server runs with the mock switch on (see samples.ts); a real build never
// includes it. Every date is counted from today, so the screens look current whenever they open.

const JUN = 'Dr. Jun Bueza';
const DAISIE = 'Dr. Daisie Bueza';
const monthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const fullDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

// name, branch, days since the last visit, recall in N days from today (negative = overdue),
// balance, total visits
const PEOPLE: [string, Branch, number, number | null, number, number][] = [
  ['Maria Santos', 'Pasay', 0, 60, 0, 6],
  ['Jose Ramirez', 'Taguig', 1, -3, 0, 3],
  ['Ana Dela Cruz', 'Pasay', 3, 30, 1200, 8],
  ['Paolo Garcia', 'Taguig', 6, 0, 0, 2],
  ['Rosa Villanueva', 'Pasay', 9, -10, 3500, 11],
  ['Leo Santos', 'Taguig', 14, 7, 0, 1],
  ['Carmen Bautista', 'Pasay', 20, -21, 850, 5],
  ['Ben Aquino', 'Taguig', 28, null, 0, 4],
  ['Liza Mendoza', 'Pasay', 45, -35, 0, 7],
  ['Miguel Torres', 'Taguig', 80, 90, 2400, 9],
  ['Grace Navarro', 'Pasay', 120, null, 0, 2],
  ['Dino Castillo', 'Taguig', 200, -60, 0, 12],
  ['Pat Patient', 'Pasay', 30, null, 0, 10], // the signed-in test patient (patient@ocula.test)
];

export function buildDemo(now: Date = new Date()) {
  const today = manilaToday(now);
  const shift = (day: string, n: number) => {
    const d = dayToDate(day);
    d.setDate(d.getDate() + n);
    return dateToDay(d);
  };
  const fromToday = (n: number) => shift(today, n);
  const minutesAgo = (n: number) => new Date(now.getTime() - n * 60_000).toISOString();

  const patients: PatientSummary[] = PEOPLE.map(
    ([name, branch, ago, recall, balance, visits], i) => ({
      id: formatDocNo('P', 1001 + i),
      name,
      phone: `0917 555 ${String(101 + i).padStart(4, '0')}`,
      lastVisit: fromToday(-ago),
      nextRecall: recall === null ? null : fromToday(recall),
      branch,
      balance,
      visits,
    }),
  );
  const who = (i: number) => patients[i];

  // [patient index, time, service, doctor, status, extra] for today, then the days after.
  type Row = [number, string, string, string | null, VisitStatus, Partial<Appointment>?];
  const todayRows: Row[] = [
    [0, '9:00 AM', 'Annual eye exam', JUN, 'Done'],
    [1, '9:30 AM', 'Contact lens follow-up', DAISIE, 'Done'],
    [2, '10:00 AM', 'Eye exam', JUN, 'Done'],
    [3, '10:30 AM', 'Eye exam', DAISIE, 'In exam'],
    [4, '11:00 AM', 'Frame fitting', null, 'Waiting', { waitingSince: minutesAgo(18) }],
    [
      5,
      '11:30 AM',
      'Glasses pickup',
      null,
      'Waiting',
      { waitingSince: minutesAgo(6), note: 'JO #1038' },
    ],
    [6, '1:00 PM', 'Annual eye exam', JUN, 'Booked'],
    [7, '1:30 PM', 'Contact lens fitting', DAISIE, 'Booked'],
    [8, '2:00 PM', 'Eye exam', JUN, 'Booked'],
    [9, '2:30 PM', 'Frame fitting', null, 'Booked'],
    [10, '3:00 PM', 'Eye exam', DAISIE, 'No-show'],
    [
      11,
      '3:30 PM',
      'Glasses pickup',
      null,
      'Cancelled',
      { cancelledBy: 'patient', cancelledOn: fromToday(-1) },
    ],
  ];
  const laterRows: [number, Row[]][] = [
    [
      1,
      [
        [0, '9:00 AM', 'Contact lens follow-up', JUN, 'Booked'],
        [2, '10:00 AM', 'Frame fitting', DAISIE, 'Booked'],
        [5, '2:00 PM', 'Eye exam', JUN, 'Booked'],
      ],
    ],
    [
      2,
      [
        [1, '11:00 AM', 'Annual eye exam', DAISIE, 'Booked'],
        [4, '3:00 PM', 'Glasses pickup', null, 'Booked'],
      ],
    ],
    [
      3,
      [
        [3, '9:30 AM', 'Eye exam', JUN, 'Booked'],
        [6, '1:00 PM', 'Contact lens fitting', DAISIE, 'Booked'],
        [7, '4:00 PM', 'Eye exam', JUN, 'Booked'],
      ],
    ],
    [4, [[12, '10:00 AM', 'Annual eye exam', JUN, 'Booked']]],
    [
      5,
      [
        [8, '10:00 AM', 'Annual eye exam', DAISIE, 'Booked'],
        [9, '2:30 PM', 'Frame fitting', JUN, 'Booked'],
      ],
    ],
    [6, [[10, '11:00 AM', 'Eye exam', null, 'Booked']]],
  ];
  let n = 0;
  const visit = (day: string, [p, time, service, doctor, status, extra]: Row): Appointment => ({
    id: `demo-a${++n}`,
    patient: who(p).name,
    patientId: who(p).id,
    day,
    time,
    service,
    doctor,
    status,
    ...extra,
  });
  const agenda: Appointment[] = [
    // An earlier no-show, so today's no-show makes two for the same patient.
    visit(fromToday(-3), [10, '9:30 AM', 'Eye exam', DAISIE, 'No-show']),
    ...todayRows.map((r) => visit(today, r)),
    ...laterRows.flatMap(([offset, rows]) => rows.map((r) => visit(fromToday(offset), r))),
  ];
  const openSlots: OpenSlot[] = ['12:00 PM', '12:30 PM', '4:30 PM', '5:00 PM'].map((time, i) => ({
    id: `demo-s${i + 1}`,
    day: today,
    time,
    minutes: 30,
  }));

  const queue = agenda
    .filter((a) => a.day === today && a.status !== 'Cancelled' && a.status !== 'No-show')
    .map<Visit>((a) => ({
      id: `q-${a.id}`,
      time: a.time,
      patient: a.patient,
      service: a.service,
      status: a.status,
    }));

  const REASONS = [
    'Annual eye exam',
    'Contact lens follow-up',
    'Glasses check',
    'Annual eye exam',
    'Eye exam',
  ];
  const recalls: Recall[] = patients.flatMap((p, i) => {
    if (p.nextRecall === null) return [];
    const offset = Math.round((Date.parse(p.nextRecall) - Date.parse(today)) / 86_400_000);
    const late = -offset;
    return [
      {
        id: `demo-r${i + 1}`,
        patient: p.name,
        reason: REASONS[i % REASONS.length],
        due:
          offset < 0
            ? `${late < 7 ? plural(late, 'day') : plural(Math.floor(late / 7), 'week')} overdue`
            : offset === 0
              ? 'due today'
              : `due ${monthDay.format(dayToDate(p.nextRecall))}`,
        phone: p.phone,
        status:
          offset < 0
            ? ('Overdue' as const)
            : offset === 0
              ? ('Due today' as const)
              : ('Upcoming' as const),
      },
    ];
  });

  // patient index, items, pesos, status, days since issued
  const billRows: [number, string, number, Receipt['status'], number][] = [
    [0, 'Frame and single-vision lenses', 4800, 'Paid', 0],
    [1, 'Eye exam', 600, 'Paid', 1],
    [3, 'Contact lenses (3 months)', 2400, 'Paid', 2],
    [5, 'Blue-light lenses', 3500, 'Paid', 5],
    [4, 'Progressive lenses', 9800, 'Unpaid', 21],
    [9, 'Frame and transition lenses', 6200, 'Unpaid', 30],
    [6, 'Lens solution and case', 850, 'Unpaid', 8],
    [2, 'Eye exam and frame', 3100, 'Partial', 16],
    [7, 'Sunglasses (prescription)', 1900, 'Partial', 4],
    [8, 'Frame repair', 300, 'Partial', 12],
  ];
  const receipts: Receipt[] = billRows.map(([p, items, amount, status, ageDays], i) => ({
    id: formatDocNo('OR', 1101 + i),
    patient: who(p).name,
    items,
    amount,
    status,
    ageDays,
  }));

  // patient index, item, stage, promised in N days from today, running late
  const jobRows: [number, string, JobOrder['stage'], number, boolean?][] = [
    [0, 'Single-vision glasses', 'Ordered', 5],
    [1, 'Progressive glasses', 'Ordered', 7],
    [2, 'Blue-light glasses', 'Ordered', 4],
    [3, 'Single-vision glasses', 'In lab', 1],
    [4, 'Transition glasses', 'In lab', -2, true],
    [5, 'Sunglasses (prescription)', 'In lab', -1, true],
    [6, 'Progressive glasses', 'Ready', 0],
    [7, 'Single-vision glasses', 'Ready', 0],
    [8, 'Frame repair', 'Picked up', -3],
    [9, 'Contact lens order', 'Picked up', -4],
  ];
  const jobOrders: JobOrder[] = jobRows.map(([p, item, stage, due, delayed], i) => ({
    id: formatDocNo('JO', 1036 + i),
    patient: who(p).name,
    item,
    stage,
    due: due === 0 ? 'today' : due === 1 ? 'tomorrow' : monthDay.format(dayToDate(fromToday(due))),
    ...(delayed ? { delayed } : {}),
  }));

  const stock: StockItem[] = [
    ['FR-1001', 'Acetate round frame, black', 'Frames', 24, 10],
    ['FR-1002', 'Metal aviator frame, gold', 'Frames', 15, 8],
    ['FR-1003', 'Titanium rimless frame, silver', 'Frames', 4, 6],
    ['FR-1004', 'Kids flexible frame, blue', 'Frames', 0, 8],
    ['LN-2001', 'Single-vision lens 1.56 (pair)', 'Lenses', 40, 20],
    ['LN-2002', 'Progressive lens 1.60 (pair)', 'Lenses', 12, 5],
    ['LN-2003', 'Blue-light lens 1.56 (pair)', 'Lenses', 2, 5],
    ['CL-3001', 'Monthly clear contact lens, −2.00', 'Contact lenses', 30, 10],
    ['CL-3002', 'Daily disposable contact lens, 30 pack', 'Contact lenses', 18, 6],
    ['CL-3003', 'Toric monthly contact lens', 'Contact lenses', 0, 4],
    ['SO-4001', 'Multi-purpose solution, 360 ml', 'Solutions', 26, 8],
    ['SO-4002', 'Saline solution, 120 ml', 'Solutions', 9, 6],
  ].map(([sku, item, category, qty, min]) => ({ sku, item, category, qty, min }) as StockItem);

  const reading = (s: string, c: string, a: string): Reading => [s, c, a];
  const READINGS: [Reading, Reading][] = [
    [reading('-1.25', '-0.50', '180'), reading('-1.50', '-0.25', '175')],
    [reading('-2.00', '-0.75', '90'), reading('-2.25', '-0.50', '85')],
    [reading('+0.75', '-0.25', '10'), reading('+1.00', '-0.25', '170')],
    [reading('-3.50', '-1.00', '175'), reading('-3.25', '-1.25', '5')],
    [reading('-0.50', '0.00', '0'), reading('-0.75', '-0.25', '160')],
  ];
  const SCAN_TIMES = [
    '9:05 AM',
    '9:20 AM',
    '9:42 AM',
    '10:10 AM',
    '10:25 AM',
    '10:50 AM',
    '11:15 AM',
    '11:40 AM',
    '12:20 PM',
    '12:45 PM',
  ];
  const scans: Scan[] = SCAN_TIMES.map((time, i) => ({
    id: `SC-${String(101 + i).padStart(4, '0')}`,
    patient: who(i).name,
    time,
    od: READINGS[i % READINGS.length][0],
    os: READINGS[i % READINGS.length][1],
    status: i >= 6 ? 'Needs review' : 'Verified',
  }));

  // The test patient's own records: an exam every six months for five years.
  const [y, m, d] = today.split('-').map(Number);
  const DIAGNOSES = [
    'Mild myopia, stable since the last visit.',
    'Slight change in astigmatism; new lenses advised.',
    'Early presbyopia; reading add recommended.',
    'Myopia increased slightly in both eyes.',
    'Healthy eyes; no change in prescription.',
  ];
  const myExams: Exam[] = Array.from({ length: 10 }, (_, k) => {
    const [od, os] = READINGS[k % READINGS.length];
    return {
      id: `demo-e${k + 1}`,
      date: fullDate.format(new Date(y, m - 1 - 6 * (k + 1), d)),
      doctor: k % 2 === 0 ? JUN : DAISIE,
      branch: k % 3 === 0 ? 'Taguig' : 'Pasay',
      diagnosis: DIAGNOSES[k % DIAGNOSES.length],
      rx: [
        { eye: 'OD', reading: od },
        { eye: 'OS', reading: os },
      ],
      pd: `${62 + (k % 2)} mm`,
    };
  });
  const mine = agenda.find((a) => a.patient === 'Pat Patient')!;
  const mineDate = dayToDate(mine.day);
  const myNextVisit: NextVisit = {
    month: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(mineDate).toUpperCase(),
    day: String(mineDate.getDate()).padStart(2, '0'),
    when: `${new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(mineDate)} · ${mine.time}`,
    title: mine.service,
    branch: 'Pasay',
  };

  return {
    clinicClosesAt: '8:00 PM',
    unreadNotifications: 3,
    patients,
    recentPatients: [...patients].sort((a, b) => (a.lastVisit < b.lastVisit ? 1 : -1)).slice(0, 5),
    agenda,
    openSlots,
    todayQueue: queue,
    doctorSchedule: queue.map((v) => ({ ...v, id: `d-${v.id}` })),
    examinationsThisWeek: 23,
    recalls,
    receipts,
    jobOrders,
    stock,
    scans,
    myPatientNumber: patients[patients.length - 1].id,
    myNextVisit,
    myExams,
  };
}
