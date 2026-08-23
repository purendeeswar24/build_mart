/**
 * Live dry-run of the work / bid / bridge flow.
 * Needs the API on :4000 and the four local test accounts.
 *
 *   npm run test:dry --workspace=@buildmart/backend
 */
const BASE = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];

async function req(path: string, opts: { method?: string; body?: unknown; token?: string } = {}) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    headers,
    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, any>;
  return { status: res.status, json };
}

function check(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
}

async function login(userId: string, password: string) {
  const { status, json } = await req('/api/v1/auth/login', { body: { userId, password } });
  if (status !== 200 || !json.token) {
    throw new Error(`login ${userId} failed (${status})`);
  }
  return { token: json.token as string, id: json.user.id as string };
}

async function main() {
  const health = await req('/health');
  check('API is up', health.status === 200, `status=${health.status}`);
  if (health.status !== 200) {
    throw new Error('Start the API first: make up   or   npm run dev:backend');
  }

  const shop = await login('test', 'test');
  const builder = await login('builder', 'builder');
  const bidder = await login('bidder', 'bidder');
  const admin = await login('admin', 'admin');
  check('four distinct test IDs', new Set([shop.id, builder.id, bidder.id, admin.id]).size === 4);

  const created = await req('/api/v1/hire', {
    token: builder.token,
    body: {
      category: 'electrician',
      title: 'Dry-run villa wiring work',
      description: 'Automated dry test. Full villa wiring, DB and earthing. Delete after run.',
      city: 'Hyderabad',
      pincode: '500081',
      daysOpen: 1,
      ownerEstimate: 88000,
    },
  });
  const jobId = created.json.job?.id as string | undefined;
  check('builder opens work with hidden estimate', created.status === 201 && !!jobId, `status=${created.status}`);
  if (!jobId) throw new Error('Could not create dry-run work');

  try {
    const listed = await req('/api/v1/hire', { token: shop.token });
    const card = (listed.json.jobs ?? []).find((j: { id: string }) => j.id === jobId);
    check('public list never includes estimate', card != null && card.ownerEstimate == null);

    const asShop = await req(`/api/v1/hire/${jobId}`, { token: shop.token });
    check('shopper cannot see estimate', asShop.json.job?.ownerEstimate == null && asShop.json.job?.isOwner === false);
    check('shopper cannot see other bids', (asShop.json.job?.bids ?? []).length === 0);

    const asBuilder = await req(`/api/v1/hire/${jobId}`, { token: builder.token });
    check('builder sees own estimate', asBuilder.json.job?.ownerEstimate === 88000 && asBuilder.json.job?.isOwner === true);

    const asBidder = await req(`/api/v1/hire/${jobId}`, { token: bidder.token });
    check('bidder cannot see estimate', asBidder.json.job?.ownerEstimate == null);
    check('bidder cannot see rival bids', (asBidder.json.job?.bids ?? []).length === 0);

    const asAdmin = await req(`/api/v1/hire/${jobId}`, { token: admin.token });
    check(
      'admin sees estimate without becoming owner',
      asAdmin.json.job?.ownerEstimate === 88000 && asAdmin.json.job?.isOwner === false,
    );

    const selfBid = await req(`/api/v1/hire/${jobId}/bids`, {
      token: builder.token,
      body: { amount: 1000 },
    });
    check('builder cannot bid on own work', selfBid.status === 403);

    const bid = await req(`/api/v1/hire/${jobId}/bids`, {
      token: bidder.token,
      body: { amount: 54000, message: 'Crew of four, ten days', daysToComplete: 10 },
    });
    check('bidder places a private bid', bid.status === 201 && bid.json.job?.myBid?.amount === 54000);

    const shopBid = await req(`/api/v1/hire/${jobId}/bids`, {
      token: shop.token,
      body: { amount: 91000, message: 'Second company bid' },
    });
    check('second company can also bid', shopBid.status === 201 && shopBid.json.job?.myBid?.amount === 91000);

    const bidderAgain = await req(`/api/v1/hire/${jobId}`, { token: bidder.token });
    check(
      'first bidder still only sees own amount',
      bidderAgain.json.job?.myBid?.amount === 54000 && (bidderAgain.json.job?.bids ?? []).length === 0,
    );

    const ownerView = await req(`/api/v1/hire/${jobId}`, { token: builder.token });
    const bids = ownerView.json.job?.bids ?? [];
    check('builder sees both bid amounts', bids.length === 2 && bids.some((b: { amount: number }) => b.amount === 54000));
    check('builder does not get bidder phones', bids.every((b: { bidder?: { phone?: string } }) => !b.bidder?.phone));

    const earlyChat = await req(`/api/v1/hire/${jobId}/messages`, { token: builder.token });
    check('bridge stays closed until accept', earlyChat.status === 409);

    const win = bids.find((b: { amount: number }) => b.amount === 54000);
    const award = await req(`/api/v1/hire/${jobId}/award`, {
      token: builder.token,
      body: { bidId: win?.id },
    });
    check('accept opens awarded work', award.status === 200 && award.json.job?.status === 'awarded');
    check('commission stored at 8%', award.json.job?.commissionAmount === 4320);

    const phoneMsg = await req(`/api/v1/hire/${jobId}/messages`, {
      token: builder.token,
      body: { body: 'Call me on 9876543210 whatsapp' },
    });
    check('phone dump is rejected in the bridge', phoneMsg.status === 400);

    const okMsg = await req(`/api/v1/hire/${jobId}/messages`, {
      token: builder.token,
      body: { body: 'Site is open 8am Tuesday. Bring two helpers.' },
    });
    check('clean site note is accepted', okMsg.status === 201 && (okMsg.json.messages ?? []).length >= 2);

    const winnerThread = await req(`/api/v1/hire/${jobId}/messages`, { token: bidder.token });
    check('winner can read the bridge thread', winnerThread.status === 200 && (winnerThread.json.messages ?? []).length >= 2);

    const loserThread = await req(`/api/v1/hire/${jobId}/messages`, { token: shop.token });
    check('losing bidder cannot enter the bridge', loserThread.status === 403);

    const adminRow = await req(`/api/v1/admin/hire/${jobId}`, { token: admin.token });
    check(
      'admin panel has estimate and phones fields',
      adminRow.json.job?.ownerEstimate === 88000 && Object.prototype.hasOwnProperty.call(adminRow.json.job?.owner ?? {}, 'phone'),
    );
  } finally {
    const wiped = await req(`/api/v1/admin/hire/${jobId}`, { method: 'DELETE', token: admin.token });
    check('dry-run work is deleted', wiped.status === 200);
  }

  const failed = results.filter((r) => !r.ok);
  console.log('\nBuildMart hire dry-run\n' + '='.repeat(40));
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`);
    if (!r.ok && r.detail) console.log(`       ${r.detail}`);
  }
  console.log('='.repeat(40));
  console.log(
    failed.length === 0 ? `All ${results.length} dry checks passed.` : `${failed.length}/${results.length} failed.`,
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Dry-run crashed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
