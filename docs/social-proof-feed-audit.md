# Social proof feed — audit

Zach's question (Nov 21, 2026, 1:34 PM PST): where is the social part?
When somebody submits a proof and gets approved there should be a place
where everybody sees the picture so they can like or comment on them.
Right now someone posts a picture and only they can see it. Eventually
it will be a feed inside your own crew page when you create a crew.

## What exists today

### The global feed exists, in two places, with likes but no comments
- **Dex > Memories > Community Proofs** (`/dex/memories/community`,
  `src/components/CommunityProofsFeed.tsx`): flipbook of approved
  receipts, filters Latest / Most Hyped / This Week / This Season /
  My Crew, load-more up to 120.
- **Big Board proofs section** (`src/pages/BigBoard.tsx:1097`): the same
  feed as a grid. **ORPHANED, not reachable**: the tab bar
  (`BigBoard.tsx:979-983`) lists only Live Board / Results / Field
  Conditions. The `proofs` state and section still exist, and
  `?tab=proofs` (line 498) can still open it, but no tab button
  selects it. Restoring it is a one-line tab-list fix.
- **CommunityProofCard** (`src/components/CommunityProofCard.tsx`):
  photo, field note, avatar, name, deck, XP, "Ballot eligible" chip,
  **Hype button (like, works** via `toggleLikeEntry` /
  `checkIfLiked` in `src/services/proofService.ts`, `/likes`
  collection, rules read-only for clients), Signal Check (report),
  Open Receipt detail modal (also has Hype). **No comment button,
  no comment list, no composer anywhere on the card or the modal.**
- **No bottom-nav entry for the feed.** Nav is Basecamp / Missions /
  Dex / Crews / Voting / Big Board (`src/components/BottomNav.tsx`).
  The only global feed is two taps deep inside Dex Memories.

### Comments exist, but only inside a named crew
- Crew clubhouse (Nov 20, 2026): feed comments on every crew archive
  photo, 500-char cap, author/captain delete, server endpoint
  `POST /api/crew/feed/comments`, photo owner notified; one-channel
  crew chat; notifications as 'crew' rows. (`src/server/crew*.ts`,
  rules `firestore.rules:1115`.)
- Zach has **no named crew** (live check Nov 21, 2026: "COMPANY:
  NONE"), one accepted crew member (UNSTABLE_HAMMER) and one outgoing
  request (BAJIIGITTY NONSENSE). His crew page shows **no Feed tab**,
  only CREATE CREW / FIND CREW and a COMMUNITY SPOTLIGHT list. So the
  crew feed + comments surface does not appear for him at all. It
  appears once he forms a named crew. The "eventually a feed inside
  your crew page" part is already built; the gap is the global feed
  now.

### Visibility: who can see whose photo
- Rules (`firestore.rules:124`, `canReadSocialEntry`): an approved
  entry is readable by others only if accepted crew connection, OR
  explicit public discovery, OR same active crew. Otherwise the query
  returns nothing. Client-side `isVisibleInSocialFeed`
  (`src/logic/communityFeed.ts`) applies the same gate, and defaults
  an unset profile to `crew_only`.
- The share toggle at submit (Frankie chat, Nov 21, 2026): per-photo
  toggle, default ON, writes `showInCommunityFeed` / `isPublic` /
  `communityVisible` + `feedVisibility: public_discovery`. It covers
  submissions made after it shipped only. Older approved photos stay
  crew_only.
- **Contradiction:** Profile > Settings > Privacy says "The feed
  defaults to your Crew. Public discovery is reserved for a
  deliberate future discovery surface." with PUBLIC DISCOVERY marked
  COMING LATER (disabled). The submit toggle writes public_discovery
  anyway. The two paths disagree about whether public discovery
  exists yet.
- Zach's own setting is **CREW ONLY (selected)**. His photos are
  visible to his crew only, unless a per-photo toggle overrode it.

## What the live check showed (Nov 21, 2026, 1:36-1:38 PM PST, as ELONDRA)
- Dex > Memories > Community Proofs: **11 receipts, 7 from other
  players** (DAPHZEE 1, UNSTABLE_HAMMER 6), 4 his own. Hype counts
  mostly 0, one at 1. DAPHZEE is not in his crew, yet visible, so a
  public_discovery photo does reach him.
- Big Board: **no proofs tab live**, only Live Board / Results /
  Field Conditions. Rankings: #1 HAMMERLBC 530 XP, #2
  UNSTABLE_HAMMER 438, #3 DAPHZEE 128, #4 BAJIIGITTY NONSENSE 78.
- Detail modal on DAPHZEE's card: photo, quote, Hype 0, disabled
  Raise Signal. **No comment box, no comments list.**
- My Memories sub-tab: empty state, "NO CREW ON THE CLIPBOARD YET".
- My Crew filter: 6 of 6 cards, all UNSTABLE_HAMMER.
- The reverse direction could not be checked from his sign-in:
  whether his photos appear in other players' feeds.

## The gaps, in his words
1. **No comments on the global feed.** Liking works (Hype).
   Commenting does not exist outside a named crew. This is the
   clearest gap against "like or comment on them."
2. **The feed is buried.** The only reachable copy is Dex >
   Memories > Community Proofs. The Big Board copy is orphaned
   dead code. No nav entry, nothing on Basecamp.
3. **Reach is narrower than "everybody sees the picture."** His
   own photos are Crew Only by his own setting; public discovery
   is disabled in Settings while the submit toggle writes it
   anyway; pre-toggle photos are crew-only by default. Only 4
   players exist on the board so far, so even a working feed is 11
   receipts.

## Options
- **A — Comments on the global feed.** Reuse the crew-comments
  server pattern for community cards: comment list + composer on
  the card detail modal (and/or the card), owner notified. Feed
  stays where it is (Dex Memories).
- **B — A + surface the feed.** Restore the orphaned Big Board
  proofs tab (one-line tab-list fix; the section already exists)
  so the feed is one tap from the bottom nav, plus comments from A.
- **C — B + open up visibility.** Enable the Public Discovery
  setting (currently COMING LATER/disabled), reconcile it with the
  submit toggle, and offer a one-time flip of existing crew-only
  photos to public. This is the "everybody sees the picture" part.

## Verification
Code audit (Nov 21, 2026): feed components, visibility logic,
rules, like/comment services. Read-only browser live check as
ELONDRA (Nov 21, 2026, 1:36-1:38 PM PST): counts, empty states,
card actions, crew page, Settings privacy section.
