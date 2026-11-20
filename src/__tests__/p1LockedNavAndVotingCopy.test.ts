// P1-1 + P1-12 (audit Phase 2 quick wins, Nov 20, 2026).
//
// P1-1: locked bottom-nav tabs were live <Link>s — the tap navigated and
// only then did StarterGate show a lock panel. Fix: a locked tab is a
// <button> that shows its reason inline (lockedNotice) and never navigates.
// P1-12: How-it-works step 05 promised "vote" while VOTING_ENABLED = false,
// and VotingHubPage's VotingLockedPanel returned a bare GatedFeaturePanel
// whose default reason ('starter') would wrongly blame the starter.
// Fix: reword step 05, pass reason="coming_soon" in the fallback panel.
// Decision (recorded in MEMORY.md, not re-litigated here): the VOTING tab
// stays visible as Locked, using the P1-1 pattern — it is not hidden.
//
// The repo has no DOM test harness for BottomNav (it needs AppContext /
// Theme / guidance providers), so — like missionSubmittedBasecamp.test.tsx —
// the component side is pinned with source assertions, cross-checked
// against the real guard helpers where they are pure.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { resolveDexNavPresentation } from '../components/bottomNavPresentation';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');
const nav = () => read('src/components/BottomNav.tsx');
const welcome = () => read('src/pages/Welcome.tsx');
const votingHub = () => read('src/pages/VotingHubPage.tsx');
const gate = () => read('src/components/StarterGate.tsx');

// --- P1-1: every locked tab carries its reason inline ----------------------

test('P1-1: every locked nav tab carries a lockedReason (BASECAMP pattern extended)', () => {
  const n = nav();
  assert.match(n, /label: 'BASECAMP', path: '\/basecamp', locked: basecampLocked, lockedReason: 'Finish the three starter missions to unlock Basecamp\.'/);
  assert.match(n, /label: 'DEX', path: '\/dex', locked: !dexUnlocked, lockedReason: 'Finish the three starter missions to unlock the Dex\.'/);
  assert.match(n, /label: 'CREWS', path: '\/crew', locked: !crewUnlocked, lockedReason: 'Finish the three starter missions to unlock Crews\.'/);
  assert.match(n, /label: 'VOTING', path: '\/voting', locked: !votingUnlocked, lockedReason: 'Voting is coming soon\. It is still in the works\.'/);
  // BIG BOARD has no `locked`/`lockedReason` on the item (its lock comes
  // from `leaderboardUnlocked`, the Nov 17 key split) — the reason is
  // resolved in the map body instead.
  assert.match(n, /const lockedReason = item\.lockedReason/);
  assert.match(n, /itemPathname === '\/big-board'\s*\?\s*'Finish the three starter missions to unlock the Big Board\.'/);
});

