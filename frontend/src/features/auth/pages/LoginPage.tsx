import { LoginDesktop } from '@/features/auth/components/LoginDesktop';
import { LoginMobile } from '@/features/auth/components/LoginMobile';
import { useIsDesktop } from '@/features/auth/useIsDesktop';
import { useLoginForm } from '@/features/auth/useLoginForm';

// Phones see the navy-header card; 1024px and wider see the two-panel web layout.
export function LoginPage() {
  const form = useLoginForm();
  return useIsDesktop() ? <LoginDesktop form={form} /> : <LoginMobile form={form} />;
}
