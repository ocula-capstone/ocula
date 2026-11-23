import { RegisterDesktop } from '@/features/auth/components/RegisterDesktop';
import { RegisterMobile } from '@/features/auth/components/RegisterMobile';
import { useIsDesktop } from '@/features/auth/useIsDesktop';
import { useRegisterForm } from '@/features/auth/useRegisterForm';

// Phones see the navy-header card; 1024px and wider see the two-panel web layout.
// The form state lives here, so resizing across 1024px keeps what the user typed.
export function RegisterPage() {
  const form = useRegisterForm();
  return useIsDesktop() ? <RegisterDesktop form={form} /> : <RegisterMobile form={form} />;
}
