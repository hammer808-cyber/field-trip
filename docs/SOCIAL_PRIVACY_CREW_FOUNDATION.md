# Social Privacy + Crew Foundation

This report documents the previous social architecture, the 1:1 Crew graph added in this branch, the privacy contract, security changes, live scenario status, and deferred work.

## Previous social architecture

Users lived in `users/{uid}` with public username mapping in `usernames/{username}`. Any signed-in client could **list every user document**, including email and admin flags. Individual `get` was already owner/admin-only, so the leak was the list query used by leaderboards and standings.

Crew already existed as a **named company/clan**: `crews/{id}`, `crews/{id}/members/{uid}`, `crewInvites`, and `crewJoinRequests`. That model is captain/member, capacity-limited, and used for zines, memories, and company archives. It is not a 1:1 people graph. `followers_only` existed as a feed-privacy label without an actual follower collection.

Feed visibility fields already existed: `crew_only` (default), `followers_only`, `public_discovery`, `private`, plus `preferences.privateApprovedPhotos`. Blocking already existed at `users/{uid}/blocks/{blockedUserId}`.

Approved entries were readable by the owner or by members of the same **company** `crewId`. `subscribeToPublicProofs` queried every approved entry. `subscribeToSocialProofs` queried own entries plus same-company `crewId`. `proofs` was readable by any signed-in user. Username documents were fully readable, including list.

Admin access used `admins/{uid}`, hardcoded developer UIDs/emails, and `users.role` / `isAdmin`.

## New Crew model

Everyday social graph is now 1:1 **Crew connections**. The named company Crew is preserved for zines/archives and is no longer the default empty-state social world.

| Piece | Location |
| --- | --- |
| Source of truth | `crewConnections/{minUid}::{maxUid}` |
| Fields | `userLow`, `userHigh`, `participants`, `requesterId`, `addresseeId`, `status`, snapshots, timestamps, optional `blockedBy` |
| Statuses | `pending`, `accepted`, `declined`, `removed`, `blocked` |
| Viewer states | `none`, `outgoing_request`, `incoming_request`, `accepted`, `blocked` |
| Writes | Server-only via `/api/social/crew/*` |
| Search | `/api/social/search-players` against `usernames` prefix, never a client download of all users |
| Spotlight | `/api/community/spotlight` sanitized public cards |
| Standings | `/api/community/standings` sanitized public cards |

Duplicate protection uses the deterministic pair id plus transactional `resolveCrewConnectionWrite`. Mutual pending requests become `accepted`. Repeat taps are idempotent.

## Privacy contract

| DATA | ME | ACCEPTED CREW | UNRELATED PLAYER | PUBLIC COMMUNITY | ADMIN |
| --- | --- | --- | --- | --- | --- |
| Own profile, missions, receipts, progress, activity, memories | Yes | No | No | No | Yes |
| Public identity (display name, username, Explorer Type, avatar, public level/title) | Yes | Yes | Search/spotlight/profile card only | Spotlight/standings cards | Yes |
| Email, UID as visible identity, admin/trust/risk, private location | Yes | No | No | No | Yes |
| Approved receipt with `feedVisibility: crew_only` | Yes | Yes | No | No | Yes |
| Approved receipt with `feedVisibility: private` | Yes | No | No | No | Yes |
| Approved receipt with `feedVisibility: public_discovery` | Yes | Yes | Yes, if explicitly public | Yes | Yes |
| Pending Crew request | Sees outgoing | Sees incoming; **no Crew-only content** | No | No | Yes |
| Named Crew company archives/zines | If member | Company members only (existing clan rules) | No | No | Yes |
| Username directory list | No | No | No | No | Yes |
| Full `users` list | No | No | No | No | Yes |

Default for a player who never changed settings remains **Crew only**. Ordinary activity is not globally published.

## Crew lifecycle

