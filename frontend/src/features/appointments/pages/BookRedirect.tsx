import { Navigate } from 'react-router';
import { ROLE_HOME, useAuth } from '@/features/auth/auth-context';

// The public "Book a visit" link. Booking online needs an account, so a signed-out visitor is sent
// to the register form (which brings them back to their appointments once they are in). A patient
// who is already signed in goes straight to their appointments; staff and doctors to their own home.
export function BookRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null; // wait for the session to be restored, so a signed-in patient is not sent to register
  if (!user) return <Navigate to="/register" state={{ from: '/me/appointments' }} replace />;
  return (
    <Navigate to={user.role === 'patient' ? '/me/appointments' : ROLE_HOME[user.role]} replace />
  );
}
