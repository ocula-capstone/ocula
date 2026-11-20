import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { changePassword } from '@/api/auth';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { FormError, FormField } from '@/features/auth/components/FormField';
import { NETWORK_ERROR, setFieldErrors } from '@/features/auth/form-errors';
import { changePasswordSchema, type ChangePasswordValues } from '@/features/auth/schemas';

// Rendered under the role guards at /me|/staff|/doctor/change-password.
export function ChangePasswordPage() {
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError('');
    setDone(false);
    try {
      await changePassword(values);
      reset();
      setDone(true);
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setFormError(NETWORK_ERROR);
        return;
      }
      switch (err.code) {
        case 'validation_failed':
          setFieldErrors(err, setError);
          break;
        case 'wrong_current_password':
          setError('currentPassword', { message: 'Current password is incorrect' });
          break;
        default:
          setFormError(err.message);
      }
    }
  });

  return (
    <AuthCard title="Change your password">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormError message={formError} />
        {done && <p role="status">Your password has been changed.</p>}
        <FormField
          label="Current password"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <FormField
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Saving…' : 'Change password'}
        </Button>
      </form>
    </AuthCard>
  );
}
