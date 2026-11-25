// The clinic's day-to-day records as the screens use them. The API phases will align these
// with the backend contract; until then the sample rows in src/mocks/data/samples.ts fill them.

export type Branch = 'Pasay' | 'Taguig';

export type VisitStatus =
  'Checked in' | 'Waiting' | 'Not arrived' | 'Booked' | 'Done' | 'In progress' | 'Upcoming';

export interface Visit {
  id: string;
  time: string;
  patient: string;
  service: string;
  status: VisitStatus;
}

export interface Appointment {
  id: string;
  time: string;
  patient: string;
  // Service and doctor, e.g. "Annual exam · Dr. Olivia Optometrist".
  detail: string;
  status: VisitStatus;
}

export type RecallStatus = 'Overdue' | 'Due today' | 'Upcoming';

export interface Recall {
  id: string;
  patient: string;
  reason: string;
  due: string;
  phone: string;
  status: RecallStatus;
}

export interface PatientSummary {
  id: string;
  name: string;
  phone: string;
  last: string;
  branch: Branch;
}

export type ReceiptStatus = 'Paid' | 'Unpaid' | 'Partial';

export interface Receipt {
  id: string;
  patient: string;
  items: string;
  // Pesos, like the API's Decimal amounts; shown with formatPeso.
  amount: number;
  status: ReceiptStatus;
}

export type JobStage = 'Ordered' | 'In lab' | 'Ready' | 'Picked up';

export interface JobOrder {
  id: string;
  patient: string;
  item: string;
  stage: JobStage;
  due: string;
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
