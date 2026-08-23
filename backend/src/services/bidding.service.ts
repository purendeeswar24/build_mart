import { query, queryOne } from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';
import { ensureUser } from './users.service';
import {
  BRIDGE_NOTE,
  HIRE_CATEGORIES,
  blocksDirectContact,
  clampDaysOpen,
  commissionOn,
  isEndingSoon,
  isJobOpen,
  scrubDirectContact,
  viewerAccess,
  type HireCategory,
} from './hire.rules';

export { HIRE_CATEGORIES, type HireCategory };

type JobRow = {
  id: string;
  owner_id: string;
  category: string;
  title: string;
  description: string;
  city: string | null;
  pincode: string | null;
  bidding_ends_at: string;
  owner_estimate: string | number | null;
  commission_percent: string | number;
  status: string;
  awarded_bid_id: string | null;
  commission_amount: string | number | null;
  created_at: string;
  owner_name?: string;
  owner_phone?: string | null;
  owner_email?: string | null;
  bid_count?: string | number;
};

type MessageRow = {
  id: string;
  job_id: string;
  sender_id: string | null;
  sender_role: string;
  body: string;
  created_at: string;
};

function publicMessage(row: MessageRow) {
  return {
    id: row.id,
    role: row.sender_role,
    body: row.body,
    createdAt: row.created_at,
    mine: false,
  };
}

async function insertMessage(jobId: string, senderId: string | null, role: string, body: string) {
  const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await query(
    `insert into hire_messages (id, job_id, sender_id, sender_role, body) values ($1,$2,$3,$4,$5)`,
    [id, jobId, senderId, role, body],
  );
}

async function ensureBridgeThread(job: JobRow) {
  if (job.status !== 'awarded') return;
  const existing = await queryOne<{ id: string }>('select id from hire_messages where job_id = $1 limit 1', [job.id]);
  if (existing) return;
  await insertMessage(
    job.id,
    null,
    'system',
    'BuildMart opened this thread after the builder accepted a bid. Share site details, visit times and materials here. Phone and WhatsApp stay with us.',
  );
}

type BidRow = {
  id: string;
  job_id: string;
  bidder_id: string;
  amount: string | number;
  message: string | null;
  days_to_complete: number | null;
  status: string;
  created_at: string;
  bidder_name?: string;
  bidder_phone?: string | null;
  bidder_email?: string | null;
};

export async function closeExpiredJobs() {
  await query(
    `update hire_jobs
     set status = 'closed', updated_at = now()
     where status = 'open' and bidding_ends_at < now()`,
  );
}

function isOpen(job: JobRow) {
  return isJobOpen(job.status, job.bidding_ends_at);
}

function endingSoon(job: JobRow) {
  return isEndingSoon(job.status, job.bidding_ends_at);
}

function publicJob(job: JobRow, mine?: BidRow | null) {
  return {
    id: job.id,
    category: job.category,
    title: job.title,
    description: job.description,
    city: job.city,
    pincode: job.pincode,
    biddingEndsAt: job.bidding_ends_at,
    status: isOpen(job) ? 'open' : job.status,
    bidCount: Number(job.bid_count ?? 0),
    endingSoon: endingSoon(job),
    createdAt: job.created_at,
    canSeeEstimate: false,
    ownerEstimate: null,
    myBid: mine
      ? {
          id: mine.id,
          amount: Number(mine.amount),
          message: mine.message,
          daysToComplete: mine.days_to_complete,
          status: mine.status,
        }
      : null,
  };
}

export async function listJobs(viewerId?: string) {
  await closeExpiredJobs();
  const jobs = await query<JobRow>(
    `select j.*,
            (select count(*) from hire_bids b where b.job_id = j.id) as bid_count
     from hire_jobs j
     where j.status in ('open', 'closed', 'awarded')
     order by j.bidding_ends_at asc`,
  );
  const myBids = viewerId
    ? await query<BidRow>('select * from hire_bids where bidder_id = $1', [viewerId])
    : [];
  const mineByJob = new Map(myBids.map((b) => [b.job_id, b]));
  return jobs.map((job) => publicJob(job, mineByJob.get(job.id)));
}

