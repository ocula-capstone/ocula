import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { changePassword } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { ROLE_HOME, useAuth } from '@/features/auth/auth-context';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { FormError, FormField } from '@/features/auth/components/FormField';
import { handleSubmitError } from '@/features/auth/form-errors';
import { changePasswordSchema, type ChangePasswordValues } from '@/features/auth/schemas';

// Rendered under the role guards at /me, /staff, /doctor and /admin change-password.
export function ChangePasswordPage() {
  const { user, passwordChanged } = useAuth();
  const navigate = useNavigate();
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
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      passwordChanged();
      // `user` is this render's snapshot, so it still shows the old flag here. A forced user has
      // no menu to leave this page with, so send them to their home.
      if (user?.mustChangePassword) {
        navigate(ROLE_HOME[user.role], { replace: true });
        return;
      }
      reset();
      setDone(true);
    } catch (err) {
      handleSubmitError(err, {
        setError,
        setFormError,
        fields: ['currentPassword', 'newPassword', 'confirmPassword'],
        byCode: { wrong_current_password: ['currentPassword', 'Current password is incorrect'] },
      });
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
        <FormField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Saving…' : 'Change password'}
        </Button>
      </form>
    </AuthCard>
  );
}
