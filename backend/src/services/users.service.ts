import { query, queryOne } from '../config/db';

export type UserRole = 'homeowner' | 'contractor' | 'civil_engineer' | 'vendor' | 'admin';

export type DbUser = {
  id: string;
  phone: string | null;
  email: string | null;
  full_name: string;
  role: UserRole;
  gstin: string | null;
};

export async function upsertUser(input: {
  id: string;
  phone?: string | null;
  email?: string | null;
  fullName?: string;
  role?: UserRole;
  gstin?: string | null;
}): Promise<DbUser> {
  const fullName = input.fullName?.trim() || 'BuildMart User';
  const role = input.role ?? 'homeowner';
  const user = await queryOne<DbUser>(
    `insert into users (id, phone, email, full_name, role, gstin, updated_at)
     values ($1, $2, $3, $4, $5, $6, now())
     on conflict (id) do update set
       phone = coalesce(excluded.phone, users.phone),
       email = coalesce(excluded.email, users.email),
       full_name = excluded.full_name,
       role = excluded.role,
       gstin = coalesce(excluded.gstin, users.gstin),
       updated_at = now()
     returning id, phone, email, full_name, role, gstin`,
    [input.id, input.phone ?? null, input.email ?? null, fullName, role, input.gstin ?? null],
  );

  await query(
    `insert into profiles (id, phone, email, full_name, role, gstin, updated_at)
     values ($1, $2, $3, $4, $5, $6, now())
     on conflict (id) do update set
       phone = excluded.phone,
       email = excluded.email,
       full_name = excluded.full_name,
       role = excluded.role,
       gstin = excluded.gstin,
       updated_at = now()`,
    [input.id, input.phone ?? null, input.email ?? null, fullName, role, input.gstin ?? null],
  );

  return user!;
}

export async function ensureUser(
  id: string,
  extras?: { phone?: string | null; role?: UserRole; fullName?: string },
): Promise<void> {
  await upsertUser({
    id,
    phone: extras?.phone,
    role: extras?.role,
    fullName: extras?.fullName,
  });
}

export async function getUserById(id: string): Promise<DbUser | null> {
  return queryOne<DbUser>(
    'select id, phone, email, full_name, role, gstin from users where id = $1',
    [id],
  );
}

export async function getUserByPhone(phone: string): Promise<DbUser | null> {
  return queryOne<DbUser>(
    'select id, phone, email, full_name, role, gstin from users where phone = $1',
    [phone],
  );
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  return queryOne<DbUser>(
    'select id, phone, email, full_name, role, gstin from users where lower(email) = lower($1)',
    [email],
  );
}

export async function ensureDefaultAddresses(userId: string): Promise<void> {
  const existing = await queryOne<{ n: string }>(
    'select count(*)::text as n from addresses where user_id = $1',
    [userId],
  );
  if (existing && Number(existing.n) > 0) return;

  await query(
    `insert into addresses (id, user_id, label, full_address, pincode, city, is_default)
     values
       ($1, $3, 'Site', 'Plot 42, Sector 54, near metro', '500032', 'Hyderabad', true),
       ($2, $3, 'Home', '12-3-45, Banjara Hills Road No. 2', '500034', 'Hyderabad', false)
     on conflict (id) do nothing`,
    [`${userId}-addr-1`, `${userId}-addr-2`, userId],
  );
}
