import { useSyncExternalStore } from 'react';
import { RegisterDesktop } from '@/features/auth/components/RegisterDesktop';
import { RegisterMobile } from '@/features/auth/components/RegisterMobile';
import { useRegisterForm } from '@/features/auth/useRegisterForm';

const DESKTOP_QUERY = '(min-width: 1024px)';

function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(DESKTOP_QUERY);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
  );
}

// Phones see the navy-header card; 1024px and wider see the two-panel web layout.
// The form state lives here, so resizing across 1024px keeps what the user typed.
export function RegisterPage() {
  const form = useRegisterForm();
  return useIsDesktop() ? <RegisterDesktop form={form} /> : <RegisterMobile form={form} />;
}
