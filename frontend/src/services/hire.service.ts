import { apiClient } from './apiClient';

export const HIRE_CATEGORIES = [
  { value: 'electrician', label: 'Electrician' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'mason', label: 'Mason' },
  { value: 'carpenter', label: 'Carpenter' },
  { value: 'painter', label: 'Painter' },
  { value: 'fabricator', label: 'Fabricator' },
  { value: 'civil', label: 'Civil / RCC' },
  { value: 'tiles', label: 'Tiles / Flooring' },
  { value: 'other', label: 'Other trade' },
] as const;

export type HireJobCard = {
  id: string;
  category: string;
  title: string;
  description: string;
  city?: string | null;
  pincode?: string | null;
  biddingEndsAt: string;
  status: string;
  bidCount: number;
  endingSoon: boolean;
  myBid?: {
    id: string;
    amount: number;
    message?: string | null;
    daysToComplete?: number | null;
    status: string;
  } | null;
  isOwner?: boolean;
  canSeeEstimate?: boolean;
  ownerEstimate?: number | null;
  commissionPercent?: number;
  commissionAmount?: number | null;
  bids?: Array<{
    id: string;
    amount: number;
    message?: string | null;
    daysToComplete?: number | null;
    status: string;
    bidder: { id?: string; name?: string; phone?: string | null; email?: string | null };
  }>;
  contact?: { note: string; ownerName?: string } | null;
  bridge?: { open: boolean; note: string } | null;
  canMessage?: boolean;
};

export type HireMessage = {
  id: string;
  role: string;
  body: string;
  createdAt: string;
  mine: boolean;
};

export function hireCategoryLabel(value: string) {
  return HIRE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function hireTimeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return 'Closed';
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h left`;
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}h ${mins}m left`;
}

export function formatInr(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export const hireService = {
  async list() {
    return apiClient.get<{ jobs: HireJobCard[] }>('/api/v1/hire');
  },
  async endingSoon() {
    return apiClient.get<{ jobs: HireJobCard[] }>('/api/v1/hire/ending-soon');
  },
  async get(id: string) {
    return apiClient.get<{ job: HireJobCard }>(`/api/v1/hire/${id}`);
  },
  async mine() {
    return apiClient.get<{ posted: HireJobCard[]; bids: Array<{ id: string; jobId: string; title: string; amount: number; status: string }> }>(
      '/api/v1/hire/mine',
    );
  },
  async create(input: {
    category: string;
    title: string;
    description: string;
    city?: string;
    pincode?: string;
    daysOpen?: number;
    ownerEstimate?: number;
  }) {
    return apiClient.post<{ job: HireJobCard }>('/api/v1/hire', input);
  },
  async bid(jobId: string, input: { amount: number; message?: string; daysToComplete?: number }) {
    return apiClient.post<{ job: HireJobCard }>(`/api/v1/hire/${jobId}/bids`, input);
  },
  async shortlist(jobId: string, bidId: string) {
    return apiClient.post<{ job: HireJobCard }>(`/api/v1/hire/${jobId}/shortlist`, { bidId });
  },
  async award(jobId: string, bidId: string) {
    return apiClient.post<{ job: HireJobCard }>(`/api/v1/hire/${jobId}/award`, { bidId });
  },
  async messages(jobId: string) {
    return apiClient.get<{ note: string; messages: HireMessage[] }>(`/api/v1/hire/${jobId}/messages`);
  },
  async sendMessage(jobId: string, body: string) {
    return apiClient.post<{ note: string; messages: HireMessage[] }>(`/api/v1/hire/${jobId}/messages`, { body });
  },
};
