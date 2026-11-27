// Admin approve override for pre-lock entries (Nov 27, 2026).
//
// Zach's call: his 6:06 AM Golden Hour Glow entry (socal-05) was submitted
// at sunrise, before the card's 4–8 PM lock existed. The server approve
// route now refuses it (TIME_WINDOW_CLOSED, no grandfathering), so the
// Admin Q needs an admin-only override path: Approve fails plainly, the
// page offers "Approve anyway", and the retry skips ONLY the window check.
// The entry itself is approved by Zach in the Admin Q with his own rubric
// scores — nothing here approves anything, and the Q9 rubric gate stays.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isWithinTimeWindow, isTimeWindowClosedMessage } from '../logic/timeWindow';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('isTimeWindowClosedMessage matches only the server time-window refusal', () => {
  assert.equal(isTimeWindowClosedMessage('TIME_WINDOW_CLOSED: this card only counts 4 PM–8 PM'), true);
  assert.equal(isTimeWindowClosedMessage('TIME_WINDOW_CLOSED'), true);
  assert.equal(isTimeWindowClosedMessage('PROOF_RUBRIC_REQUIRED'), false);
  assert.equal(isTimeWindowClosedMessage('REVIEW_ACTION_FAILED_400'), false);
  assert.equal(isTimeWindowClosedMessage(''), false);
  assert.equal(isTimeWindowClosedMessage(null), false);
  assert.equal(isTimeWindowClosedMessage(undefined), false);
});

test('Zach’s exact case: 6 AM is outside socal-05’s 4–8 PM window', () => {
  assert.equal(isWithinTimeWindow(6, { startHour: 16, endHour: 20 }), false);
  assert.equal(isWithinTimeWindow(18, { startHour: 16, endHour: 20 }), true);
});

test('server: the override skips ONLY the window check on approve, and is logged', () => {
  const server = read('server.ts');
  const routeStart = server.indexOf('app.post("/api/admin/proof-review/action"');
  assert.ok(routeStart >= 0, 'approve route exists');
  const route = server.slice(routeStart, server.indexOf('app.post("/api/admin/grant-starter-bypass"'));
  // The flag is a strict boolean read from metadata.
  assert.match(route, /allowTimeWindowOverride = metadata\?\.allowTimeWindowOverride === true/);
  // Without the override the refusal still throws; with it the throw is skipped.
  assert.match(route, /if \(outsideWindow && allowTimeWindowOverride\)/);
  assert.match(route, /} else if \(outsideWindow\) \{/);
  assert.match(route, /TIME_WINDOW_CLOSED: this card only counts/);
  // The override is recorded in the admin log entry the route writes.
  assert.match(route, /timeWindowOverride: timeWindowOverrideUsed/);
  assert.match(route, /timeWindowOverrideWindow/);
  assert.match(route, /timeWindowOverrideHour/);
  // The override never applies to request_info / reject: the whole check
  // lives inside the approve-only branch.
  const windowCheck = route.indexOf('if (outsideWindow && allowTimeWindowOverride)');
  const approveBranch = route.indexOf('if (action === "approve")');
  assert.ok(approveBranch >= 0 && approveBranch < windowCheck, 'window check is inside the approve branch');
});

test('server: the override is admin-only and the rubric gate is unchanged', () => {
  const server = read('server.ts');
  const routeStart = server.indexOf('app.post("/api/admin/proof-review/action"');
  const route = server.slice(routeStart, server.indexOf('app.post("/api/admin/grant-starter-bypass"'));
  // requireAdminUser runs before the flag is read or the transaction opens,
  // so a non-admin never reaches the override.
  const adminCheck = route.indexOf('await requireAdminUser(req)');
  const flagRead = route.indexOf('allowTimeWindowOverride = metadata');
  const transaction = route.indexOf('dbAdmin.runTransaction');
  assert.ok(adminCheck >= 0 && adminCheck < flagRead && flagRead < transaction);
  // Rubric still required on every action, override or not.
  assert.match(route, /buildServerReviewRubric\(metadata, reviewerId\)/);
  assert.match(route, /PROOF_RUBRIC_REQUIRED/);
});

test('client: the metadata type carries the override flag and it reaches the endpoint', () => {
  const lifecycle = read('src/services/proofLifecycleService.ts');
  assert.match(lifecycle, /allowTimeWindowOverride\?: boolean/);
  const submission = read('src/services/submissionService.ts');
  assert.match(submission, /metadata: metadata \|\| \{\}/);
});

test('client: the Approve-anyway offer appears only after a TIME_WINDOW_CLOSED failure', () => {
  const page = read('src/pages/AdminProofReview.tsx');
  assert.match(page, /isTimeWindowClosedMessage/);
  assert.match(page, /import \{ isTimeWindowClosedMessage \} from '\.\.\/logic\/timeWindow'/);
  assert.match(page, /if \(action === 'approve' && review && isTimeWindowClosedMessage\(failureMessage\)\)/);
  assert.match(page, /setTimeWindowOverrideOffer\(\{ id, review, message: failureMessage \}\)/);
  // The retry reuses the same entry and rubric, with the flag on.
  assert.match(page, /handleAction\(timeWindowOverrideOffer\.id, 'approve', timeWindowOverrideOffer\.review, \{ allowTimeWindowOverride: true \}\)/);
  // The flag is sent in the review metadata.
  assert.match(page, /allowTimeWindowOverride: options\?\.allowTimeWindowOverride === true/);
  // The offer clears on success and when the selected entry changes.
  assert.match(page, /setTimeWindowOverrideOffer\(null\)/);
  // Plain copy, no em dashes in the new banner.
  const bannerStart = page.indexOf('{/* Time-window override offer:');
  const bannerEnd = page.indexOf('Main View Area', bannerStart);
  const banner = page.slice(bannerStart, bannerEnd);
  assert.match(banner, /Approve was refused by the time lock/);
  assert.match(banner, /Approve anyway: submitted before this card/);
  assert.match(banner, /The override is recorded in the admin log/);
  assert.doesNotMatch(banner, /—/);
});

test('client: the Q9 rubric gate is untouched — Approve stays disabled until all five are rated', () => {
  const page = read('src/pages/AdminProofReview.tsx');
  assert.match(page, /disabled=\{busy \|\| !entryResolved \|\| !allRated\}/);
  assert.match(page, /if \(action === 'approve' && !allRated\) return;/);
});
