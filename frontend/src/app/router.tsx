import { createBrowserRouter } from 'react-router';
import { PublicLayout } from '@/app/layouts/PublicLayout';
import { StaffLayout } from '@/app/layouts/StaffLayout';
import { PatientLayout } from '@/app/layouts/PatientLayout';
import { Placeholder } from '@/components/common/Placeholder';
import { RequireRole } from '@/features/auth/components/RequireRole';
import { ChangePasswordPage } from '@/features/auth/pages/ChangePasswordPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <Placeholder title="Home" /> },
      { path: '/services', element: <Placeholder title="Services" /> },
      { path: '/frames', element: <Placeholder title="Frames" /> },
      { path: '/branches', element: <Placeholder title="Branches" /> },
      { path: '/doctors', element: <Placeholder title="Doctors" /> },
      { path: '/book', element: <Placeholder title="Book a visit" /> },
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
        element: <StaffLayout />,
        children: [
          { index: true, element: <Placeholder title="Staff dashboard" /> },
          { path: 'patients', element: <Placeholder title="Patients" /> },
          { path: 'appointments', element: <Placeholder title="Appointments" /> },
          { path: 'billing', element: <Placeholder title="Billing" /> },
          { path: 'job-orders', element: <Placeholder title="Job orders" /> },
          { path: 'inventory', element: <Placeholder title="Inventory" /> },
          { path: 'recalls', element: <Placeholder title="Recalls" /> },
          { path: 'reports', element: <Placeholder title="Reports" /> },
          { path: 'notifications', element: <Placeholder title="Notifications" /> },
          { path: 'change-password', element: <ChangePasswordPage /> },
        ],
      },
    ],
  },
  {
    element: <RequireRole role="admin" />,
    children: [
      {
        path: '/admin',
        element: <StaffLayout />,
        children: [
          { index: true, element: <Placeholder title="Admin dashboard" /> },
          { path: 'users', element: <Placeholder title="Users" /> },
          { path: 'change-password', element: <ChangePasswordPage /> },
        ],
      },
    ],
  },
  {
    element: <RequireRole role="optometrist" />,
    children: [
      {
        path: '/doctor',
        element: <StaffLayout />,
        children: [
          { index: true, element: <Placeholder title="Doctor dashboard" /> },
          { path: 'schedule', element: <Placeholder title="Schedule" /> },
          { path: 'patients', element: <Placeholder title="Patients" /> },
          { path: 'exams', element: <Placeholder title="Exams" /> },
          { path: 'ocr', element: <Placeholder title="OCR" /> },
          { path: 'frames', element: <Placeholder title="Frames" /> },
          { path: 'notifications', element: <Placeholder title="Notifications" /> },
          { path: 'change-password', element: <ChangePasswordPage /> },
        ],
      },
    ],
  },
  {
    element: <RequireRole role="patient" />,
    children: [
      {
        path: '/me',
        element: <PatientLayout />,
        children: [
          { index: true, element: <Placeholder title="My dashboard" /> },
          { path: 'records', element: <Placeholder title="My records" /> },
          { path: 'prescriptions', element: <Placeholder title="My prescriptions" /> },
          { path: 'appointments', element: <Placeholder title="My appointments" /> },
          { path: 'frame-finder', element: <Placeholder title="Frame finder" /> },
          { path: 'notifications', element: <Placeholder title="Notifications" /> },
          { path: 'change-password', element: <ChangePasswordPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Placeholder title="Page not found" /> },
]);
