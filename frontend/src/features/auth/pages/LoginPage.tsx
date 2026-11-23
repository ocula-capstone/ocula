import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/features/auth/auth-context';
import { LoginDesktop } from '@/features/auth/components/LoginDesktop';
import { LoginMobile } from '@/features/auth/components/LoginMobile';
import { useIsDesktop } from '@/features/auth/useIsDesktop';
import { landingFor, useLoginForm } from '@/features/auth/useLoginForm';

// Phones see the navy-header card; 1024px and wider see the two-panel web layout.
export function LoginPage() {
  const { user, isLoading } = useAuth();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const form = useLoginForm();
  const isDesktop = useIsDesktop();
  if (isLoading) return null; // no flash of the form while the session is restored
  if (user) return <Navigate to={landingFor(user.role, from)} replace />;
  return isDesktop ? <LoginDesktop form={form} /> : <LoginMobile form={form} />;
}
