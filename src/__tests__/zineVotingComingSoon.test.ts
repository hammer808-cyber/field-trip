import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('zines parked behind its kill switch; voting shipped (flag true), players pass the gate', () => {
  const progress = read('src/services/canonicalProgress.ts');
  // Nov 17, 2026: both sections were parked until figured out. Voting
  // SHIPPED Nov 21, 2026 (global weekly voting) — flip the flag back to
  // false to re-park it; the gate below is what shows the panel.
  assert.match(progress, /export const ZINES_ENABLED = false;/);
  assert.match(progress, /export const VOTING_ENABLED = true;/);
  assert.match(progress, /if \(featureKey === 'zines'\) return ZINES_ENABLED;/);
  assert.match(progress, /if \(featureKey === 'voting'\) return VOTING_ENABLED;/);

  const gate = read('src/components/StarterGate.tsx');
  assert.match(gate, /requiredFeature: 'crew' \| 'memories' \| 'leaderboard' \| 'voting' \| 'loteria' \| 'zines'/);
  assert.match(gate, /zines: 'Zines',/);
  assert.match(gate, /loteria: !LOTERIA_ENABLED,/);
  assert.match(gate, /zines: !ZINES_ENABLED,/);
  assert.match(gate, /voting: !VOTING_ENABLED,/);
  assert.match(gate, /return <GatedFeaturePanel featureName=\{FEATURE_LABEL\[requiredFeature\]\} reason="coming_soon" \/>;/);
  // Admins pass through the gate, same as every other lock.
  assert.match(gate, /if \(isFeatureUnlocked \|\| isAdmin\)/);

  const panel = read('src/components/GatedFeaturePanel.tsx');
  assert.match(panel, /'Voting' \| 'Dex' \| 'Big Board' \| 'Loteria' \| 'Crew' \| 'Zines'/);
  assert.match(panel, /\{reason === 'coming_soon' \? 'Coming soon' : 'Locked for now'\}/);
  assert.match(panel, /\{featureName\} is coming soon/);
});

test('zines: the workspace itself is gated, so both surfaces lock', () => {
  const workspace = read('src/components/ZineWorkspace.tsx');
  // One gate inside the workspace covers the DEX Zines tab and the
  // Crew zine tab — no render site can show zines while parked.
  assert.match(workspace, /export function ZineWorkspace\(props: ZineWorkspaceProps\) \{/);
  assert.match(workspace, /<StarterGate requiredFeature="zines">/);
  assert.match(workspace, /<ZineWorkspaceInner \{\.\.\.props\} \/>/);
  // The tab stays in the DEX bar: players tap in and meet the panel.
  const dex = read('src/pages/Collection.tsx');
  assert.match(dex, /\{ id: 'zines', label: 'Zines' \}/);
});

test('voting: every route in the tree goes through the gate', () => {
  const app = read('src/App.tsx');
  assert.match(app, /<Route index element=\{<StarterGate requiredFeature="voting"><VotingHubPage \/><\/StarterGate>} \/>/);
  assert.match(app, /<Route path="ballot" element=\{<StarterGate requiredFeature="voting"><VotingBallotPage \/><\/StarterGate>} \/>/);
  assert.match(app, /<Route path="council" element=\{<StarterGate requiredFeature="voting"><SnitchCouncilPage \/><\/StarterGate>} \/>/);
  assert.match(app, /<Route path="awards" element=\{<StarterGate requiredFeature="voting"><WeeklyAwardsPage \/><\/StarterGate>} \/>/);
  // The weekly/tribunal/results shortcuts just land on the gated hub.
  assert.match(app, /<Route path="weekly" element=\{<Navigate to="\/voting\?tab=vote" replace \/>} \/>/);
  // The bottom-nav entry stays: players tap in and meet the panel.
  const nav = read('src/components/BottomNav.tsx');
  assert.match(nav, /label: 'VOTING', path: '\/voting'/);
});
