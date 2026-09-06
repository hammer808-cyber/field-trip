import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FIELD_STATUS_LABELS } from '../components/player/FieldStatusChip';

const collection = readFileSync('src/pages/Collection.tsx', 'utf8');
const profile = readFileSync('src/pages/Profile.tsx', 'utf8');
const crew = readFileSync('src/pages/Crew.tsx', 'utf8');
const crewInvite = readFileSync('src/pages/CrewInvite.tsx', 'utf8');
const bigBoard = readFileSync('src/pages/BigBoard.tsx', 'utf8');
const votingHub = readFileSync('src/pages/VotingHubPage.tsx', 'utf8');
const ballot = readFileSync('src/pages/VotingBallotPage.tsx', 'utf8');
const council = readFileSync('src/pages/SnitchCouncilPage.tsx', 'utf8');
const awards = readFileSync('src/pages/WeeklyAwardsPage.tsx', 'utf8');
const loteria = readFileSync('src/pages/LoteriaExploreBoard.tsx', 'utf8');
const fieldIdentity = readFileSync('src/pages/FieldIdentity.tsx', 'utf8');
const frontlines = readFileSync('src/pages/Frontlines.tsx', 'utf8');
const banned = readFileSync('src/pages/Banned.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const capture = readFileSync('src/pages/Capture.tsx', 'utf8');
const proofCorrection = readFileSync('src/components/ProofCorrection.tsx', 'utf8');
const loader = readFileSync('src/components/FieldtripLoader.tsx', 'utf8');
const hero = readFileSync('src/components/FieldPageHero.tsx', 'utf8');
const departments = readFileSync('src/components/player/departments.css', 'utf8');
const main = readFileSync('src/main.tsx', 'utf8');

test('canonical Fieldtrip status vocabulary stays stable', () => {
  assert.equal(FIELD_STATUS_LABELS.here, 'Here');
  assert.equal(FIELD_STATUS_LABELS.now, 'Now');
  assert.equal(FIELD_STATUS_LABELS.locked, 'Locked');
  assert.equal(FIELD_STATUS_LABELS.in_progress, 'In progress');
  assert.equal(FIELD_STATUS_LABELS.pending, 'Pending');
  assert.equal(FIELD_STATUS_LABELS.approved, 'Approved');
  assert.equal(FIELD_STATUS_LABELS.needs_more_proof, 'Needs more proof');
  assert.equal(FIELD_STATUS_LABELS.rejected, 'Rejected');
  assert.equal(FIELD_STATUS_LABELS.complete, 'Complete');
});

test('player destinations share editorial FieldPageHero + department shells', () => {
  for (const [name, source] of Object.entries({
    collection, profile, crew, crewInvite, bigBoard, votingHub, ballot, council, awards, loteria, fieldIdentity, frontlines,
  })) {
    assert.match(source, /variant="editorial"/, `${name} missing editorial hero`);
    assert.match(source, /PlayerPageShell/, `${name} missing PlayerPageShell`);
  }
  assert.match(profile, /title=\{activeTab === 'history' \? 'LOGBOOK' : activeTab === 'settings' \? 'SETTINGS' : 'PROFILE'\}/);
  assert.match(collection, /title="DEX"/);
  assert.match(crew, /Create Crew/);
  assert.match(bigBoard, /title="BIG BOARD"/);
  assert.match(votingHub, /VotingLockedPanel/);
  assert.match(ballot, /GatedFeaturePanel/);
  assert.match(loteria, /title="LOTERÍA"/);
  assert.match(frontlines, /department="frontlines"/);
});

test('department tokens and shared state panels are loaded', () => {
  assert.match(main, /components\/player\/departments\.css/);
  assert.match(departments, /\.ft-dept-dex/);
  assert.match(departments, /\.ft-dept-voting/);
  assert.match(departments, /\.ft-status-chip--needs_more_proof/);
  assert.match(hero, /variant\?: "default" \| "editorial"/);
  assert.match(loader, /export function EmptyStatePanel/);
  assert.match(loader, /export function LockedStatePanel/);
  assert.match(loader, /export function ErrorStatePanel/);
});

test('player-facing errors use human copy, not bureau failure codes', () => {
  assert.doesNotMatch(app, /FATAL_RUNTIME_FAILURE/);
  assert.doesNotMatch(app, /COMPONENT_RENDER_FAILURE/);
  assert.doesNotMatch(app, /BUREAU_PROFILE_NOT_FOUND/);
  assert.match(app, /ErrorStatePanel/);
  assert.match(app, /Something went wrong/);
  assert.match(banned, /Access revoked/);
  assert.doesNotMatch(banned, /Access_Revoked/);
  assert.doesNotMatch(capture, /BUREAU_REPAIR_FEEDBACK/);
  assert.match(capture, /Needs more proof/);
  assert.match(proofCorrection, /Needs more proof/);
  assert.doesNotMatch(proofCorrection, /Mission Failure/);
  assert.doesNotMatch(proofCorrection, /BUREAU_FEEDBACK/);
});
