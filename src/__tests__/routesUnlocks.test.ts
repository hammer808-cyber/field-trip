import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync('src/App.tsx', 'utf8');
const starterGateSource = readFileSync('src/components/StarterGate.tsx', 'utf8');
const canonicalProgressSource = readFileSync('src/services/canonicalProgress.ts', 'utf8');
const deckDiagnosticsSource = readFileSync('src/components/DeckDiagnosticsPanel.tsx', 'utf8');
const bottomNavSource = readFileSync('src/components/BottomNav.tsx', 'utf8');
const basecampSource = readFileSync('src/pages/Basecamp.tsx', 'utf8');
const deckSource = readFileSync('src/pages/Deck.tsx', 'utf8');
const appContextSource = readFileSync('src/context/AppContext.tsx', 'utf8');
const rewardFeedbackSource = readFileSync('src/components/RewardFeedback.tsx', 'utf8');
const collectionSource = readFileSync('src/pages/Collection.tsx', 'utf8');
const votingHubPageSource = readFileSync('src/pages/VotingHubPage.tsx', 'utf8');
const votingBallotPageSource = readFileSync('src/pages/VotingBallotPage.tsx', 'utf8');
const pageLoaderSource = readFileSync('src/components/PageLoader.tsx', 'utf8');
const fieldtripLoaderSource = readFileSync('src/components/FieldtripLoader.tsx', 'utf8');
const crewMemoriesFeedSource = readFileSync('src/components/CrewMemoriesFeed.tsx', 'utf8');

test('stable IA routes exist and legacy routes redirect safely', () => {
  assert.match(appSource, /<Route path="\/missions" element=\{<Deck \/>}/);
  assert.match(appSource, /<Route path="\/missions\/decks" element=\{<Deck \/>}/);
  assert.match(appSource, /<Route path="\/missions\/logbook" element=\{<Navigate to="\/profile\?tab=logbook" replace \/>}/);
  assert.match(appSource, /<Route path="\/dex" element=\{<StarterGate requiredFeature="memories"><Collection \/><\/StarterGate>}/);
  assert.match(appSource, /<Route path="\/dex\/memories\/community" element=\{<StarterGate requiredFeature="memories"><Collection \/><\/StarterGate>}/);
  assert.match(appSource, /<Route path="\/crew" element=\{<Crew \/>\} \/>/);
  assert.match(appSource, /<Route path="\/crews" element=\{<Navigate to="\/crew" replace \/>\} \/>/);
  assert.match(appSource, /<Route path="\/deck" element=\{<Navigate to="\/missions\/decks" replace \/>}/);
  assert.match(appSource, /<Route path="\/collection" element=\{<Navigate to="\/dex" replace \/>}/);
  assert.match(appSource, /<Route path="\/memories" element=\{<StarterGate requiredFeature="memories"><Navigate to="\/dex\/memories" replace \/><\/StarterGate>}/);
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

test('primary nav has exactly five canonical destinations and no Crew tab', () => {
  assert.match(bottomNavSource, /label: 'BASECAMP', path: '\/basecamp'/);
  assert.match(bottomNavSource, /label: 'MISSIONS', path: '\/missions'/);
  assert.match(bottomNavSource, /label: 'DEX', path: '\/dex'/);
  assert.match(bottomNavSource, /label: 'VOTING', path: '\/voting'/);
  assert.match(bottomNavSource, /label: 'BIG BOARD', path: '\/big-board'/);
  assert.match(bottomNavSource, /grid-cols-5/);
  assert.doesNotMatch(bottomNavSource, /label: 'CREW'/);
});

test('Basecamp owns settings, admin, and pre-Starter Crew entry points', () => {
  assert.match(basecampSource, /navigate\('\/settings'\)/);
  assert.match(basecampSource, /Admin Console/);
  assert.doesNotMatch(basecampSource, /Crew Access Locked/);
  assert.match(basecampSource, /Starter Signals still gates seasonal Crew proofs, memories, and zine eligibility/);
  assert.match(basecampSource, /navigate\('\/crew'\)/);
});

test('Dex exposes Collection, Zines, and Memories without Personas or Crew Home tabs', () => {
  assert.match(collectionSource, /\{ id: 'collection', label: 'Collection' \}/);
  assert.match(collectionSource, /\{ id: 'zines', label: 'Zines' \}/);
  assert.match(collectionSource, /\{ id: 'memories', label: 'Memories' \}/);
  assert.match(collectionSource, /Community Proofs/);
  assert.match(collectionSource, /CommunityProofsFeed/);
  assert.doesNotMatch(collectionSource, /label: 'Personas'/);
  assert.doesNotMatch(collectionSource, /label: 'Crew Home'/);
});

test('Voting routes remain reachable from the primary nav', () => {
  assert.match(appSource, /<Route path="\/voting">/);
  assert.match(appSource, /<Route index element=\{<VotingHubPage \/>}/);
  assert.match(appSource, /<Route path="weekly" element=\{<Navigate to="\/voting\?tab=vote" replace \/>}/);
  assert.match(appSource, /<Route path="tribunal" element=\{<Navigate to="\/voting\?tab=tribunal" replace \/>}/);
  assert.match(appSource, /<Route path="results" element=\{<Navigate to="\/voting\?tab=results" replace \/>}/);
  assert.match(appSource, /<Route path="ballot" element=\{<VotingBallotPage \/>}/);
  assert.match(appSource, /<Route path="council" element=\{<SnitchCouncilPage \/>}/);
  assert.match(appSource, /<Route path="awards" element=\{<WeeklyAwardsPage \/>}/);
  assert.match(bottomNavSource, /label: 'VOTING', path: '\/voting'/);
  assert.doesNotMatch(bottomNavSource, /itemPathname === '\/voting' && !canAccessFeature\(canonicalProgress, 'voting'/);
  assert.match(votingHubPageSource, /VotingLockedPanel/);
  assert.match(votingBallotPageSource, /Ballot booth locked/);
});

test('Fieldtrip loading system is shared by app boot, voting, and crew memories', () => {
  assert.match(fieldtripLoaderSource, /export function FieldtripLoader/);
  assert.match(fieldtripLoaderSource, /export type FieldtripLoaderVariant =[\s\S]*'checkin'[\s\S]*'community'[\s\S]*'voting'[\s\S]*'memories'/);
  assert.match(fieldtripLoaderSource, /useReducedMotion/);
  assert.match(pageLoaderSource, /variant="checkin"/);
  assert.match(votingHubPageSource, /variant="voting"/);
  assert.match(crewMemoriesFeedSource, /variant="memories"/);
});

test('Starter completion intro cannot globally trap completed users away from Crew or Voting', () => {
  assert.doesNotMatch(appSource, /hasSeenDeckChooserIntro[\s\S]{0,240}<Navigate to="\/deck" replace \/>/);
  assert.match(appSource, /Starter completion intro is optional and lives on Mission Control/);
  assert.match(deckSource, /deckChooserIntroDismissed/);
  assert.match(deckSource, /acknowledgeDeckChooserIntro/);
  assert.match(deckSource, /getFirstPlayablePostStarterPackId/);
  assert.match(appContextSource, /redirectPath: isSeasonStarted \? '\/missions\?pack=heatwave-receipts&intro=ack'/);
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
