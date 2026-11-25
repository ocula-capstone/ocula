import { Navigate, Outlet, useLocation } from 'react-router';
import { ROLE_HOME, useAuth } from '@/features/auth/auth-context';
import type { Role } from '@/types/auth';

export function RequireRole({ role }: { role: Role }) {
  const { user, isLoading } = useAuth();
  const { pathname, search } = useLocation();
  if (isLoading) return <p className="p-6">Loading…</p>;
  // Signed out: remember the page so login can return here.
  if (!user) return <Navigate to="/login" state={{ from: pathname + search }} replace />;
  // Signed in with another role: send them to their own area, not the login page.
  if (user.role !== role) return <Navigate to={ROLE_HOME[user.role]} replace />;
  // A temporary password (issued by staff or admin) must be changed before anything else.
  const changePasswordPath = `${ROLE_HOME[user.role]}/change-password`;
  if (user.mustChangePassword && pathname !== changePasswordPath) {
    return <Navigate to={changePasswordPath} replace />;
  }
  return <Outlet />;
}
