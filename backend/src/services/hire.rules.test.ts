import assert from 'node:assert/strict';
import {
  blocksDirectContact,
  clampDaysOpen,
  commissionOn,
  isEndingSoon,
  isHireCategory,
  isJobOpen,
  scrubDirectContact,
  viewerAccess,
} from './hire.rules';

type Case = { name: string; fn: () => void };
const cases: Case[] = [];
function test(name: string, fn: () => void) {
  cases.push({ name, fn });
}

test('clampDaysOpen defaults to 5', () => {
  assert.equal(clampDaysOpen(undefined), 5);
  assert.equal(clampDaysOpen(Number.NaN), 5);
});

test('clampDaysOpen keeps 1–14', () => {
  assert.equal(clampDaysOpen(1), 1);
  assert.equal(clampDaysOpen(14), 14);
  assert.equal(clampDaysOpen(0), 1);
  assert.equal(clampDaysOpen(99), 14);
  assert.equal(clampDaysOpen(3.9), 3);
});

test('commissionOn is 8% rounded to paise', () => {
  assert.equal(commissionOn(27500, 8), 2200);
  assert.equal(commissionOn(61000, 8), 4880);
  assert.equal(commissionOn(100, 8), 8);
  assert.equal(commissionOn(99, 8), 7.92);
});

test('isJobOpen is false after the window', () => {
  const past = new Date(Date.now() - 60_000).toISOString();
  assert.equal(isJobOpen('open', past), false);
});

test('isJobOpen is false when status is not open', () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  assert.equal(isJobOpen('awarded', future), false);
  assert.equal(isJobOpen('closed', future), false);
});

test('isJobOpen is true while the window is live', () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  assert.equal(isJobOpen('open', future), true);
});

test('ending soon is true inside 36 hours', () => {
  const soon = new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString();
  assert.equal(isEndingSoon('open', soon), true);
});

test('ending soon is false when more than 36 hours remain', () => {
  const later = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(isEndingSoon('open', later), false);
});

test('ending soon is false after award', () => {
  const soon = new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString();
  assert.equal(isEndingSoon('awarded', soon), false);
});

test('scrub hides Indian mobiles and +91', () => {
  assert.match(scrubDirectContact('call 9876543210 tonight'), /\[hidden\]/);
  assert.match(scrubDirectContact('reach +919876543210'), /\[hidden\]/);
});

test('scrub hides email and WhatsApp', () => {
  assert.match(scrubDirectContact('mail me at site@gmail.com'), /\[hidden\]/);
  assert.match(scrubDirectContact('whatsapp me after 6'), /\[hidden\]/);
});

test('scrub keeps a normal site note', () => {
  const note = 'Site is open 8am. Come Tuesday with two helpers.';
  assert.equal(scrubDirectContact(note), note);
  assert.equal(blocksDirectContact(note), false);
});

test('blocksDirectContact rejects phone dumps', () => {
  assert.equal(blocksDirectContact('Call me on 9876543210 whatsapp'), true);
  assert.equal(blocksDirectContact('   '), true);
});

test('shopper and bidder cannot see estimate or other bids', () => {
  const shop = viewerAccess({
    viewerId: 'u-test',
    viewerRole: 'homeowner',
    ownerId: 'u-builder',
    jobStatus: 'open',
  });
  assert.equal(shop.canSeeEstimate, false);
  assert.equal(shop.canSeeBids, false);
  assert.equal(shop.canBid, true);
  assert.equal(shop.isOwner, false);
});

test('builder can see estimate and bids on their work', () => {
  const owner = viewerAccess({
    viewerId: 'u-builder',
    viewerRole: 'contractor',
    ownerId: 'u-builder',
    jobStatus: 'open',
  });
  assert.equal(owner.canSeeEstimate, true);
  assert.equal(owner.canSeeBids, true);
  assert.equal(owner.canBid, false);
  assert.equal(owner.isOwner, true);
});

test('admin can see estimate even when not the owner', () => {
  const admin = viewerAccess({
    viewerId: 'u-admin',
    viewerRole: 'admin',
    ownerId: 'u-builder',
    jobStatus: 'open',
  });
  assert.equal(admin.canSeeEstimate, true);
  assert.equal(admin.canSeeBids, true);
  assert.equal(admin.isOwner, false);
});

test('bridge chat opens only after award for owner and winner', () => {
  const before = viewerAccess({
    viewerId: 'u-builder',
    ownerId: 'u-builder',
    jobStatus: 'open',
  });
  assert.equal(before.canMessage, false);

  const owner = viewerAccess({
    viewerId: 'u-builder',
    ownerId: 'u-builder',
    jobStatus: 'awarded',
    myBidStatus: null,
  });
  const winner = viewerAccess({
    viewerId: 'u-bidder',
    ownerId: 'u-builder',
    jobStatus: 'awarded',
    myBidStatus: 'awarded',
  });
  const loser = viewerAccess({
    viewerId: 'u-test',
    ownerId: 'u-builder',
    jobStatus: 'awarded',
    myBidStatus: 'rejected',
  });
  assert.equal(owner.canMessage, true);
  assert.equal(winner.canMessage, true);
  assert.equal(loser.canMessage, false);
});

test('known trades are accepted', () => {
  assert.equal(isHireCategory('electrician'), true);
  assert.equal(isHireCategory('plumber'), true);
  assert.equal(isHireCategory('hacker'), false);
});

let failed = 0;
for (const c of cases) {
  try {
    c.fn();
    console.log(`PASS  ${c.name}`);
  } catch (err) {
    failed += 1;
    console.log(`FAIL  ${c.name}`);
    console.log(`      ${err instanceof Error ? err.message : err}`);
  }
}
console.log(failed === 0 ? `All ${cases.length} unit tests passed.` : `${failed}/${cases.length} failed.`);
process.exit(failed === 0 ? 0 : 1);
