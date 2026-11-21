# Notification detail card + red unread + more than 20 — design

## What Zach asked (Nov 20, 2026)

1. Notifications should be "a Marcus red".
2. The list should go past 20.
3. Tapping a notification should open a card showing it bigger — today it
   jumps straight to the destination without showing anything — and the
   card should have a button that takes you where the notification points.

## Audit (Nov 20, 2026)

- Single home: Basecamp "Field notices" (`BasecampNotifications.tsx`).
  Seven types land here: proof decisions, sticker awards, proof
  submissions, Power Hour live, crew comments, crew @-mentions, crew
  member joined.
- The 20 is `PLAYER_NOTIFICATIONS_LIMIT = 20` in
  `src/services/playerNotificationService.ts` — a Firestore `limit(20)`
  on a live `onSnapshot` subscription, newest-first.
- Tap today: `openNotification` in `Basecamp.tsx` navigates straight to
  the item's `href` (Dex stickers tab for awards, Logbook for decisions
  and submissions, Missions for Power Hour, crew feed/chat for crew).
  No detail is shown first. That is the gap Zach is describing.
- Unread dot today: lime (`bg-brand-lime`) on the icon tile.
- There is NO mark-as-read path anywhere: clients cannot write these
  docs (rules read-only; the server writes via Admin SDK) and no server
  endpoint sets `read`. So today an unread dot never clears on its own.
- "Marcus red" does not exist in the repo, in memory, or in the people
  index (searched Nov 20: zero hits in field-trip src/docs/public, zero
  in MEMORY.md and the people index). The app's red token is
  `--color-error: #FF003D`. Open question — see §4.
- House modal pattern exists: `src/components/stickers/StickerDetailModal.tsx`
  (`role="dialog"`). The notification card follows it.

## Proposed behavior

### Detail card (tap a row → modal, not a navigation)

- Card shows, big: kind icon, title, the FULL detail text (today the row
  clamps it to 2 lines), the time label, and an unread/read state.
- Per-kind extras, from the underlying notification (the row's
  title/detail alone is not enough — the view model must carry these
  through on `BasecampNotificationItem`):
  - sticker award: the sticker art large (same art the Dex shows).
  - proof decision: XP awarded + the admin note, if any.
  - crew comment / @-mention: the preview quote.
  - Power Hour: the window + multiplier.
  - proof submitted / member joined: nothing extra beyond the detail.
- One primary button: "Take me there" → navigates to the item's existing
  `href` and closes the card. Same destinations as today, unchanged.
- Secondary: a close (X) + tap-outside / Escape to dismiss, matching
  the sticker detail modal. Reduced-motion safe.
- Opening the card marks the notification read (see mark-as-read below),
  so the dot clears once you have actually seen it.

### Red

- The unread dot (and the unread row's icon-tile accent) change from
  lime to the red Zach names. Read rows stay as they are.
- Scope question: dot only, or dot + tile accent? Default is dot +
  tile accent so an unread row reads as unread at a glance.

### More than 20

Options (Zach's pick):

- A — Raise the cap to 50. One-line change (`PLAYER_NOTIFICATIONS_LIMIT`),
  live subscription stays exactly as it is. Covers weeks of activity for
  a normal player. The list can still fill up eventually.
- B — "Show more" button. Live subscription stays at 20 for freshness;
  tapping loads the next 20 older docs on demand (paged `getDocs` with
  `startAfter`). Full history reachable, but two read paths to maintain
  and the older page is a snapshot, not live.
- C — No cap. The list grows without bound as the player accumulates
  notifications; reads get heavier over time. Not recommended.

### Mark-as-read (needed for the dot to ever clear)

- New server endpoint, e.g. `POST /api/notifications/:id/read`, setting
  `read: true` via the Admin SDK (clients still cannot write the docs).
- Called when the detail card opens. No rules change needed (server
  bypasses rules). No backfill: old notifications stay unread until
  opened, same as the sticker-award rule.

## Open questions (Zach's calls)

1. What is "Marcus red"? Not found in the app or memory. Is it the app's
   error red `#FF003D`, or a different red (hex, or a photo/object to
   match)?
2. More than 20: 50 (option A) or a "Show more" button (option B)?
3. Mark-as-read on open: yes (needs the small server endpoint above)?

## Decisions (Zach's answers, Nov 20, 2026)

1. **Red: the app's error red `#FF003D`** ("it's marked red") — the unread
   marker goes red. Unread dot + unread row's icon-tile accent.
2. **Cap 50 AND a Show more button.** The query cap rises 20 → 50, but
   the list shows **7 at a time**; each "Show more" reveals the next 7,
   up to the 50 fetched. One live subscription, client-side reveal — no
   second read path.
3. **Per-kind look.** Each notification kind gets its own color (icons
   already differ): sticker lime, decision cyan, submission orange,
   Power Hour heat-yellow, crew purple — all existing brand tokens, so
   the kind reads the same in every skin. Font stays the same; color +
   icon carry the difference.
4. **Mark-as-read on open: yes.** Opening the detail card marks the
   notification read via a new server endpoint
   (`POST /api/notifications/:id/read`, Admin SDK — no rules change).
   The live subscription then clears the red dot.

## Status

- Status: APPROVED — building Nov 20, 2026.
- No code written yet.
