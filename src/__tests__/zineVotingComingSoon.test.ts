import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('zines shipped (flag true); the per-season lock lives in the workspace', () => {
  const progress = read('src/services/canonicalProgress.ts');
  // Nov 17, 2026: zines was parked until figured out. SHIPPED Nov 21,
  // 2026 (scenes inside the zine book, one zine per season) — flip
  // the flag back to false to re-park it; the gate below is what
  // shows the panel when a feature is locked.
  assert.match(progress, /export const ZINES_ENABLED = true;/);
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

  // The season-end lock lives in the workspace, not the kill switch:
  // the active season's zine opens the morning after the season ends.
  const workspace = read('src/components/ZineWorkspace.tsx');
  assert.match(workspace, /seasonLocked/);
  assert.match(workspace, /zine opens \{formatOpenDate/);
});

test('zines: the workspace itself is gated, so both surfaces lock', () => {
  const workspace = read('src/components/ZineWorkspace.tsx');
  // One gate inside the workspace covers the DEX Zines tab and the
  // Crew zine tab. The gate now passes (ZINES_ENABLED = true); the
  // per-season lock inside the workspace is what holds a running
  // season's zine.
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