test('P1-1: a locked tab renders as a button, not a link, and never navigates', () => {
  const n = nav();
  const branch = n.indexOf('if (isLockedTab && lockedReason) {');
  assert.ok(branch > -1, 'expected a locked-tab branch in the nav map');
  const branchBlock = n.slice(branch, n.indexOf('return (\n          <Link', branch));
  assert.match(branchBlock, /<button/);
  assert.match(branchBlock, /type="button"/);
  assert.match(branchBlock, /aria-disabled="true"/);
  assert.match(branchBlock, /data-nav-locked="true"/);
  assert.match(branchBlock, /aria-label=\{`\$\{item\.label\}, locked\. \$\{lockedReason\}`\}/);
  assert.match(branchBlock, /onClick=\{\(\) =>\s*setLockedNotice/);
  assert.doesNotMatch(branchBlock, /to=\{item\.path\}/);
  assert.doesNotMatch(branchBlock, /<Link/);
  // The button shows the reason inline via the notice bar, and tapping the
  // same tab again dismisses it.
  assert.match(branchBlock, /current\?\.label === item\.label \? null : \{ label: item\.label, reason: lockedReason \}/);
  // Unlocked tabs are still real links.
  assert.match(n, /return \(\s*<Link\s*key=\{item\.path\}\s*to=\{item\.path\}/);
});

test('P1-1: the locked notice is a live region showing the reason, cleared on navigation', () => {
  const n = nav();
  assert.match(n, /role="status"/);
  assert.match(n, /data-testid="locked-nav-notice"/);
  assert.match(n, /\{lockedNotice\.label\} is locked\./);
  assert.match(n, /\{lockedNotice\.reason\}/);
  assert.match(n, /aria-label="Dismiss locked message"/);
  // Navigation clears a stale notice (location effect).
  const effect = n.slice(n.indexOf('useEffect(() => {'), n.indexOf('}, [location.pathname]);'));
  assert.match(effect, /setLockedNotice\(null\);/);
});

test('P1-1: the locked-button branch runs after the special Dex treatment', () => {
  // When Dex is locked, resolveDexNavPresentation returns special: false,
  // so a locked Dex must fall through to the normal (now button) branch —
  // the special raised-Dex Link must never be the locked rendering.
  assert.equal(resolveDexNavPresentation({ dexUnlocked: false, isActive: false, isAttentionTarget: false }).special, false);
  assert.equal(resolveDexNavPresentation({ dexUnlocked: false, isActive: true, isAttentionTarget: false }).special, false);
  const n = nav();
  assert.ok(
    n.indexOf('if (showDexSpecial && dexPresentation)') < n.indexOf('if (isLockedTab && lockedReason) {'),
    'locked branch must come after the special-Dex branch',
  );
});

test('P1-1 regression guard: admin bypass still works — every lock passes { isAdmin }', () => {
  const n = nav();
  assert.match(n, /canAccessFeature\(canonicalProgress, 'memories', \{ isAdmin \}\)/);
  assert.match(n, /canAccessFeature\(canonicalProgress, 'voting', \{ isAdmin \}\)/);
  assert.match(n, /canAccessFeature\(canonicalProgress, 'leaderboard', \{ isAdmin \}\)/);
  assert.match(n, /canAccessFeature\(canonicalProgress, 'crew', \{ isAdmin \}\)/);
  assert.match(n, /resolveBasecampNavLocked\(\{\s*starterComplete: getStarterProgress\(canonicalProgress\)\.starterComplete,\s*isAdmin,\s*\}\)/);
  // The gate itself still lets admins through, so the nav lock and the
  // route gate agree for admins.
  assert.match(gate(), /if \(isFeatureUnlocked \|\| isAdmin\)/);
});

// --- P1-12: no player-facing copy promises voting while it is parked ------

test('P1-12: How-it-works step 05 no longer promises voting', () => {
  const w = welcome();
  assert.match(
    w,
    /\{ step: "05", title: "KEEP PLAYING", text: "Collect receipts, earn stickers, and climb the board with your crew\." \}/,
  );
  // No "vote" promise anywhere on the Welcome page while Voting is parked.
  assert.doesNotMatch(w, /vote/i);
});

test('P1-12: the Voting tab stays visible as Locked (decision) — not hidden', () => {
  const n = nav();
  assert.match(n, /label: 'VOTING', path: '\/voting', locked: !votingUnlocked/);
  assert.match(n, /lockedReason: 'Voting is coming soon\. It is still in the works\.'/);
  assert.doesNotMatch(n, /label: 'VOTING'[\s\S]{0,80}hidden/);
});

test('P1-12: VotingLockedPanel blames the kill switch, not the starter', () => {
  const v = votingHub();
  const panel = v.slice(v.indexOf('function VotingLockedPanel'));
  assert.match(panel, /return <GatedFeaturePanel featureName="Voting" reason="coming_soon" \/>;/);
  assert.doesNotMatch(panel, /return <GatedFeaturePanel featureName="Voting" \/>;/);
});

test('P1-12 regression guard: the route gate still shows coming-soon for Voting, admins pass', () => {
  const g = gate();
  assert.match(g, /voting: !VOTING_ENABLED,/);
  assert.match(g, /return <GatedFeaturePanel featureName=\{FEATURE_LABEL\[requiredFeature\]\} reason="coming_soon" \/>;/);
  assert.match(g, /if \(isFeatureUnlocked \|\| isAdmin\)/);
});
