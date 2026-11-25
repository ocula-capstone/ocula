import { api } from '@/api/client';
import type { Branch } from '@/types/branch';

// GET /branches: every clinic branch, sorted by name.
export const listBranches = () => api<Branch[]>('/branches');
