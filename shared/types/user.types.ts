export type UserRole =
  | 'homeowner'
  | 'contractor'
  | 'civil_engineer'
  | 'vendor';

export interface User {
  id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  role: UserRole;
  created_at: string;
  default_address_id?: string | null;
}
