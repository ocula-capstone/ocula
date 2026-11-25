import { useNavigate } from 'react-router';
import { useAuth } from '@/features/auth/auth-context';

// logout() clears the session synchronously; going to /login in the same tick stops
// RequireRole from redirecting there first with a "remembered" page.
export function useSignOut() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return () => {
    void logout();
    navigate('/login', { replace: true });
  };
}
