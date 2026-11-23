import { Outlet } from 'react-router';
import { LogoutButton } from '@/components/common/LogoutButton';

export function PatientLayout() {
  return (
    <>
      <header className="flex justify-end p-3">
        <LogoutButton />
      </header>
      <Outlet />
    </>
  );
}
