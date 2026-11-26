import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/features/auth/auth-context';
import { RegisterDesktop } from '@/features/auth/components/RegisterDesktop';
import { RegisterMobile } from '@/features/auth/components/RegisterMobile';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { landingFor } from '@/features/auth/useLoginForm';
import { useRegisterForm } from '@/features/auth/useRegisterForm';

// Phones see the navy-header card; 1024px and wider see the two-panel web layout.
// The form state lives here, so resizing across 1024px keeps what the user typed.
export function RegisterPage() {
  const { user, isLoading } = useAuth();
  const form = useRegisterForm();
  const isDesktop = useIsDesktop();
  const from = (useLocation().state as { from?: string } | null)?.from;
  if (isLoading) return null; // no flash of the form while the session is restored
  if (user) return <Navigate to={landingFor(user.role, from)} replace />;
  return isDesktop ? <RegisterDesktop form={form} /> : <RegisterMobile form={form} />;
}
