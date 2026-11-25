import type { Branch } from '@/types/branch';

// Same codes and names as the backend seed (the ids here are fake). Address and phone stay
// empty until the clinic supplies them.
export const PASAY: Branch = {
  id: 'b-pasay',
  code: 'PASAY',
  name: 'MRB Optical Clinic Pasay',
  address: null,
  phone: null,
  onlineBookingEnabled: true,
};

export const TAGUIG: Branch = {
  id: 'b-taguig',
  code: 'TAGUIG',
  name: 'MRB Optical Clinic Taguig',
  address: null,
  phone: null,
  onlineBookingEnabled: true,
};

// Sorted by name, like GET /branches on the real server.
export const branches: Branch[] = [PASAY, TAGUIG].sort((a, b) => a.name.localeCompare(b.name));
