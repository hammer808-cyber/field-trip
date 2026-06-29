import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync('src/App.tsx', 'utf8');
const starterGateSource = readFileSync('src/components/StarterGate.tsx', 'utf8');
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

test('Memories entry points route to the canonical memories alias', () => {
  assert.match(bottomNavSource, /label: 'MEMORIES', path: '\/memories'/);
  assert.match(basecampSource, /navigate\('\/memories'\)/);
  assert.match(submittedSource, /navigate\('\/memories'\)/);
});
