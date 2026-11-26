// shortcut: the data each screen shows until its API exists. It is empty in a real build. Run the dev
// server with VITE_USE_MOCKS=true (the same switch as the mock API) and demo.ts fills every screen
// with made-up patients, visits, bills, job orders, stock and scans you can filter and click through.
// Each feature phase replaces its block with an api/ call, a query hook and an MSW handler.
import { buildDemo } from '@/mocks/data/demo';
import type {
  Appointment,
  Exam,
  JobOrder,
  JobStage,
  NextVisit,
  OpenSlot,
  PatientSummary,
  Receipt,
  Recall,
  Scan,
  StockItem,
  Visit,
} from '@/types/clinic';

// Fake rows only while developing with mocks on. In a production build `import.meta.env.DEV` is
// false, so this is always null and the demo module is dropped from the bundle.
const demo = import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true' ? buildDemo() : null;

// Front desk: today's visits at the current branch.
export const todayQueue: Visit[] = demo?.todayQueue ?? [];

// Optometrist: today's schedule.
export const doctorSchedule: Visit[] = demo?.doctorSchedule ?? [];
export const examinationsThisWeek = demo?.examinationsThisWeek ?? 0;

export const recalls: Recall[] = demo?.recalls ?? [];

// Front desk header: "Clinic open until 8:00 PM". null hides it until the branch hours are known.
export const clinicClosesAt: string | null = demo?.clinicClosesAt ?? null;

// How many notifications the signed-in person has not opened. 0 hides the dot on the bell.
export const unreadNotifications = demo?.unreadNotifications ?? 0;

export const patients: PatientSummary[] = demo?.patients ?? [];
export const recentPatients: PatientSummary[] = demo?.recentPatients ?? [];

// Appointments page: every booked visit (each carries its own day) and the free gaps between them.
export const agenda: Appointment[] = demo?.agenda ?? [];
export const openSlots: OpenSlot[] = demo?.openSlots ?? [];
// The optometrists who can be booked, by full name.
export const doctors: string[] = ['Dr. Jun Bueza', 'Dr. Daisie Bueza'];

export const receipts: Receipt[] = demo?.receipts ?? [];

// The job-order board's columns, left to right. Not sample data: this is how the board works.
export const jobStages: JobStage[] = ['Ordered', 'In lab', 'Ready', 'Picked up'];
export const jobOrders: JobOrder[] = demo?.jobOrders ?? [];

export const scans: Scan[] = demo?.scans ?? [];

export const stock: StockItem[] = demo?.stock ?? [];

// The signed-in patient's own records. null means none yet.
export const myPatientNumber: string | null = demo?.myPatientNumber ?? null;
export const myNextVisit: NextVisit | null = demo?.myNextVisit ?? null;
export const myExams: Exam[] = demo?.myExams ?? [];