export async function listEndingSoon(viewerId?: string) {
  const jobs = await listJobs(viewerId);
  return jobs.filter((job) => job.endingSoon && job.status === 'open').slice(0, 8);
}

export async function createJob(ownerId: string, input: {
  category: HireCategory;
  title: string;
  description: string;
  city?: string;
  pincode?: string;
  daysOpen?: number;
  ownerEstimate?: number;
}) {
  await ensureUser(ownerId);
  const title = input.title.trim();
  const description = input.description.trim();
  if (title.length < 6) throw new AppError('BAD_TITLE', 'Give the job a clearer title.', 400);
  if (description.length < 12) throw new AppError('BAD_DESC', 'Describe the work and requirements.', 400);
  const days = clampDaysOpen(input.daysOpen);
  const id = `job-${Date.now()}`;
  const ends = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  await query(
    `insert into hire_jobs (
       id, owner_id, category, title, description, city, pincode,
       bidding_ends_at, owner_estimate, commission_percent, status
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,8,'open')`,
    [
      id,
      ownerId,
      input.category,
      title,
      description,
      input.city?.trim() || null,
      input.pincode?.replace(/\D/g, '').slice(0, 6) || null,
      ends,
      input.ownerEstimate && input.ownerEstimate > 0 ? input.ownerEstimate : null,
    ],
  );
  return getJob(id, ownerId, 'homeowner');
}

export async function getJob(jobId: string, viewerId?: string, viewerRole?: string) {
  await closeExpiredJobs();
  const job = await queryOne<JobRow>(
    `select j.*, u.full_name as owner_name, u.phone as owner_phone, u.email as owner_email,
            (select count(*) from hire_bids b where b.job_id = j.id) as bid_count
     from hire_jobs j
     join users u on u.id = j.owner_id
     where j.id = $1`,
    [jobId],
  );
  if (!job) throw new AppError('NOT_FOUND', 'Job not found.', 404);

  const myBid = viewerId
    ? await queryOne<BidRow>('select * from hire_bids where job_id = $1 and bidder_id = $2', [jobId, viewerId])
    : null;
  const access = viewerAccess({
    viewerId,
    viewerRole,
    ownerId: job.owner_id,
    jobStatus: isOpen(job) ? 'open' : job.status,
    myBidStatus: myBid?.status,
  });
  const { isAdmin, isOwner, canMessage } = access;
  const base = publicJob(job, myBid);
  const bridge = canMessage ? { open: true, note: BRIDGE_NOTE } : null;

  if (!access.canSeeBids) {
    return {
      ...base,
      isOwner: false,
      canSeeEstimate: false,
      ownerEstimate: null,
      bids: [],
      bridge,
      canMessage,
    };
  }

  const bids = await query<BidRow>(
    `select b.*, u.full_name as bidder_name, u.phone as bidder_phone, u.email as bidder_email
     from hire_bids b
     join users u on u.id = b.bidder_id
     where b.job_id = $1
     order by b.amount asc`,
    [jobId],
  );

  return {
    ...base,
    isOwner,
    canSeeEstimate: access.canSeeEstimate,
    ownerEstimate: access.canSeeEstimate && job.owner_estimate != null ? Number(job.owner_estimate) : null,
    commissionPercent: Number(job.commission_percent),
    commissionAmount: job.commission_amount != null ? Number(job.commission_amount) : null,
    awardedBidId: job.awarded_bid_id,
    bridge,
    canMessage,
    owner: isAdmin
      ? { id: job.owner_id, name: job.owner_name, phone: job.owner_phone, email: job.owner_email }
      : { name: 'You (builder)' },
    bids: bids.map((b) => ({
      id: b.id,
      amount: Number(b.amount),
      message: b.message,
      daysToComplete: b.days_to_complete,
      status: b.status,
      createdAt: b.created_at,
      bidder: isAdmin
        ? { id: b.bidder_id, name: b.bidder_name, phone: b.bidder_phone, email: b.bidder_email }
        : { name: b.bidder_name || 'Service company' },
    })),
  };
}

