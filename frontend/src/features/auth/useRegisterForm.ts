import { useState, type ChangeEvent } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { useAuth } from '@/features/auth/auth-context';
import { handleSubmitError } from '@/features/auth/form-errors';
import { formatDateInput } from '@/lib/dates';
import { registerSchema, type RegisterInput, type RegisterValues } from '@/features/auth/schemas';

const REGISTER_FIELDS = ['fullName', 'email', 'phone', 'birthDate', 'password'] as const;
// Conflict error code -> the field it belongs under, and the message to show there.
const TAKEN = {
  email_taken: ['email', 'This email is already registered'],
  phone_taken: ['phone', 'This mobile number is already registered'],
} as const;

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

  const onSubmit = form.handleSubmit(async ({ fullName, email, phone, birthDate, password }) => {
    setFormError(null);
    try {
      await signUp({ fullName, email, phone, birthDate, password });
      navigate('/me', { replace: true });
    } catch (err) {
      handleSubmitError(err, { setError, setFormError, fields: REGISTER_FIELDS, byCode: TAKEN });
    }
  });

  // Password field props. When the password changes, re-check "confirm" so a mismatch shows up, but
  // only once the user has typed in it: `deps` would also fire on blur and flag an untouched field.
  const registerPassword = () =>
    form.register('password', {
      onChange: () => {
        if (form.getValues('confirmPassword')) void form.trigger('confirmPassword');
      },
    });

  // Date of birth field props. The box is formatted before the form reads it, so what the form
  // stores is exactly what the person sees.
  const registerBirthDate = () => {
    const field = form.register('birthDate');
    return {
      ...field,
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        const deleting = (e.nativeEvent as InputEvent).inputType?.startsWith('delete') ?? false;
        e.target.value = formatDateInput(e.target.value, deleting);
        return field.onChange(e);
      },
    };
  };

  return { ...form, formError, onSubmit, registerPassword, registerBirthDate };
}

export type RegisterForm = ReturnType<typeof useRegisterForm>;
