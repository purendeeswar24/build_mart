import crypto from 'crypto';
import { query, queryOne } from '../config/db';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler.middleware';
import { assertRealEmail } from '../utils/identity';
import { upsertUser, type DbUser, type UserRole } from './users.service';

export type CredentialRow = {
  user_id: string;
  username: string;
  password_hash: string;
  email_verified: boolean;
};

export function normalizeUsername(raw: string) {
  const username = raw.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]{3,19}$/.test(username)) {
    throw new AppError(
      'BAD_USERNAME',
      'User ID must be 4–20 characters, start with a letter, and use only letters, numbers, or _.',
      400,
    );
  }
  return username;
}

export function assertPassword(password: string) {
  if (password.length < 8) {
    throw new AppError('BAD_PASSWORD', 'Password must be at least 8 characters.', 400);
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new AppError('BAD_PASSWORD', 'Password must include a letter and a number.', 400);
  }
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function passwordMatches(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const next = crypto.scryptSync(password, salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(next, 'hex'));
  } catch {
    return false;
  }
}

export async function getCredentialByUsername(username: string) {
  return queryOne<CredentialRow & { email: string | null; full_name: string; role: UserRole; phone: string | null }>(
    `select c.user_id, c.username, c.password_hash, c.email_verified,
            u.email, u.full_name, u.role, u.phone
     from user_credentials c
     join users u on u.id = c.user_id
     where lower(c.username) = lower($1)`,
    [username],
  );
}

export async function getCredentialByEmail(email: string) {
  return queryOne<CredentialRow & { email: string | null; full_name: string; role: UserRole; phone: string | null }>(
    `select c.user_id, c.username, c.password_hash, c.email_verified,
            u.email, u.full_name, u.role, u.phone
     from user_credentials c
     join users u on u.id = c.user_id
     where lower(u.email) = lower($1)`,
    [email],
  );
}

export async function registerAccount(input: {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role?: UserRole;
}): Promise<{ user: DbUser; username: string }> {
  const username = normalizeUsername(input.username);
  const email = assertRealEmail(input.email);
  assertPassword(input.password);
  const fullName = input.fullName.trim();
  if (fullName.length < 2) {
    throw new AppError('BAD_NAME', 'Enter your full name.', 400);
  }

  const takenUser = await getCredentialByUsername(username);
  if (takenUser) {
    throw new AppError('USERNAME_TAKEN', 'That user ID is already taken.', 409);
  }
  const takenEmail = await queryOne<{ id: string }>('select id from users where lower(email) = lower($1)', [email]);
  if (takenEmail) {
    throw new AppError('EMAIL_TAKEN', 'An account already exists for this email. Sign in instead.', 409);
  }

  const userId = `u-${username}`;
  const user = await upsertUser({
    id: userId,
    email,
    fullName,
    role: input.role === 'admin' ? 'homeowner' : input.role ?? 'homeowner',
  });
  await query(
    `insert into user_credentials (user_id, username, password_hash, email_verified, updated_at)
     values ($1, $2, $3, false, now())
     on conflict (user_id) do update set
       username = excluded.username,
       password_hash = excluded.password_hash,
       updated_at = now()`,
    [userId, username, hashPassword(input.password)],
  );
  return { user, username };
}

export async function markEmailVerified(email: string) {
  await query(
    `update user_credentials c
     set email_verified = true, verified_at = now(), updated_at = now()
     from users u
     where c.user_id = u.id and lower(u.email) = lower($1)`,
    [email],
  );
}

export function allowTestAccounts() {
  if (env.NODE_ENV === 'production') return false;
  if (env.ALLOW_TEST_ACCOUNTS === false) return false;
  return true;
}

async function lockTestAccounts() {
  const hash = hashPassword(crypto.randomBytes(24).toString('hex'));
  await query(
    `update user_credentials
     set password_hash = $1, email_verified = false, updated_at = now()
     where username in ('test', 'admin', 'bidder', 'builder')`,
    [hash],
  );
}

export async function syncTestAccounts() {
  if (allowTestAccounts()) {
    await ensureTestAccounts();
    return;
  }
  await lockTestAccounts();
}

export async function ensureTestAccounts() {
  const accounts: Array<{
    username: string;
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
  }> = [
    {
      username: 'test',
      email: 'test@buildmart.local',
      password: 'test',
      fullName: 'Test Shopper',
      role: 'homeowner',
    },
    {
      username: 'builder',
      email: 'builder@buildmart.local',
      password: 'builder',
      fullName: 'Test Builder',
      role: 'contractor',
    },
    {
      username: 'bidder',
      email: 'bidder@buildmart.local',
      password: 'bidder',
      fullName: 'Test Electrician',
      role: 'contractor',
    },
    {
      username: 'admin',
      email: 'admin@buildmart.local',
      password: 'admin',
      fullName: 'Test Admin',
      role: 'admin',
    },
  ];

  for (const account of accounts) {
    const userId = `u-${account.username}`;
    await upsertUser({
      id: userId,
      email: account.email,
      fullName: account.fullName,
      role: account.role,
    });
    await query(
      `insert into user_credentials (user_id, username, password_hash, email_verified, verified_at, updated_at)
       values ($1, $2, $3, true, now(), now())
       on conflict (user_id) do update set
         username = excluded.username,
         password_hash = excluded.password_hash,
         email_verified = true,
         verified_at = coalesce(user_credentials.verified_at, now()),
         updated_at = now()`,
      [userId, account.username, hashPassword(account.password)],
    );
  }

  // Shop `test` is only a buyer. Builder owns the work so estimates stay off the shopper login.
  await query(`update hire_jobs set owner_id = 'u-builder' where owner_id = 'u-test'`);
  const openWork = await queryOne<{ id: string }>(
    `select id from hire_jobs where owner_id = 'u-builder' and status = 'open' limit 1`,
  );
  if (!openWork) {
    const ends = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await query(
      `insert into hire_jobs (
         id, owner_id, category, title, description, city, pincode,
         bidding_ends_at, owner_estimate, commission_percent, status
       ) values ($1,'u-builder','electrician',$2,$3,'Hyderabad','500081',$4,75000,8,'open')`,
      [
        `job-demo-${Date.now()}`,
        'Need electrician for new 3BHK',
        'Builder is finishing a 3BHK. Need full wiring, DB and earthing. Bid privately — estimate is only for the owner and admin.',
        ends,
      ],
    );
  }
}

export async function loginWithPassword(userId: string, password: string) {
  const key = userId.trim();
  const row = key.includes('@') ? await getCredentialByEmail(key) : await getCredentialByUsername(key);
  if (!row || !passwordMatches(password, row.password_hash)) {
    throw new AppError('BAD_LOGIN', 'Wrong user ID or password.', 401);
  }
  if (!row.email_verified) {
    throw new AppError('EMAIL_NOT_VERIFIED', 'Verify your email before signing in.', 403);
  }
  return row;
}