export async function placeBid(bidderId: string, jobId: string, input: {
  amount: number;
  message?: string;
  daysToComplete?: number;
}) {
  await ensureUser(bidderId);
  await closeExpiredJobs();
  const job = await queryOne<JobRow>('select * from hire_jobs where id = $1', [jobId]);
  if (!job) throw new AppError('NOT_FOUND', 'Job not found.', 404);
  if (job.owner_id === bidderId) throw new AppError('FORBIDDEN', 'You cannot bid on your own job.', 403);
  if (!isOpen(job)) throw new AppError('CLOSED', 'Bidding is closed for this job.', 409);
  if (!(input.amount > 0)) throw new AppError('BAD_AMOUNT', 'Enter a bid amount.', 400);

  const existing = await queryOne<BidRow>(
    'select id from hire_bids where job_id = $1 and bidder_id = $2',
    [jobId, bidderId],
  );
  const id = existing?.id ?? `bid-${Date.now()}`;
  await query(
    `insert into hire_bids (id, job_id, bidder_id, amount, message, days_to_complete, status, updated_at)
     values ($1,$2,$3,$4,$5,$6,'submitted', now())
     on conflict (job_id, bidder_id) do update set
       amount = excluded.amount,
       message = excluded.message,
       days_to_complete = excluded.days_to_complete,
       updated_at = now()`,
    [id, jobId, bidderId, input.amount, input.message?.trim() || null, input.daysToComplete ?? null],
  );
  return getJob(jobId, bidderId);
}

export async function shortlistBid(actorId: string, jobId: string, bidId: string, actorRole?: string) {
  const job = await queryOne<JobRow>('select * from hire_jobs where id = $1', [jobId]);
  if (!job) throw new AppError('NOT_FOUND', 'Job not found.', 404);
  if (job.owner_id !== actorId && actorRole !== 'admin') {
    throw new AppError('FORBIDDEN', 'Only the owner or admin can shortlist a bid.', 403);
  }
  if (job.status === 'awarded' || job.status === 'cancelled') {
    throw new AppError('CLOSED', 'This job can no longer be shortlisted.', 409);
  }
  const bid = await queryOne<BidRow>('select * from hire_bids where id = $1 and job_id = $2', [bidId, jobId]);
  if (!bid) throw new AppError('NOT_FOUND', 'Bid not found.', 404);
  await query(
    `update hire_bids set status = 'shortlisted', updated_at = now() where id = $1`,
    [bidId],
  );
  return getJob(jobId, actorId, actorRole);
}

export async function awardBid(actorId: string, jobId: string, bidId: string, actorRole?: string) {
  await closeExpiredJobs();
  const job = await queryOne<JobRow>('select * from hire_jobs where id = $1', [jobId]);
  if (!job) throw new AppError('NOT_FOUND', 'Job not found.', 404);
  if (job.owner_id !== actorId && actorRole !== 'admin') {
    throw new AppError('FORBIDDEN', 'Only the owner or admin can confirm a bid.', 403);
  }
  if (job.status === 'cancelled') throw new AppError('CANCELLED', 'This job was cancelled.', 409);
  const bid = await queryOne<BidRow>('select * from hire_bids where id = $1 and job_id = $2', [bidId, jobId]);
  if (!bid) throw new AppError('NOT_FOUND', 'Bid not found.', 404);

  const commission = commissionOn(Number(bid.amount), Number(job.commission_percent));
  await query('update hire_bids set status = $2, updated_at = now() where job_id = $1', [jobId, 'rejected']);
  await query('update hire_bids set status = $2, updated_at = now() where id = $1', [bidId, 'awarded']);
  await query(
    `update hire_jobs
     set status = 'awarded', awarded_bid_id = $2, commission_amount = $3, updated_at = now()
     where id = $1`,
    [jobId, bidId, commission],
  );
  await insertMessage(
    jobId,
    null,
    'system',
    'The builder accepted this bid. BuildMart is now the only bridge. Talk here — we will not pass phone or WhatsApp either way.',
  );
  return getJob(jobId, actorId, actorRole);
}

