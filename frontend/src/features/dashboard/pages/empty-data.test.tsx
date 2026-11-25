import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DoctorDashboard } from '@/features/dashboard/pages/DoctorDashboard';
import { PatientDashboard } from '@/features/dashboard/pages/PatientDashboard';
import { StaffDashboard } from '@/features/dashboard/pages/StaffDashboard';
import { EodReportPage } from '@/features/reports/pages/EodReportPage';
import { fakeUser, renderWithProviders } from '@/test/render';

// A clinic with no records yet: every screen must still render and say so.
vi.mock('@/mocks/data/samples', () => ({
  todayQueue: [],
  doctorSchedule: [],
  examinationsThisWeek: 0,
  recalls: [],
  patients: [],
  recentPatients: [],
  agenda: [],
  receipts: [],
  jobStages: ['Ordered', 'In lab', 'Ready', 'Picked up'],
  jobOrders: [],
  scans: [],
  stock: [],
  myPatientNumber: null,
  myNextVisit: null,
  myExams: [],
}));

describe('screens with no data yet', () => {
  it('staff dashboard says there is nothing in the queue or to call', () => {
    renderWithProviders(<StaffDashboard />, { user: fakeUser({ role: 'staff' }) });
    expect(screen.getByText('No visits today')).toBeInTheDocument();
    expect(screen.getByText('No recalls to call')).toBeInTheDocument();
  });

  it('doctor dashboard says the schedule is empty', () => {
    renderWithProviders(<DoctorDashboard />, { user: fakeUser({ role: 'optometrist' }) });
    expect(screen.getByText('No visits scheduled today')).toBeInTheDocument();
    expect(screen.getByText('No patients yet')).toBeInTheDocument();
  });

  it('patient dashboard renders with no visit booked and no records', () => {
    renderWithProviders(<PatientDashboard />, { user: fakeUser({ role: 'patient' }) });
    expect(screen.getByText('No visit booked')).toBeInTheDocument();
    expect(screen.getByText('No prescription yet')).toBeInTheDocument();
    expect(screen.getByText('No visits yet')).toBeInTheDocument();
  });

  it('EOD report renders with an empty day', () => {
    renderWithProviders(<EodReportPage />, { user: fakeUser({ role: 'optometrist' }) });
    expect(screen.getByText('No visits today')).toBeInTheDocument();
    expect(screen.getByText('Nothing to restock')).toBeInTheDocument();
  });
});
