import { FormEvent, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost } from '../api';

type Bid = {
  id: string;
  amount: number;
  message?: string | null;
  daysToComplete?: number | null;
  status: string;
  bidder: { id?: string; name?: string; phone?: string | null; email?: string | null };
};

type Job = {
  id: string;
  title: string;
  description: string;
  category: string;
  city?: string | null;
  pincode?: string | null;
  status: string;
  biddingEndsAt?: string;
  bidding_ends_at?: string;
  bidCount?: number;
  bid_count?: number;
  ownerEstimate?: number | null;
  owner_estimate?: number | string | null;
  commissionPercent?: number;
  commission_percent?: number | string;
  commissionAmount?: number | null;
  commission_amount?: number | string | null;
  owner?: { id?: string; name?: string; phone?: string | null; email?: string | null };
  owner_name?: string;
  owner_phone?: string | null;
  owner_email?: string | null;
  bids?: Bid[];
};

type ThreadMsg = { id: string; role: string; body: string; createdAt: string; mine?: boolean };

function money(v: number | string | null | undefined) {
  if (v == null || v === '') return '—';
  return `₹${Number(v).toLocaleString('en-IN')}`;
}

export function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<Job | null>(null);
  const [source, setSource] = useState('Loading hire jobs…');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('open');
  const [ends, setEnds] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [messages, setMessages] = useState<ThreadMsg[]>([]);
  const [reply, setReply] = useState('');

  const load = async () => {
    const res = await apiGet<{ jobs: Job[] }>('/api/v1/admin/hire');
    setJobs(res.jobs ?? []);
    setSource(
      res.jobs?.length
        ? 'Admin sees every phone. Builder and company never get each other’s numbers — they talk in the BuildMart thread.'
        : 'No work yet — a builder can open one from the shop Work tab.',
    );
  };

  useEffect(() => {
    load().catch(() => setSource('API offline — start the backend on port 4000'));
  }, []);

  const openJob = async (id: string) => {
    setError('');
    setOk('');
    const res = await apiGet<{ job: Job; messages?: ThreadMsg[] }>(`/api/v1/admin/hire/${id}`);
    setSelected(res.job);
    setMessages(res.messages ?? []);
    setTitle(res.job.title);
    setDescription(res.job.description);
    setStatus(res.job.status);
    setEnds((res.job.biddingEndsAt ?? res.job.bidding_ends_at ?? '').slice(0, 16));
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setError('');
    try {
      const res = await apiPatch<{ job: Job }>(`/api/v1/admin/hire/${selected.id}`, {
        title,
        description,
        status,
        biddingEndsAt: ends ? new Date(ends).toISOString() : undefined,
      });
      setSelected(res.job);
      setOk('Job updated.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const award = async (bidId: string) => {
    if (!selected) return;
    try {
      const res = await apiPost<{ job: Job }>(`/api/v1/admin/hire/${selected.id}/award`, { bidId });
      setSelected(res.job);
      setOk('Accepted. Thread is open — they can talk only through BuildMart. Commission is stored.');
      const thread = await apiGet<{ messages?: ThreadMsg[] }>(`/api/v1/admin/hire/${selected.id}`);
      setMessages(thread.messages ?? []);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Award failed');
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    try {
      const res = await apiPost<{ messages: ThreadMsg[] }>(`/api/v1/admin/hire/${selected.id}/messages`, {
        body: reply.trim(),
      });
      setMessages(res.messages ?? []);
      setReply('');
      setOk('Posted in the BuildMart thread. They will not see your phone.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this job and every bid on it?')) return;
    await apiDelete(`/api/v1/admin/hire/${id}`);
    if (selected?.id === id) setSelected(null);
    await load();
  };

  return (
    <div>
      <h1>Work & bids</h1>
      <p className="lede">{source}</p>

      <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Job</th>
            <th>Owner</th>
            <th>Owner estimate</th>
            <th>Window</th>
            <th>Bids</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>
                <strong>{job.title}</strong>
                <div className="muted">
                  {job.category} · {job.city || '—'} {job.pincode || ''}
                </div>
              </td>
              <td>
                {job.owner_name || job.owner?.name || '—'}
                <div className="muted">
                  {job.owner_phone || job.owner?.phone || '—'} · {job.owner_email || job.owner?.email || '—'}
                </div>
              </td>
              <td>
                {money(job.owner_estimate ?? job.ownerEstimate)}
                <div className="muted">Hidden from bidders</div>
              </td>
              <td>{(job.bidding_ends_at || job.biddingEndsAt || '').toString().replace('T', ' ').slice(0, 16)}</td>
              <td>{job.bid_count ?? job.bidCount ?? 0}</td>
              <td>
                <span className="badge">{job.status}</span>
              </td>
              <td>
                <button type="button" className="btn" style={{ marginTop: 0 }} onClick={() => void openJob(job.id)}>
                  Open
                </button>{' '}
                <button type="button" className="btn-danger" onClick={() => void remove(job.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {selected ? (
        <form className="card" onSubmit={(e) => void save(e)} style={{ marginTop: 22 }}>
          <h2>
            {selected.id} · estimate {money(selected.ownerEstimate ?? selected.owner_estimate)} (hidden from bidders)
          </h2>
          {selected.owner ? (
            <p className="muted">
              Owner {selected.owner.name} · {selected.owner.phone || 'no phone'} · {selected.owner.email || 'no email'}
            </p>
          ) : null}
          <div className="form-grid">
            <label className="span-2">
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="span-2">
              Description
              <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <label>
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="open">open</option>
                <option value="closed">closed</option>
                <option value="awarded">awarded</option>
                <option value="cancelled">cancelled</option>
              </select>
            </label>
            <label>
              Bidding ends
              <input type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} />
            </label>
          </div>
          <button className="btn" type="submit">
            Save job
          </button>
          {ok ? <p className="form-ok">{ok}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          <h2 style={{ marginTop: 22 }}>Bids (private to owner + admin)</h2>
          {(selected.bids ?? []).length === 0 ? (
            <p className="muted">No bids yet.</p>
          ) : (
            <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Bidder</th>
                  <th>Amount</th>
                  <th>Note</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {selected.bids?.map((bid) => (
                  <tr key={bid.id}>
                    <td>
                      <strong>{bid.bidder.name || bid.bidder.id}</strong>
                      <div className="muted">
                        {bid.bidder.phone || '—'} · {bid.bidder.email || '—'}
                      </div>
                    </td>
                    <td>{money(bid.amount)}</td>
                    <td>
                      {bid.message || '—'}
                      {bid.daysToComplete ? <div className="muted">{bid.daysToComplete} days</div> : null}
                    </td>
                    <td>
                      <span className="badge">{bid.status}</span>
                    </td>
                    <td>
                      {bid.status !== 'awarded' ? (
                        <button type="button" className="btn" style={{ marginTop: 0 }} onClick={() => void award(bid.id)}>
                          Accept — open bridge
                        </button>
                      ) : (
                        <span className="muted">
                          Commission {money(selected.commissionAmount ?? selected.commission_amount)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}

          <h2 style={{ marginTop: 22 }}>BuildMart bridge thread</h2>
          <p className="muted">Builder and company only see this chat. You see phones above; they never do.</p>
          {messages.length === 0 ? (
            <p className="muted">Thread opens after a bid is accepted.</p>
          ) : (
            <div className="card" style={{ marginTop: 12 }}>
              {messages.map((m) => (
                <p key={m.id} className="muted" style={{ marginTop: 8 }}>
                  <strong>{m.role}</strong> · {m.body}
                </p>
              ))}
            </div>
          )}
          {selected.status === 'awarded' ? (
            <label className="span-2" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
              Reply as BuildMart desk
              <textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} />
              <button type="button" className="btn" onClick={() => void sendReply()}>
                Send through the bridge
              </button>
            </label>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
