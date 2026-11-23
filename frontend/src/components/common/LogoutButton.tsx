import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-context';

export function LogoutButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  // logout() clears the session synchronously; going to /login in the same tick stops
  // RequireRole from redirecting there first with a "remembered" page.
  const onClick = () => {
    void logout();
    navigate('/login', { replace: true });
  };
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <LogOut /> Log out
    </Button>
  );
}
