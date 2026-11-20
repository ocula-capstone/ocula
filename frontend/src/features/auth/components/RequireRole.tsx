import { Navigate, Outlet } from 'react-router';
import { useAuth } from '@/features/auth/auth-context';
import type { Role } from '@/types/auth';

export function RequireRole({ role }: { role: Role }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p className="p-6">Loading…</p>;
  if (!user || user.role !== role) return <Navigate to="/login" replace />;
  return <Outlet />;
}
