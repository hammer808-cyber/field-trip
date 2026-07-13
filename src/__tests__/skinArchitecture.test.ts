import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canUseSkin,
  createSkinPreferenceUpdate,
  getSkinCssVariables,
  resolveReducedMotion,
  resolveSkinSelection,
} from '../logic/skinSystem';
import {
  APP_SKINS,
  CLUBHOUSE_WALL_SKIN_ID,
  DEFAULT_APP_SKIN,
  FIELD_NOTEBOOK_SKIN_ID,
  normalizeAppSkin,
} from '../skins/registry';

const unlockedNotebook = ['classic', FIELD_NOTEBOOK_SKIN_ID];

function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const channels = hex.slice(1).match(/.{2}/g)!.map((part) => parseInt(part, 16) / 255);
    const linear = channels.map((channel) => (
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    ));
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

test('a valid unlocked skin selection resolves from persisted preferences', () => {
  const result = resolveSkinSelection({
    skins: APP_SKINS,
    persistedSkinId: FIELD_NOTEBOOK_SKIN_ID,
    unlockedSkinIds: unlockedNotebook,
  });

  assert.equal(result.skin.id, FIELD_NOTEBOOK_SKIN_ID);
  assert.equal(result.source, 'user');
  assert.equal(result.didFallback, false);
});

test('an applied skin persists to canonical user preferences and survives reload resolution', () => {
  const update = createSkinPreferenceUpdate(
    FIELD_NOTEBOOK_SKIN_ID,
    APP_SKINS,
    unlockedNotebook,
  );
  assert.deepEqual(update, {
    userPrefs: { selectedSkinId: FIELD_NOTEBOOK_SKIN_ID },
  });

  const afterReload = resolveSkinSelection({
    skins: APP_SKINS,
    persistedSkinId: update.userPrefs.selectedSkinId,
    unlockedSkinIds: unlockedNotebook,
  });
  assert.equal(afterReload.skin.id, FIELD_NOTEBOOK_SKIN_ID);
  assert.equal(afterReload.source, 'user');
});

test('a missing selection uses the configured default', () => {
  const result = resolveSkinSelection({
    skins: APP_SKINS,
    defaultSkinId: 'classic',
    unlockedSkinIds: ['classic'],
  });
  assert.equal(result.skin.id, 'classic');
  assert.equal(result.source, 'default');
});

test('an invalid skin ID safely falls back to classic', () => {
  const result = resolveSkinSelection({
    skins: APP_SKINS,
    persistedSkinId: 'missing-skin',
    defaultSkinId: 'also-missing',
    unlockedSkinIds: ['classic', 'missing-skin'],
  });
  assert.equal(result.skin.id, 'classic');
  assert.equal(result.source, 'fallback');
  assert.equal(result.didFallback, true);
});

test('canceling preview restores the persisted skin without a write', () => {
  const preview = resolveSkinSelection({
    skins: APP_SKINS,
    persistedSkinId: 'classic',
    previewSkinId: FIELD_NOTEBOOK_SKIN_ID,
    unlockedSkinIds: ['classic'],
  });
  assert.equal(preview.skin.id, FIELD_NOTEBOOK_SKIN_ID);
  assert.equal(preview.source, 'preview');

  const canceled = resolveSkinSelection({
    skins: APP_SKINS,
    persistedSkinId: 'classic',
    previewSkinId: null,
    unlockedSkinIds: ['classic'],
  });
  assert.equal(canceled.skin.id, 'classic');
  assert.equal(canceled.source, 'user');
});

test('applying a preview promotes it to the persisted user selection', () => {
  const update = createSkinPreferenceUpdate(
    FIELD_NOTEBOOK_SKIN_ID,
    APP_SKINS,
    unlockedNotebook,
  );
  const applied = resolveSkinSelection({
    skins: APP_SKINS,
    persistedSkinId: update.userPrefs.selectedSkinId,
    previewSkinId: null,
    unlockedSkinIds: unlockedNotebook,
  });
  assert.equal(applied.skin.id, FIELD_NOTEBOOK_SKIN_ID);
  assert.equal(applied.source, 'user');
});

test('locked skins may be previewed but cannot be applied', () => {
  assert.equal(canUseSkin(FIELD_NOTEBOOK_SKIN_ID, ['classic']), false);
  const preview = resolveSkinSelection({
    skins: APP_SKINS,
    persistedSkinId: 'classic',
    previewSkinId: FIELD_NOTEBOOK_SKIN_ID,
    unlockedSkinIds: ['classic'],
  });
  assert.equal(preview.skin.id, FIELD_NOTEBOOK_SKIN_ID);
  assert.throws(
    () => createSkinPreferenceUpdate(FIELD_NOTEBOOK_SKIN_ID, APP_SKINS, ['classic']),
    /locked/i,
  );
});

test('a configured global default can be reset without a personal unlock', () => {
  const update = createSkinPreferenceUpdate(
    FIELD_NOTEBOOK_SKIN_ID,
    APP_SKINS,
    ['classic'],
    false,
    FIELD_NOTEBOOK_SKIN_ID,
  );
  assert.equal(update.userPrefs.selectedSkinId, FIELD_NOTEBOOK_SKIN_ID);
});

test('inactive manifests can override built-ins but remain unavailable to normal users', () => {
  const inactiveNotebook = normalizeAppSkin({
    ...APP_SKINS.find((skin) => skin.id === FIELD_NOTEBOOK_SKIN_ID)!,
    status: 'inactive',
  });
  const skins = APP_SKINS.map((skin) => skin.id === inactiveNotebook.id ? inactiveNotebook : skin);
  const result = resolveSkinSelection({
    skins,
    persistedSkinId: FIELD_NOTEBOOK_SKIN_ID,
    unlockedSkinIds: unlockedNotebook,
  });
  assert.equal(result.skin.id, 'classic');
  assert.throws(
    () => createSkinPreferenceUpdate(FIELD_NOTEBOOK_SKIN_ID, skins, unlockedNotebook),
    /unavailable/i,
  );
});

