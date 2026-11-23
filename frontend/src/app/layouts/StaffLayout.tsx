import { Outlet } from 'react-router';
import { LogoutButton } from '@/components/common/LogoutButton';

// Used by both staff and doctor routes.
export function StaffLayout() {
  return (
    <>
      <header className="flex justify-end p-3">
        <LogoutButton />
      </header>
      <Outlet />
    </>
  );
}
