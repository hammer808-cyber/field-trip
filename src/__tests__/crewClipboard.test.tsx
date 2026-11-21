/**
 * Crew page as a clipboard — Field Manual chrome round 2 (Nov 21, 2026).
 * Zach's field-trip.win mocks: a dark metal clip centred over the top
 * edge, grid paper, tape strips at the top corners. The member roster
 * reads as a sign-in sheet (ruled lines, checkmarks for active members
 * — active membership only, no invented presence), and feed photos
 * render as taped polaroids, the same treatment as Trevor's Log.
 * All data, tabs, and logic stay as they are — chrome only.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CrewClipboard } from '../components/crew/CrewClipboard';

const read = (path: string) => readFileSync(path, 'utf8');

test('clipboard: the clip is present, centred over the top edge, and decorative', () => {
  const html = renderToStaticMarkup(
    <CrewClipboard>
      <p>Crew body</p>
    </CrewClipboard>,
  );
  assert.ok(html.includes('data-testid="crew-clipboard-clip"'), 'clipboard has no clip');
  assert.ok(html.includes('left-1/2'), 'clip is not centred');
  assert.ok(html.includes('aria-hidden="true"'), 'clip is not marked decorative');
  assert.ok(html.includes('Crew body'), 'clipboard does not render its children');
});

test('clipboard: grid paper, tape at both top corners, stamps top and bottom', () => {
  const html = renderToStaticMarkup(
    <CrewClipboard>
      <p>Crew body</p>
    </CrewClipboard>,
  );
  assert.ok(html.includes('repeating-linear-gradient'), 'paper has no grid lines');
  assert.equal((html.match(/data-testid="crew-clipboard-tape"/g) || []).length, 2, 'paper does not have two tape strips');
  assert.ok(html.includes('Field log'), 'clipboard has no FIELD LOG stamp near the header');
  assert.ok(html.includes('On file'), 'clipboard has no ON FILE stamp at the foot');
});

test('clipboard: the stamps are decorative and never cover content', () => {
  const html = renderToStaticMarkup(
    <CrewClipboard>
      <button type="button">Draw a Mission</button>
    </CrewClipboard>,
  );
  // FieldStamp is aria-hidden by construction; the clipboard strips are
  // in-flow, so no stamp can sit on top of a button or input.
  assert.ok(html.includes('Draw a Mission'), 'clipboard lost its children');
  assert.ok(html.includes('pointer-events-none'), 'stamps are not pointer-events-none');
});

test('clipboard: no hard-coded hex in the new chrome (P2-1)', () => {
  assert.doesNotMatch(read('src/components/crew/CrewClipboard.tsx'), /#[0-9a-fA-F]{3,8}\b/, 'CrewClipboard has a hard-coded hex');
  // The Feed tab file already carries several pre-existing hexes (e.g.
  // #FCFAF2 in the field-note block); this slice adds none — the
  // polaroid edit is tokens and the shared .field-tape class only.
  assert.ok(read('src/components/CrewMemoriesFeed.tsx').includes('field-tape'), 'Feed tab edit is missing');
});

test('clipboard: Crew wraps its tab body in the clipboard, tabs untouched', () => {
  const crew = read('src/pages/Crew.tsx');
  assert.ok(crew.includes("import { CrewClipboard } from '../components/crew/CrewClipboard'"), 'Crew does not import the clipboard');
  assert.match(crew, /<CrewClipboard>\s*<div className="min-h-\[40vh\]">/, 'Crew does not wrap its tab body in the clipboard');
  assert.ok(crew.includes('</CrewClipboard>'), 'Crew does not close the clipboard');
  // The six tabs still come from the hero tab list, unchanged.
  for (const tab of ["id: 'home'", "id: 'feed'", "id: 'chat'", "id: 'members'", "id: 'stats'", "id: 'settings'"]) {
    assert.ok(crew.includes(tab), `Crew lost the ${tab} tab`);
  }
});

test('clipboard: the roster is a sign-in sheet with a checkmark per active member', () => {
  const crew = read('src/pages/Crew.tsx');
  assert.ok(crew.includes('Sign-in sheet'), 'roster has no SIGN-IN SHEET ticket');
  assert.ok(crew.includes('repeating-linear-gradient(0deg'), 'roster has no ruled lines');
  assert.ok(crew.includes('<Check className="h-5 w-5'), 'roster rows have no checkmark');
  assert.ok(crew.includes('Signed in'), 'roster checkmark has no screen-reader label');
  assert.ok(
    crew.includes("filter(member => member.status === 'active')"),
    'roster is no longer filtered to active members only',
  );
});

test('clipboard: home feed photos and the Feed tab render as taped polaroids', () => {
  const crew = read('src/pages/Crew.tsx');
  assert.ok(crew.includes('field-tape'), 'home photos have no tape strip');
  assert.ok(crew.includes('p-2 pb-1 shadow-[4px_4px_0_var(--skin-border)]'), 'home photos have no polaroid frame');
  const feed = read('src/components/CrewMemoriesFeed.tsx');
  assert.ok(feed.includes('field-tape'), 'Feed tab photos have no tape strip');
  assert.ok(feed.includes('<figure'), 'Feed tab photo is not a polaroid figure');
});
