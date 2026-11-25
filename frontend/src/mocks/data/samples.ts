// shortcut: the data each screen shows until its API exists. Empty on purpose: add your own dummy
// rows here to see the screens filled in. Each feature phase replaces its block with an api/ call,
// a query hook and an MSW handler, then deletes it here.
import type {
  Appointment,
  Exam,
  JobOrder,
  JobStage,
  NextVisit,
  PatientSummary,
  Receipt,
  Recall,
  Scan,
  StockItem,
  Visit,
} from '@/types/clinic';

// Front desk: today's visits at the current branch.
export const todayQueue: Visit[] = [];

// Optometrist: today's schedule.
export const doctorSchedule: Visit[] = [];
export const examinationsThisWeek = 0;

export const recalls: Recall[] = [];

export const patients: PatientSummary[] = [];
export const recentPatients: PatientSummary[] = [];

// Appointments page: one entry per day, today first.
export const agenda: { day: string; today: boolean; items: Appointment[] }[] = [];

export const receipts: Receipt[] = [];

// The job-order board's columns, left to right. Not sample data: this is how the board works.
export const jobStages: JobStage[] = ['Ordered', 'In lab', 'Ready', 'Picked up'];
export const jobOrders: JobOrder[] = [];

export const scans: Scan[] = [];

export const stock: StockItem[] = [];

// The signed-in patient's own records. null means none yet.
export const myPatientNumber: string | null = null;
export const myNextVisit: NextVisit | null = null;
export const myExams: Exam[] = [];
