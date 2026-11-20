import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { ROLE_HOME, useAuth } from '@/features/auth/auth-context';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { FormError, FormField } from '@/features/auth/components/FormField';
import { NETWORK_ERROR, setFieldErrors } from '@/features/auth/form-errors';
import { loginSchema, type LoginValues } from '@/features/auth/schemas';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState('');
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError('');
    try {
      const user = await login(values);
      navigate(ROLE_HOME[user.role], { replace: true });
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

  return (
    <AuthCard
      title="Sign in"
      description="Welcome back to OCULA."
      footer={
        <div className="space-y-1">
          <p>
            <Link to="/forgot-password" className="underline">
              Forgot your password?
            </Link>
          </p>
          <p>
            New patient?{' '}
            <Link to="/register" className="underline">
              Create an account
            </Link>
          </p>
        </div>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormError message={formError} />
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthCard>
  );
}
