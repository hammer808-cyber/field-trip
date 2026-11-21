/**
 * Community feed social — Option C (Nov 21, 2026).
 *
 * A: comments on the global feed (server endpoints, client service,
 * detail-modal thread, card count, owner notification). B: the Big
 * Board proofs tab is back. C: Public Discovery is a real setting,
 * and the server scope check accepts it (it previously required the
 * same crew even for public photos, so strangers could see a public
 * photo but not hype it).
 *
 * Components that read useApp (CommunityProofCard, the comments
 * thread) are pinned by wiring, the repo's convention for those;
 * the pure copy helper is tested directly.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { communityCommentCopy } from '../logic/playerNotifications';

const read = (path: string) => readFileSync(path, 'utf8');

test('community comments: the copy names the actor and previews the comment', () => {
  const copy = communityCommentCopy({ actorName: 'Daphzee', missionTitle: 'The Initial Signal', preview: 'Love this one' });
  assert.equal(copy.title, 'Daphzee commented on The Initial Signal');
  assert.equal(copy.detail, 'Love this one');
  const fallback = communityCommentCopy({ actorName: '', missionTitle: '', preview: '' });
  assert.equal(fallback.title, 'A player commented on your receipt');
  assert.equal(fallback.detail, 'View the comment.');
});

test('community comments: server endpoints exist with the crew shape', () => {
  const server = read('server.ts');
  assert.match(server, /app\.post\("\/api\/community\/comments"/);
  assert.match(server, /app\.delete\("\/api\/community\/comments\/:commentId"/);
  assert.match(server, /communityFeedComments/);
  assert.match(server, /commentCount: FieldValue\.increment\(1\)/);
  assert.match(server, /type: 'community_comment'/);
});

test('community comments: the scope check accepts public discovery', () => {
  const server = read('server.ts');
  // Before this fix the check required the same crew even for public
  // photos, so a stranger could see a public photo but not hype it.
  assert.match(server, /entryFeedVisibility === 'public_discovery' \|\| visibility === 'public_discovery'/);
  assert.match(server, /interaction\?: 'hype' \| 'sus' \| 'comment'/);
});

test('community comments: rules gate reads on the receipt, writes are server-only', () => {
  const rules = read('firestore.rules');
  assert.match(rules, /match \/communityFeedComments\/\{commentId\}/);
  assert.match(rules, /canReadCommunityComment\(resource\.data\)/);
  assert.match(rules, /function canReadCommunityComment\(data\)/);
  assert.match(rules, /canReadSocialEntry\(get\(\/databases\/\$\(database\)\/documents\/entries\/\$\(entryId\)\)\.data\)/);
});

test('community comments: card shows the count and the modal shows the thread', () => {
  const card = read('src/components/CommunityProofCard.tsx');
  assert.match(card, /proof\.commentCount/);
  assert.match(card, /Be the first to comment/);
  assert.match(card, /<CommunityReceiptComments entryId=\{proof\.id\} \/>/);
  const thread = read('src/components/CommunityReceiptComments.tsx');
  assert.match(thread, /subscribeToCommunityComments/);
  assert.match(thread, /Post comment/);
  assert.match(thread, /maxLength=\{500\}/);
  const service = read('src/services/communityFeedComments.ts');
  assert.match(service, /\/api\/community\/comments/);
  assert.match(service, /where\('entryId', '==', entryId\)/);
});

test('community comments: the owner is notified like a crew comment', () => {
  const service = read('src/services/playerNotificationService.ts');
  assert.match(service, /data\.type === 'community_comment'/);
  const viewModel = read('src/logic/basecampViewModel.ts');
  assert.match(viewModel, /notification\.type === 'community_comment'/);
  assert.match(viewModel, /href: '\/dex\/memories\/community'/);
});

test('community feed: the Big Board proofs tab is back', () => {
  const board = read('src/pages/BigBoard.tsx');
  assert.match(board, /\{ id: "proofs", label: "Community Feed" \}/);
});

test('visibility: Public Discovery is a real setting, not coming later', () => {
  const profile = read('src/pages/Profile.tsx');
  assert.match(profile, /const available = value !== 'followers_only';/);
  assert.doesNotMatch(profile, /Public discovery is reserved for a deliberate future discovery surface/);
  assert.match(profile, /flips your past receipts public too/);
});

test('community feed social: the new files carry no hard-coded hex', () => {
  for (const path of [
    'src/components/CommunityReceiptComments.tsx',
    'src/services/communityFeedComments.ts',
  ]) {
    const src = read(path);
    assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b/, `${path} has a hard-coded hex`);
  }
});
