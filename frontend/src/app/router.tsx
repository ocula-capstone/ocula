import { createBrowserRouter } from 'react-router';
import { AppShell } from '@/app/layouts/AppShell';
import { PublicLayout } from '@/app/layouts/PublicLayout';
import { Placeholder } from '@/components/common/Placeholder';
import { AppointmentsPage } from '@/features/appointments/pages/AppointmentsPage';
import { BookRedirect } from '@/features/appointments/pages/BookRedirect';
import { MyAppointmentsPage } from '@/features/appointments/pages/MyAppointmentsPage';
import { RequireRole } from '@/features/auth/components/RequireRole';
import { ChangePasswordPage } from '@/features/auth/pages/ChangePasswordPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { AutoRefractorPage } from '@/features/auto-refractor/pages/AutoRefractorPage';
import { BillingPage } from '@/features/billing/pages/BillingPage';
import { DoctorDashboard } from '@/features/dashboard/pages/DoctorDashboard';
import { PatientDashboard } from '@/features/dashboard/pages/PatientDashboard';
import { StaffDashboard } from '@/features/dashboard/pages/StaffDashboard';
import { FrameFinderPage } from '@/features/frame-finder/pages/FrameFinderPage';
import { InventoryPage } from '@/features/inventory/pages/InventoryPage';
import { JobOrdersPage } from '@/features/job-orders/pages/JobOrdersPage';
import { PatientRecordsPage } from '@/features/patients/pages/PatientRecordsPage';
import { RecallsPage } from '@/features/recalls/pages/RecallsPage';
import { MyRecordsPage } from '@/features/records/pages/MyRecordsPage';
import { EodReportPage } from '@/features/reports/pages/EodReportPage';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';

// Pages every signed-in area has. The menu (src/app/nav.ts) links to settings; the bell to notifications.
const shared = [
  { path: 'settings', element: <SettingsPage /> },
  { path: 'notifications', element: <Placeholder title="Notifications" /> },
  { path: 'change-password', element: <ChangePasswordPage /> },
];

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <Placeholder title="Home" /> },
      { path: '/services', element: <Placeholder title="Services" /> },
      { path: '/frames', element: <Placeholder title="Frames" /> },
      { path: '/branches', element: <Placeholder title="Branches" /> },
      { path: '/doctors', element: <Placeholder title="Doctors" /> },
      { path: '/book', element: <BookRedirect /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    element: <RequireRole role="staff" />,
    children: [
      {
        path: '/staff',
        element: <AppShell />,
        children: [
          { index: true, element: <StaffDashboard /> },
          { path: 'patients', element: <PatientRecordsPage /> },
          { path: 'appointments', element: <AppointmentsPage /> },
          { path: 'billing', element: <BillingPage /> },
          { path: 'job-orders', element: <JobOrdersPage /> },
          { path: 'auto-refractor', element: <AutoRefractorPage /> },
          { path: 'recalls', element: <RecallsPage /> },
          { path: 'inventory', element: <InventoryPage /> },
          ...shared,
        ],
      },
    ],
  },
  {
    element: <RequireRole role="optometrist" />,
    children: [
      {
        path: '/doctor',
        element: <AppShell />,
        children: [
          { index: true, element: <DoctorDashboard /> },
          { path: 'patients', element: <PatientRecordsPage /> },
          { path: 'auto-refractor', element: <AutoRefractorPage /> },
          { path: 'inventory', element: <InventoryPage /> },
          { path: 'reports', element: <EodReportPage /> },
          ...shared,
        ],
      },
    ],
  },
  {
    element: <RequireRole role="admin" />,
    children: [
      {
        path: '/admin',
        element: <AppShell />,
        children: [
          { index: true, element: <Placeholder title="Admin dashboard" /> },
          { path: 'users', element: <Placeholder title="Users" /> },
          { path: 'branches', element: <Placeholder title="Branches" /> },
          { path: 'inventory', element: <InventoryPage /> },
          { path: 'reports', element: <Placeholder title="Reports" /> },
          { path: 'audit-log', element: <Placeholder title="Audit log" /> },
          ...shared,
        ],
      },
    ],
  },
  {
    element: <RequireRole role="patient" />,
    children: [
      {
        path: '/me',
        element: <AppShell />,
        children: [
          { index: true, element: <PatientDashboard /> },
          { path: 'records', element: <MyRecordsPage /> },
          { path: 'frame-finder', element: <FrameFinderPage /> },
          { path: 'appointments', element: <MyAppointmentsPage /> },
          { path: 'prescriptions', element: <Placeholder title="My prescriptions" /> },
          ...shared,
        ],
      },
    ],
  },
  { path: '*', element: <Placeholder title="Page not found" /> },
]);