test('reduced motion disables decorative movement and transition durations', () => {
  const notebook = APP_SKINS.find((skin) => skin.id === FIELD_NOTEBOOK_SKIN_ID)!;
  const reduced = resolveReducedMotion(notebook, true);
  assert.equal(reduced.decorativeMotion, false);
  assert.equal(reduced.durationFast, '0ms');
  assert.equal(reduced.durationBase, '0ms');
  assert.equal(reduced.durationSlow, '0ms');
  assert.equal(reduced.hoverLift, '0px');
});

test('Field Notebook exposes structural variants and complete semantic CSS variables', () => {
  const notebook = APP_SKINS.find((skin) => skin.id === FIELD_NOTEBOOK_SKIN_ID)!;
  assert.deepEqual(notebook.components, {
    navigation: 'notebook-tabs',
    missionCard: 'evidence-file',
    proofCard: 'contact-sheet',
    modal: 'evidence-folder',
    button: 'rubber-stamp',
    progress: 'ruled-meter',
    profileFrame: 'case-file',
    viewfinder: 'evidence-camera',
    loading: 'paper-sort',
    statePanel: 'case-note',
  });
  const variables = getSkinCssVariables(notebook);
  assert.equal(variables['--skin-background'], notebook.designTokens.background);
  assert.equal(variables['--skin-card-radius'], '3px');
  assert.equal(variables['--skin-card-shadow'], notebook.effects.cardShadow);
  assert.match(variables['--skin-background-texture'], /repeating-linear-gradient/);
});

test('Clubhouse Wall is a complete registry skin with its own structural variants', () => {
  const clubhouse = APP_SKINS.find((skin) => skin.id === CLUBHOUSE_WALL_SKIN_ID)!;
  assert.ok(clubhouse);
  assert.deepEqual(clubhouse.components, {
    navigation: 'clubhouse-dock',
    missionCard: 'sticky-assignment',
    proofCard: 'pinned-polaroid',
    modal: 'clubhouse-notice',
    button: 'marker-label',
    progress: 'tally-strip',
    profileFrame: 'crew-patch',
    viewfinder: 'clubhouse-camera',
    loading: 'wall-setup',
    statePanel: 'pinned-note',
  });
  assert.equal(clubhouse.features.graphPaper, true);
  assert.equal(clubhouse.features.corkboard, true);
  assert.equal(clubhouse.features.pushpins, true);
  assert.equal(clubhouse.features.stickyNotes, true);
  assert.equal(clubhouse.experience.decorativeLanguage, 'clubhouse');
  assert.equal(clubhouse.experience.imageTreatment, 'collage');

  const variables = getSkinCssVariables(clubhouse);
  assert.equal(variables['--skin-card-radius'], '4px');
  assert.equal(variables['--skin-primary'], clubhouse.designTokens.primary);
  assert.match(variables['--skin-background-texture'], /linear-gradient/);
});

test('Field Notebook primary text and control pairs meet WCAG AA contrast', () => {
  const notebook = APP_SKINS.find((skin) => skin.id === FIELD_NOTEBOOK_SKIN_ID)!;
  const pairs = [
    [notebook.designTokens.text, notebook.designTokens.background],
    [notebook.designTokens.text, notebook.designTokens.surface],
    [notebook.designTokens.textMuted, notebook.designTokens.surface],
    [notebook.designTokens.onPrimary, notebook.designTokens.primary],
    [notebook.designTokens.onSecondary, notebook.designTokens.secondary],
    [notebook.designTokens.onAccent, notebook.designTokens.accent],
  ];
  pairs.forEach(([foreground, background]) => {
    assert.ok(
      contrastRatio(foreground, background) >= 4.5,
      `${foreground} on ${background} must meet 4.5:1 contrast`,
    );
  });
});

test('Clubhouse Wall primary text and control pairs meet WCAG AA contrast', () => {
  const clubhouse = APP_SKINS.find((skin) => skin.id === CLUBHOUSE_WALL_SKIN_ID)!;
  const pairs = [
    [clubhouse.designTokens.text, clubhouse.designTokens.background],
    [clubhouse.designTokens.text, clubhouse.designTokens.surface],
    [clubhouse.designTokens.textMuted, clubhouse.designTokens.surface],
    [clubhouse.designTokens.onPrimary, clubhouse.designTokens.primary],
    [clubhouse.designTokens.onSecondary, clubhouse.designTokens.secondary],
    [clubhouse.designTokens.onAccent, clubhouse.designTokens.accent],
  ];
  pairs.forEach(([foreground, background]) => {
    assert.ok(
      contrastRatio(foreground, background) >= 4.5,
      `${foreground} on ${background} must meet 4.5:1 contrast`,
    );
  });
});

test('normalizing partial legacy tokens preserves complete defaults and does not mutate app logic', () => {
  const partial = normalizeAppSkin({
    id: 'legacy-partial',
    name: 'Legacy Partial',
    description: 'Compatibility fixture',
    themeTokens: { primaryColor: '#123456' } as any,
  });
  assert.equal(partial.designTokens.primary, '#123456');
  assert.equal(partial.designTokens.surface, DEFAULT_APP_SKIN.designTokens.surface);
  assert.equal(partial.components.navigation, DEFAULT_APP_SKIN.components.navigation);
  assert.equal(APP_SKINS.length, 5);
});