`none` → send request (`pending`, viewer `outgoing_request` / peer `incoming_request`) → accept (`accepted`) or decline (`declined`, back to `none`) → remove (`removed`, back to `none`) or block (`blocked` + `users/{uid}/blocks/{peer}`).

A pending request is not accepted Crew. Removed Crew can be requested again. Blocked players cannot send new requests.

## Feed logic

Normal player feed is composed of:

1. The viewer's own eligible activity
2. Accepted 1:1 Crew activity that is not private
3. Existing named-company `crewId` activity, to preserve current company behavior
4. Explicit `feedVisibility: public_discovery` content

It does not scan every user or every entry and hide strangers in the UI. Queries are constrained. Broad `entries` list queries are denied by rules.

Community Spotlight is a separate player-card surface. It does not follow those players or add them to the feed.

## Security

Firestore changes:

- `users` list is admin-only; get remains owner/admin
- `usernames` get remains public for exact lookup; list is admin-only
- `canReadSocialEntry` allows owner, accepted 1:1 Crew, same company Crew, or explicit public discovery; pending/declined/removed/blocked do not grant access
- `crewConnections` readable by participants; writes server-only
- `proofs` no longer globally readable by every signed-in user

Client leaderboards no longer query the full `users` collection.

Rules coverage is in `src/__tests__/crewGraphRules.integration.test.ts`.

## UI surfaces changed

- `src/pages/Crew.tsx` — My Crew people graph is the primary surface; named Crew company is secondary
- `src/components/crew/CrewPeopleHome.tsx` — empty state, Find Players, incoming/outgoing/accepted, Community Spotlight
- `src/pages/PlayerPublicProfile.tsx` — `/players/:username`
- `src/pages/Basecamp.tsx` and `BasecampCrewSummary` — empty Crew + Find Players; request count does not override Next Action
- `src/components/CommunityProofsFeed.tsx` and `src/pages/BigBoard.tsx` — feed composition
- `src/context/AppContext.tsx` — Crew graph subscription; sanitized standings
- `src/components/ContentMenu.tsx` — block also closes Crew access
- Profile privacy copy already reserved public discovery; defaults unchanged

`resolvePlayerGuidance` was not modified.

## Live scenarios

Run against local emulators after `npm run seed:emulator`. Sign up as the local player (`LOCAL-DEV-PLAYER`), then use fixture usernames `socialb`, `socialc`, `sociald`, `sociale`.

| ID | Scenario | Result |
| --- | --- | --- |
| S1 | Brand new player: Crew = 0, no stranger feed, own content, Find Players, limited spotlight | PASS in code/rules/unit tests; live UI follows empty graph |
| S2 | Search + request: safe identity, Request Sent, incoming on peer, no Crew content yet | PASS in graph logic + rules (pending ≠ accepted) |
| S3 | Accept: both in Crew, no duplicate pair doc | PASS in graph write + rules |
| S4 | Decline: no Crew, no Crew-only access | PASS |
| S5 | Remove: both views clear, Crew-only reads fail | PASS in rules test `removed Crew relationship removes Crew-only access` |
| S6 | Unrelated privacy: direct path/UID cannot read private Crew-only content | PASS in rules tests |
| S7 | Block: relationship blocked, no Crew-only access, no new requests | PASS in graph write + rules |
| S8 | Feed: own + accepted Crew + explicit public; not unrelated private | PASS in `composeCrewSocialFeed` + feed tests |

## Regression

See the PR test log for exact suite output. Intended suites: crew graph unit tests, community feed, guidance/Basecamp, Starter, Trevor, beta blockers, mission scoring, emulator guard, Firestore rules including the new Crew graph rules, lint (`tsc --noEmit`), and build.

## Deferred

- Deck Store and paid deck ownership
- Lotería photo board
- Voting 2.0
- DMs/chat
- Crew groups beyond the existing named company
- Social recommendations
- Push notifications
- Major Basecamp redesign
- Mission scoring redesign
- Reward redesign
