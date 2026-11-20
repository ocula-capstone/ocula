import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { ApiError } from '@/api/client';
import { useAuth } from '@/features/auth/auth-context';
import { registerSchema, type RegisterInput, type RegisterValues } from '@/features/auth/schemas';

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const API_FIELDS = ['fullName', 'email', 'phone', 'password'] as const;
type ApiField = (typeof API_FIELDS)[number];

// Form state and submit logic shared by the mobile card and the desktop two-panel layouts.
export function useRegisterForm() {
  const navigate = useNavigate();
  const { register: signUp } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<RegisterInput, unknown, RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
  });
  const { setError } = form;

  const onSubmit = form.handleSubmit(async ({ fullName, email, phone, password }) => {
    setFormError(null);
    try {
      await signUp({ fullName, email, phone, password });
      navigate('/me', { replace: true });
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setFormError(GENERIC_ERROR);
        return;
      }
      switch (err.code) {
        case 'validation_failed': {
          // keys already match the form field names
          const shown = Object.entries(err.fields ?? {}).filter(([name]) =>
            API_FIELDS.includes(name as ApiField),
          );
          shown.forEach(([name, message], i) =>
            setError(name as ApiField, { message }, { shouldFocus: i === 0 }),
          );
          if (!shown.length) setFormError(err.message || GENERIC_ERROR);
          break;
        }
        case 'email_taken':
          setError(
            'email',
            { message: err.message || 'This email is already registered' },
            { shouldFocus: true },
          );
          break;
        case 'too_many_attempts':
          setFormError('Too many attempts. Please wait a moment and try again.');
          break;
        default:
          setFormError(err.message || GENERIC_ERROR);
      }
    }
  });

  return { ...form, formError, onSubmit };
}

export type RegisterForm = ReturnType<typeof useRegisterForm>;
