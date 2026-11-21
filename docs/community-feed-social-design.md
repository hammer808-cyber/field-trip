# Community feed social — design (Option C)

Zach picked C (Nov 21, 2026, 1:40 PM PST): comments on the global
feed + surface the feed + open up visibility. Audit:
`docs/social-proof-feed-audit.md`.

## The three slices

### A — Comments on the global feed
Reuse the crew-comments pattern (Nov 20, 2026), adapted for a feed
with no single scope.

- **Collection:** new top-level `communityFeedComments`:
  `{ entryId, authorId, authorName, text, createdAt }`. No crewId;
  the feed is global.
- **Server** (`server.ts`, next to the crew endpoints):
  - `POST /api/community/comments` (authRateLimiter, authenticate).
    Validates with `validateCrewCommentText` (500 cap, same
    EMPTY/TOO_LONG codes). Gate: entry exists, is community-eligible,
    and `canViewerAccessSocialEntry(uid, entry, 'comment')` (see the
    fix under C). Transaction: create the comment + increment
    `entries/{id}.commentCount`. Notify the photo owner (not yourself)
    with type `community_comment`, 120-char preview, best effort.
    Returns `{ success, comment }`.
  - `DELETE /api/community/comments/:id`. Author or admin only.
    Deletes the doc + decrements `commentCount` (floor 0).
  - **Deviation from the crew pattern, deliberate:** crew deletes are
    direct client writes (rules allow author/captain). Community
    deletes go through the server so `commentCount` stays exact with
    a single writer.
- **Client** (`src/services/communityFeedComments.ts`, mirrors
  `crewFeedComments.ts`): `subscribeToCommunityComments(entryId, cb)`
  (one query per open modal, `where entryId == id`, `orderBy
  createdAt asc`, limit 100; error → callback `[]`),
  `addCommunityComment(entryId, text)`,
  `deleteCommunityComment(commentId)`.
- **UI:** new `src/components/CommunityReceiptComments.tsx`
  (thread + composer + author delete), rendered inside
  `ReceiptDetailModal` in `CommunityProofCard.tsx`, so both feed
  surfaces (Dex Memories and Big Board) get comments at once.
  The card gains a comment-count button (MessageSquare + N, from
  `proof.commentCount`) that opens the modal. Count comes from the
  entry doc, so it renders with zero extra queries.
- **Notifications:** new type `community_comment` in
  `src/logic/playerNotifications.ts` + `communityCommentCopy`
  (mirror `crewCommentCopy`: "{actor} commented on {title}"),
  mapping in `src/services/playerNotificationService.ts`, kind
  `'crew'` (purple, the social kind) in
  `src/logic/basecampViewModel.ts`, href `/dex/memories/community`.
- **Rules** (`firestore.rules`, new block): reads allowed only when
  the referenced entry is readable (`canReadSocialEntry` via a
  `get()` on the entry doc, `exists()` guard first); create/update/
  delete false (server-only). **This rides with rules publish #3
  from Zach's Mac.** Until published, comment reads fail and the
  thread shows "Couldn't load comments."; posting still works
  (server-side). The card count keeps working regardless (entry docs
  are already readable).

### B — Surface the feed
- `src/pages/BigBoard.tsx:979`: add
  `{ id: "proofs", label: "Community Feed" }` to the tabs array.
  The section (line 1097), the state type, and the `?tab=proofs`
  handling already exist; the tab button is the only missing piece.
  One-line fix. No nav change: the bottom nav keeps its six items.

### C — Open up visibility
Two discoveries from the audit change what C needs:

1. **The flip already exists.** `POST /api/user/feed-privacy`
   (`server.ts:2877`) batch-updates the profile AND all of the
   user's entries (limit 500) to the new visibility. So enabling
   the setting IS the one-time flip of past receipts. **No new
   flip endpoint.** Cap: players with more than 500 entries flip
   only the first 500; Zach has about a dozen, so this does not
   bite him. The flip is one-way in bulk: there is no bulk
   un-flip, and per-photo privacy for old photos does not exist.
   Future submissions follow the profile setting plus the
   per-photo submit toggle.
2. **The server gate does not accept public discovery.**
   `canViewerAccessSocialEntry` (`server.ts:2897`) requires
   same-crew membership after the private check, with no public
   branch, and reads the owner's PROFILE visibility, not the
   entry's. So today a stranger can SEE a public photo (client
   rules allow it) but cannot HYPE it: `POST /api/community/hype`
   throws ENTRY_OUTSIDE_SOCIAL_SCOPE. The fix: accept when the
   entry's `feedVisibility` is `public_discovery` OR the owner's
   profile is `public_discovery`; otherwise same-crew as today.
   Extend the `interaction` param with `'comment'`. This also
   fixes sus reports on public photos (same function, line 2951).
   Blocks still apply either way.

- **Settings** (`src/pages/Profile.tsx:640`): enable
  `public_discovery` (`available` becomes crew_only /
  public_discovery / private; `followers_only` stays "Coming
  later" — People I Add is a different feature, out of scope).
  Fix the copy line: "The feed defaults to your Crew. Public
  discovery is reserved for a deliberate future discovery
  surface." becomes "Public discovery puts your approved receipts
  in front of every player." The submit toggle is untouched: it
  already defaults ON unless the profile is explicitly private.

## What is NOT in scope
- Followers / People I Add (still coming later).
- A bottom-nav Feed entry (B restores the Big Board tab instead).
- Per-photo un-share for old photos (no UI exists; the bulk flip
  is one-way).
- Crew feed changes: the clubhouse feed + comments + chat already
  exist for named crews; nothing here touches them.

## Verification
- tsc clean; full suite back to the 3 known failures; production
  build.
- Curl deploy check (live Basecamp/Board/Dex chunks + the new
  routes returning 401 unauthenticated, bogus path 404).
- Read-only browser live check as ELONDRA: Big Board shows the
  Community Feed tab; Dex community card shows a comment count and
  the modal shows a thread + composer; posting a comment is NOT
  done by the check (needs a real comment from Zach's phone or a
  second account to verify end to end); Settings shows Public
  discovery selectable. The rules publish gates comment reads, so
  the thread check happens after Zach publishes.