async function assertCanMessage(jobId: string, userId: string, role?: string) {
  const job = await queryOne<JobRow>('select * from hire_jobs where id = $1', [jobId]);
  if (!job) throw new AppError('NOT_FOUND', 'Work not found.', 404);
  if (job.status !== 'awarded') {
    throw new AppError('NO_BRIDGE', 'The builder must accept a bid before you can talk here.', 409);
  }
  if (role === 'admin' || job.owner_id === userId) return { job, senderRole: job.owner_id === userId ? 'owner' : 'admin' };
  const bid = await queryOne<BidRow>(
    'select * from hire_bids where job_id = $1 and bidder_id = $2 and status = $3',
    [jobId, userId, 'awarded'],
  );
  if (!bid) throw new AppError('FORBIDDEN', 'Only the builder, the accepted company, and BuildMart can use this thread.', 403);
  return { job, senderRole: 'bidder' };
}

export async function listMessages(jobId: string, userId: string, role?: string) {
  const { job } = await assertCanMessage(jobId, userId, role);
  await ensureBridgeThread(job);
  const rows = await query<MessageRow>(
    'select * from hire_messages where job_id = $1 order by created_at asc',
    [jobId],
  );
  return {
    note: BRIDGE_NOTE,
    messages: rows.map((row) => ({
      ...publicMessage(row),
      mine: row.sender_id === userId && row.sender_role !== 'system',
    })),
  };
}

export async function postMessage(jobId: string, userId: string, body: string, role?: string) {
  const { senderRole } = await assertCanMessage(jobId, userId, role);
  const clean = scrubDirectContact(body);
  if (blocksDirectContact(body)) {
    throw new AppError('NO_DIRECT_CONTACT', 'Do not share phone or WhatsApp. BuildMart is the only bridge.', 400);
  }
  await insertMessage(jobId, userId, senderRole, clean);
  return listMessages(jobId, userId, role);
}

export async function listMine(userId: string) {
  await closeExpiredJobs();
  const posted = await query<JobRow>(
    `select j.*,
            (select count(*) from hire_bids b where b.job_id = j.id) as bid_count
     from hire_jobs j
     where j.owner_id = $1
     order by j.created_at desc`,
    [userId],
  );
  const bids = await query<BidRow & { title: string; category: string; job_status: string }>(
    `select b.*, j.title, j.category, j.status as job_status
     from hire_bids b
     join hire_jobs j on j.id = b.job_id
     where b.bidder_id = $1
     order by b.created_at desc`,
    [userId],
  );
  return {
    posted: posted.map((job) => publicJob(job)),
    bids: bids.map((b) => ({
      id: b.id,
      jobId: b.job_id,
      title: b.title,
      category: b.category,
      amount: Number(b.amount),
      status: b.status,
      jobStatus: b.job_status,
    })),
  };
}

export async function adminListJobs() {
  await closeExpiredJobs();
  return query(
    `select j.*, u.full_name as owner_name, u.phone as owner_phone, u.email as owner_email,
            (select count(*) from hire_bids b where b.job_id = j.id) as bid_count
     from hire_jobs j
     join users u on u.id = j.owner_id
     order by j.created_at desc`,
  );
}

export async function adminUpdateJob(jobId: string, patch: {
  status?: string;
  title?: string;
  description?: string;
  biddingEndsAt?: string;
}) {
  const job = await queryOne<JobRow>('select id from hire_jobs where id = $1', [jobId]);
  if (!job) throw new AppError('NOT_FOUND', 'Job not found.', 404);
  await query(
    `update hire_jobs set
       status = coalesce($2, status),
       title = coalesce($3, title),
       description = coalesce($4, description),
       bidding_ends_at = coalesce($5, bidding_ends_at),
       updated_at = now()
     where id = $1`,
    [jobId, patch.status ?? null, patch.title ?? null, patch.description ?? null, patch.biddingEndsAt ?? null],
  );
  return getJob(jobId, undefined, 'admin');
}

export async function adminDeleteJob(jobId: string) {
  await query('delete from hire_messages where job_id = $1', [jobId]);
  await query('delete from hire_bids where job_id = $1', [jobId]);
  await query('delete from hire_jobs where id = $1', [jobId]);
}
