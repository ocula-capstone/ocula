import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router';
import { ApiError } from '@/api/client';
import { ROLE_HOME, useAuth } from '@/features/auth/auth-context';
import { NETWORK_ERROR, setFieldErrors } from '@/features/auth/form-errors';
import { loginSchema, type LoginValues } from '@/features/auth/schemas';
import type { Role } from '@/types/auth';

// Where a signed-in user lands: the page RequireRole remembered, if it is in their own area.
export function landingFor(role: Role, from: unknown) {
  const home = ROLE_HOME[role];
  return typeof from === 'string' && (from === home || from.startsWith(`${home}/`)) ? from : home;
}

// Form state and submit logic shared by the mobile and desktop login layouts.
export function useLoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [formError, setFormError] = useState('');
  // onTouched: validate when the user leaves a field, same as the register form.
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), mode: 'onTouched' });
  const { setError } = form;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError('');
    try {
      const user = await login(values);
      navigate(landingFor(user.role, from), { replace: true });
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setFormError(NETWORK_ERROR);
        return;
      }
      switch (err.code) {
        case 'validation_failed':
          setFieldErrors(err, setError);
          break;
        case 'invalid_credentials':
          setFormError('Incorrect email or password.');
          break;
        default:
          setFormError(err.message);
      }
    }
  });

  return { ...form, formError, onSubmit };
}

export type LoginForm = ReturnType<typeof useLoginForm>;
