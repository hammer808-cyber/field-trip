import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('queueReward keeps a stable identity so effects cannot loop it', () => {
  const app = read('src/context/AppContext.tsx');
  // Nov 16, 2026: queueReward was a fresh function every render, and the
  // persona reveal effect depends on it — so the effect re-fired on every
  // render and queued the same reveal again and again. The live page
  // grew from 335 to 826 duplicate toasts in about two minutes.
  assert.match(app, /const queueReward = React\.useCallback\(/);
  assert.match(app, /sessionSeenRewardsRef = React\.useRef<Set<string>>\(new Set\(\)\)/);
  assert.match(app, /sessionSeenRewardsRef\.current\.has\(limitKey\)/);
  assert.match(app, /sessionSeenRewardsRef\.current\.add\(limitKey\)/);
  // The state version is gone: a state read would go stale inside
  // useCallback([]), and a state dep would change identity per queue.
  assert.doesNotMatch(app, /const \[sessionSeenRewards, setSessionSeenRewards\] = useState/);
  assert.doesNotMatch(app, /sessionSeenRewards\.has\(limitKey\)/);
  // The reveal effect still depends on queueReward — that is safe now
  // that the identity is stable, and it is what the guard relies on.
  const page = read('src/pages/FieldTypeResult.tsx');
  assert.match(page, /\}, \[fieldType, isGuidedReIntro, queueReward\]\);/);
});

test('reward chrome speaks in Trevor\u2019s voice, not bureau-speak', () => {
  const feedback = read('src/components/RewardFeedback.tsx');
  assert.match(feedback, /Trevor confirms it/);
  assert.match(feedback, /You earned this/);
  assert.match(feedback, /Sticker secured/);
  assert.match(feedback, /Got it/);
  assert.match(feedback, /Trevor noticed/);
  assert.doesNotMatch(feedback, /DATA_STREAM_CONFIRMED/);
  assert.doesNotMatch(feedback, /BUREAU_CREDIT_UNLOCKED/);
  assert.doesNotMatch(feedback, /CHAPTER_DECAL_RESTORED/);
  assert.doesNotMatch(feedback, /Acknowledge Receipt/);
  assert.doesNotMatch(feedback, /\{reward\.type\}_UPDATE/);
});
