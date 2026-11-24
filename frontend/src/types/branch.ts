// One clinic branch, as GET /branches returns it.
export interface Branch {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  onlineBookingEnabled: boolean;
}

// The short form carried inside a user (login and GET /auth/me).
export type BranchRef = Pick<Branch, 'id' | 'code' | 'name'>;
