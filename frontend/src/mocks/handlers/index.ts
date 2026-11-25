import { authHandlers } from '@/mocks/handlers/auth';
import { branchHandlers } from '@/mocks/handlers/branches';

// Every mock endpoint. Later phases add their own file and list it here.
export const handlers = [...authHandlers, ...branchHandlers];
