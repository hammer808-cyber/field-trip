import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync('src/App.tsx', 'utf8');
const starterGateSource = readFileSync('src/components/StarterGate.tsx', 'utf8');
const canonicalProgressSource = readFileSync('src/services/canonicalProgress.ts', 'utf8');
const deckDiagnosticsSource = readFileSync('src/components/DeckDiagnosticsPanel.tsx', 'utf8');
const bottomNavSource = readFileSync('src/components/BottomNav.tsx', 'utf8');
const basecampSource = readFileSync('src/pages/Basecamp.tsx', 'utf8');
const submittedSource = readFileSync('src/pages/MissionSubmitted.tsx', 'utf8');

test('unlocked crew and memories have stable route targets', () => {
  assert.match(appSource, /<Route path="\/crew" element=\{<StarterGate requiredFeature="crew"><Crew \/><\/StarterGate>\}/);
  assert.match(appSource, /<Route path="\/memories" element=\{<StarterGate requiredFeature="memories"><Navigate to="\/collection\?tab=crew_memories" replace \/><\/StarterGate>\}/);
  assert.match(appSource, /'\/memories'/);
});

test('StarterGate uses the requested feature instead of a hardcoded crew check', () => {
  assert.match(starterGateSource, /requiredFeature, children/);
  assert.match(starterGateSource, /const featureKey = requiredFeature === 'leaderboard' \? 'voting' : requiredFeature;/);
  assert.match(starterGateSource, /canAccessFeature\(canonicalProgress, featureKey, \{ isAdmin \}\)/);
  assert.doesNotMatch(starterGateSource, /canAccessFeature\(canonicalProgress, 'crew', \{ isAdmin \}\)/);
});

test('route guards use canonical progress backed by the shared Starter selector', () => {
  assert.match(canonicalProgressSource, /buildCanonicalStarterDeckState/);
  assert.match(canonicalProgressSource, /canonicalStarterState\.starterComplete/);
  assert.match(starterGateSource, /canAccessFeature\(canonicalProgress, featureKey, \{ isAdmin \}\)/);
});

test('Memories entry points route to the canonical memories alias', () => {
  assert.match(bottomNavSource, /label: 'MEMORIES', path: '\/memories'/);
  assert.match(basecampSource, /navigate\('\/memories'\)/);
  assert.match(submittedSource, /navigate\('\/memories'\)/);
});

test('Deck diagnostics exposes Starter completion sources and admin repair action', () => {
  assert.match(deckDiagnosticsSource, /canonical approved Starter IDs/);
  assert.match(deckDiagnosticsSource, /legacy approved Starter IDs/);
  assert.match(deckDiagnosticsSource, /excluded starter records/);
  assert.match(deckDiagnosticsSource, /\/api\/admin\/repair-user/);
  assert.match(deckDiagnosticsSource, /Preview Starter Completion Repair/);
  assert.match(deckDiagnosticsSource, /Repair Starter Completion/);
});
