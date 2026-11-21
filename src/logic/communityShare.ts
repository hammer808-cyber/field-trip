/**
 * Share-to-community toggle (Nov 21, 2026 — Zach's pick B).
 *
 * The weekly ballot only takes entries that are community-visible, but every
 * submission was created with `showInCommunityFeed: false` and no switch
 * anywhere could turn it on, so week 47 locked with zero nominees. This
 * module is the single home for the per-photo choice made at submit.
 *
 * Default: ON, unless the player explicitly chose private (profile
 * `privateApprovedPhotos`, or feedVisibility 'private'). The default is the
 * one judgment call here — ON makes ballots actually populate while keeping
 * a real per-photo opt-out; flip `resolveCommunityShareDefault` to return
 * false and the toggle starts OFF instead.
 */

export type CommunityShareFields = {
  showInCommunityFeed: boolean;
  isPublic: boolean;
  communityVisible: boolean;
  /** 'public_discovery' when sharing; null means "keep the profile default". */
  feedVisibilityOverride: 'public_discovery' | null;
};

export function resolveCommunityShareDefault(args: {
  feedVisibility?: string | null;
  privateApprovedPhotos?: boolean;
}): boolean {
  if (args.privateApprovedPhotos === true) return false;
  if (args.feedVisibility === 'private') return false;
  return true;
}

export function resolveCommunityShareFields(share: boolean): CommunityShareFields {
  if (share) {
    return {
      showInCommunityFeed: true,
      isPublic: true,
      communityVisible: true,
      feedVisibilityOverride: 'public_discovery',
    };
  }
  return {
    showInCommunityFeed: false,
    isPublic: false,
    communityVisible: false,
    feedVisibilityOverride: null,
  };
}
