// The clinic's day-to-day records as the screens use them. The API phases will align these
// with the backend contract; until then the sample rows in src/mocks/data/samples.ts fill them.

export type Branch = 'Pasay' | 'Taguig';

export type VisitStatus =
  'Booked' | 'Waiting' | 'In exam' | 'Done' | 'No-show' | 'Cancelled' | 'In progress' | 'Upcoming';

export interface Visit {
  id: string;
  time: string;
  patient: string;
  service: string;
  status: VisitStatus;
}

export interface Appointment {
  id: string;
  patient: string;
  // The patient record's id ("P-001284"); missing for rows made before the record is saved.
  patientId?: string;
  // The Manila calendar day, "YYYY-MM-DD", and the time as the desk reads it, "5:45 PM".
  day: string;
  time: string;
  service: string;
  // null until a doctor is picked ("Any doctor").
  doctor: string | null;
  // Anything extra the desk wants to see under the service, e.g. "JO #1038".
  note?: string;
  status: VisitStatus;
  // When the patient was checked in (ISO); the wait time counts from here.
  waitingSince?: string;
  // For a cancelled visit: who cancelled it, and the day it was cancelled ("YYYY-MM-DD").
  cancelledBy?: 'patient' | 'clinic' | 'other';
  cancelledOn?: string;
}

// A free bookable gap in a day's schedule.
export interface OpenSlot {
  id: string;
  day: string;
  time: string;
  minutes: number;
}

export type RecallStatus = 'Overdue' | 'Due today' | 'Upcoming';

export interface Recall {
  id: string;
  patient: string;
  reason: string;
  // Said the way the desk says it: "3 weeks overdue", "due today", "due Dec 1".
  due: string;
  phone: string;
  status: RecallStatus;
}

export interface PatientSummary {
  // "P-001284"
  id: string;
  name: string;
  phone: string;
  // Calendar days as "YYYY-MM-DD" (Manila).
  lastVisit: string;
  // The next recall, or null when none is planned.
  nextRecall: string | null;
  branch: Branch;
  // Pesos still owed; 0 when nothing is due.
  balance: number;
  // Total visits to the clinic so far.
  visits: number;
}

export type ReceiptStatus = 'Paid' | 'Unpaid' | 'Partial';

export interface Receipt {
  id: string;
  patient: string;
  items: string;
  // Pesos, like the API's Decimal amounts; shown with formatPeso.
  amount: number;
  status: ReceiptStatus;
  // Days since the receipt was issued, for "oldest unpaid".
  ageDays: number;
}

export type JobStage = 'Ordered' | 'In lab' | 'Ready' | 'Picked up';

export interface JobOrder {
  id: string;
  patient: string;
  item: string;
  stage: JobStage;
  // "today", "Nov 28": when the lab promised it.
  due: string;
  // Running late at the lab.
  delayed?: boolean;
}

// One eye: sphere, cylinder, axis.
export type Reading = [sphere: string, cylinder: string, axis: string];

export interface Scan {
  id: string;
  patient: string;
  time: string;
  od: Reading;
  os: Reading;
  status: 'Needs review' | 'Verified';
}

export interface StockItem {
  sku: string;
  item: string;
  category: 'Frames' | 'Lenses' | 'Contact lenses' | 'Solutions';
  qty: number;
  // At or below this count the item needs restocking.
  min: number;
}

export interface Exam {
  id: string;
  date: string;
  doctor: string;
  branch: string;
  diagnosis: string;
  rx: { eye: string; reading: Reading }[];
  pd: string;
}

export interface NextVisit {
  month: string;
  day: string;
  when: string;
  title: string;
  branch: string;
}
