import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { forgotPassword } from '@/api/auth';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { FormError, FormField } from '@/features/auth/components/FormField';
import { NETWORK_ERROR, setFieldErrors } from '@/features/auth/form-errors';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/features/auth/schemas';

export function ForgotPasswordPage() {
  const [formError, setFormError] = useState('');
  const [sentMessage, setSentMessage] = useState('');
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError('');
    try {
      setSentMessage((await forgotPassword(email)).message);
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setFormError(NETWORK_ERROR);
        return;
      }
      switch (err.code) {
        case 'validation_failed':
          setFieldErrors(err, setError);
          break;
        default:
          setFormError(err.message);
      }
    }
  });

  return (
    <AuthCard
      title="Forgot password"
      description="Enter your email and we'll send you a reset link."
      footer={
        <Link to="/login" className="underline">
          Back to sign in
        </Link>
      }
    >
      {sentMessage ? (
        <p role="status">{sentMessage}</p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormError message={formError} />
          <FormField
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
