export const HIRE_CATEGORIES = [
  'electrician',
  'plumber',
  'mason',
  'carpenter',
  'painter',
  'fabricator',
  'civil',
  'tiles',
  'other',
] as const;

export type HireCategory = (typeof HIRE_CATEGORIES)[number];

export const BRIDGE_NOTE =
  'Talk only inside BuildMart. We do not share phone, WhatsApp or email — this is how we stay in the middle and collect commission.';

export const ENDING_SOON_MS = 36 * 60 * 60 * 1000;

export function isHireCategory(value: string): value is HireCategory {
  return (HIRE_CATEGORIES as readonly string[]).includes(value);
}

export function clampDaysOpen(days?: number) {
  const n = Number(days);
  if (!Number.isFinite(n)) return 5;
  return Math.min(14, Math.max(1, Math.trunc(n)));
}

export function commissionOn(amount: number, percent: number) {
  return Number(((Number(amount) * Number(percent)) / 100).toFixed(2));
}

export function isJobOpen(status: string, biddingEndsAt: string, now = Date.now()) {
  return status === 'open' && new Date(biddingEndsAt).getTime() > now;
}

export function isEndingSoon(status: string, biddingEndsAt: string, now = Date.now()) {
  const left = new Date(biddingEndsAt).getTime() - now;
  return isJobOpen(status, biddingEndsAt, now) && left > 0 && left <= ENDING_SOON_MS;
}

export function scrubDirectContact(text: string) {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[hidden]')
    .replace(/(?:\+91[\s-]?)?[6-9]\d{9}\b/g, '[hidden]')
    .replace(/\b(?:whats?app|telegram|insta(?:gram)?)\b[:\s-]*/gi, '[hidden] ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function blocksDirectContact(raw: string) {
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  const clean = scrubDirectContact(raw);
  return clean.length < 2 || clean.includes('[hidden]') || clean !== collapsed;
}

export function viewerAccess(input: {
  viewerId?: string;
  viewerRole?: string;
  ownerId: string;
  jobStatus: string;
  myBidStatus?: string | null;
}) {
  const isAdmin = input.viewerRole === 'admin';
  const isOwner = !!input.viewerId && input.viewerId === input.ownerId;
  const isWinner = input.myBidStatus === 'awarded';
  return {
    isAdmin,
    isOwner,
    isWinner,
    canSeeEstimate: isOwner || isAdmin,
    canSeeBids: isOwner || isAdmin,
    canBid: !!input.viewerId && !isOwner,
    canMessage: input.jobStatus === 'awarded' && (isAdmin || isOwner || isWinner),
  };
}
