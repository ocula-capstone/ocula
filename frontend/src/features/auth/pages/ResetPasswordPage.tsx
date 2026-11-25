import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { resetPassword } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { FormError, FormField } from '@/features/auth/components/FormField';
import { handleSubmitError } from '@/features/auth/form-errors';
import { resetPasswordSchema, type ResetPasswordValues } from '@/features/auth/schemas';

export function ResetPasswordPage() {
  const token = useSearchParams()[0].get('token');
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = handleSubmit(async ({ newPassword }) => {
    setFormError('');
    try {
      await resetPassword({ token: token ?? '', newPassword });
      setDone(true);
    } catch (err) {
      handleSubmitError(err, {
        setError,
        setFormError,
        fields: ['newPassword', 'confirmPassword'],
        byCode: {
          invalid_or_expired_token: 'This reset link is invalid or has expired. Request a new one.',
        },
      });
    }
  });

  const footer = (
    <Link to={done ? '/login' : '/forgot-password'} className="underline">
      {done ? 'Go to sign in' : 'Request a new reset link'}
    </Link>
  );

  if (!token) {
    return (
      <AuthCard title="Reset password" footer={footer}>
        <FormError message="This reset link is missing its token." />
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset password" description="Choose a new password." footer={footer}>
      {done ? (
        <p role="status">Your password has been reset. You can now sign in.</p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormError message={formError} />
          <FormField
            label="New password"
            type="password"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <FormField
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Saving…' : 'Reset password'}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
