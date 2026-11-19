import { createBrowserRouter } from 'react-router';
import { PublicLayout } from '@/app/layouts/PublicLayout';
import { StaffLayout } from '@/app/layouts/StaffLayout';
import { PatientLayout } from '@/app/layouts/PatientLayout';
import { Placeholder } from '@/components/common/Placeholder';

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
      { path: '/login', element: <Placeholder title="Login" /> },
      { path: '/register', element: <Placeholder title="Register" /> },
      { path: '/forgot-password', element: <Placeholder title="Forgot password" /> },
      { path: '/reset-password', element: <Placeholder title="Reset password" /> },
    ],
  },
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
      { path: 'users', element: <Placeholder title="Users" /> },
    ],
  },
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
    ],
  },
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
    ],
  },
  { path: '*', element: <Placeholder title="Page not found" /> },
]);
