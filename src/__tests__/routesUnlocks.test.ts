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
const deckSource = readFileSync('src/pages/Deck.tsx', 'utf8');
const appContextSource = readFileSync('src/context/AppContext.tsx', 'utf8');
const rewardFeedbackSource = readFileSync('src/components/RewardFeedback.tsx', 'utf8');
const collectionSource = readFileSync('src/pages/Collection.tsx', 'utf8');

test('unlocked crew and memories have stable route targets', () => {
  assert.match(appSource, /<Route path="\/crew" element=\{<StarterGate requiredFeature="crew"><Crew \/><\/StarterGate>\}/);
  assert.match(appSource, /<Route path="\/memories" element=\{<StarterGate requiredFeature="memories"><Navigate to="\/collection\?tab=crew_home" replace \/><\/StarterGate>\}/);
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
  assert.match(bottomNavSource, /label: 'THE DEX', path: '\/memories'/);
  assert.match(basecampSource, /navigate\('\/memories'\)/);
  assert.match(submittedSource, /navigate\('\/memories'\)/);
});

test('Dex opens on Crew Home and no longer exposes Personas as a tab', () => {
  assert.match(collectionSource, /type CollectionTab = 'crew_home'/);
  assert.match(collectionSource, /const initialTab = .* \|\| 'crew_home'/);
  assert.match(collectionSource, /\{ id: 'crew_home', label: 'Crew Home' \}/);
  assert.doesNotMatch(collectionSource, /label: 'Personas'/);
  assert.doesNotMatch(collectionSource, /activeTab === 'skins'/);
});

test('Voting routes remain reachable from the primary nav', () => {
  assert.match(appSource, /<Route path="\/voting">/);
  assert.match(appSource, /<Route index element=\{<StarterGate requiredFeature="voting"><VotingHubPage \/><\/StarterGate>\}/);
  assert.match(appSource, /<Route path="ballot" element=\{<StarterGate requiredFeature="voting"><VotingBallotPage \/><\/StarterGate>\}/);
  assert.match(appSource, /<Route path="council" element=\{<StarterGate requiredFeature="voting"><SnitchCouncilPage \/><\/StarterGate>\}/);
  assert.match(appSource, /<Route path="awards" element=\{<StarterGate requiredFeature="voting"><WeeklyAwardsPage \/><\/StarterGate>\}/);
  assert.match(bottomNavSource, /label: 'VOTE', path: '\/voting'/);
  assert.match(bottomNavSource, /itemPathname === '\/voting' && !canAccessFeature\(canonicalProgress, 'voting'/);
});

test('Starter completion intro cannot globally trap completed users away from Crew or Voting', () => {
  assert.doesNotMatch(appSource, /hasSeenDeckChooserIntro[\s\S]{0,240}<Navigate to="\/deck" replace \/>/);
  assert.match(appSource, /Starter completion intro is optional and lives on \/deck/);
  assert.match(deckSource, /deckChooserIntroDismissed/);
  assert.match(deckSource, /acknowledgeDeckChooserIntro/);
  assert.match(deckSource, /getFirstPlayablePostStarterPackId/);
  assert.match(appContextSource, /redirectPath: isSeasonStarted \? '\/deck\?pack=heatwave-receipts&intro=ack'/);
  assert.match(deckSource, /DECK_CHOOSER_INTRO_ACK_KEY/);
  assert.match(deckSource, /localStorage\.setItem\(DECK_CHOOSER_INTRO_ACK_KEY, 'true'\)/);
  assert.match(rewardFeedbackSource, /onDismiss\(\);\s*if \(reward\.redirectPath\)/);
});

test('Deck diagnostics exposes Starter completion sources and admin repair action', () => {
  assert.match(deckDiagnosticsSource, /canonical approved Starter IDs/);
  assert.match(deckDiagnosticsSource, /legacy approved Starter IDs/);
  assert.match(deckDiagnosticsSource, /excluded starter records/);
  assert.match(deckDiagnosticsSource, /\/api\/admin\/repair-user/);
  assert.match(deckDiagnosticsSource, /Preview Starter Completion Repair/);
  assert.match(deckDiagnosticsSource, /Repair Starter Completion/);
});
