import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Crews pass: Stats is a real tab with live tiles and no locked placeholder', () => {
  const source = read('src/pages/Crew.tsx');

  // Stats is in the tab bar, between Zine and Settings.
  const tabsStart = source.indexOf('const tabs = [');
  const tabsEnd = source.indexOf('];', tabsStart);
  const tabsBlock = source.slice(tabsStart, tabsEnd);
  assert.match(tabsBlock, /\{ id: 'stats', label: 'Stats', icon: BarChart3 \}/);
  assert.ok(tabsBlock.indexOf("'stats'") > tabsBlock.indexOf("'zine'"));
  assert.ok(tabsBlock.indexOf("'stats'") < tabsBlock.indexOf("'settings'"));

  // ?tab=stats lands on Stats instead of bouncing home.
  assert.doesNotMatch(source, /\['stats', 'dispatch'\]/);
  assert.match(source, /\['dispatch'\]\.includes\(requestedTab/);

  // The four live tiles are still there; the locked-chart box is gone.
  assert.match(source, /label: 'APPROVED'/);
  assert.match(source, /label: 'WEEKLY_SCORE'/);
  assert.match(source, /label: 'WEEKLY_RANK'/);
  assert.doesNotMatch(source, /Statistical_Visualization_Locked/);
  assert.doesNotMatch(source, /Score Journey Placeholder/);
});

test('Crews pass: Dispatch is cut — no branch, no state, no loader', () => {
  const source = read('src/pages/Crew.tsx');

  // No Dispatch tab in the bar, no render branch, no dispatch state.
  const tabsStart = source.indexOf('const tabs = [');
  const tabsEnd = source.indexOf('];', tabsStart);
  assert.doesNotMatch(source.slice(tabsStart, tabsEnd), /'dispatch'/);
  assert.doesNotMatch(source, /activeTab === 'dispatch'/);
  assert.doesNotMatch(source, /useState<CrewDispatch/);
  assert.doesNotMatch(source, /getLatestDispatch/);
  assert.doesNotMatch(source, /Dispatch_Locked/);
  assert.doesNotMatch(source, /EXPORT_IDENTITY_ASSET/);

  // A dispatch deep link still lands somewhere real instead of a blank tab.
  assert.match(source, /\['dispatch'\]\.includes\(requestedTab.*\? 'home'/);

  // The data layer stays for the future season wrap-up feature.
  const service = read('src/services/crewService.ts');
  assert.match(service, /export async function getLatestDispatch/);
});

test('Crews pass: Crews is in the bottom nav with its own active color', () => {
  const nav = read('src/components/BottomNav.tsx');

  assert.match(nav, /label: 'CREWS', path: '\/crew'/);
  assert.match(nav, /grid-cols-6/);
  assert.match(nav, /item\.path === '\/crew' \? 'bg-brand-orange text-white/);
  // Crews sits with the social destinations, after DEX and before Voting.
  const itemsStart = nav.indexOf('const navItems');
  const itemsEnd = nav.indexOf('];', itemsStart);
  const itemsBlock = nav.slice(itemsStart, itemsEnd);
  assert.ok(itemsBlock.indexOf("'/crew'") > itemsBlock.indexOf("'/dex'"));
  assert.ok(itemsBlock.indexOf("'/crew'") < itemsBlock.indexOf("'/voting'"));
});
