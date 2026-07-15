# Trevor Guide Audit

## Previous architecture

- `src/components/FieldGuideAssist.tsx` was the only named Trevor renderer and was mounted from `AppLayout` in `src/App.tsx`.
- `src/logic/trevorLogic.ts` selected both copy and hard-coded routes from Starter, deck-unlock, active-mission, and voting flags.
- The component reused `AppContext`, so a second Firestore subscription was not required. It did call `useApp()` twice and recomputed its state on every shell render.
- Mobile and desktop shared one render path. There was no second Trevor component, portal, duplicated DOM ID, or separate desktop modal.
- `src/pages/VotingHubPage.tsx` rendered a second fixed bottom-right question-mark control. It opened voting rules, not Trevor, but occupied the same floating-help space and looked like a duplicate launcher.
- Other `HelpCircle` icons are contextual controls inside mission, crew, and card content. They are not shell launchers and remain in place.

## Problems found

- Trevor was hidden with the general helper bundle during much of Starter onboarding even though Starter guidance is one of its primary jobs.
- The profile-level `fieldGuideAssistEnabled` and `trevorSettings.enabled` preferences were not checked.
- There was no session dismissal, cooldown history, keyboard Escape behavior, or validated action registry.
- The previous action set repeatedly fell through to drawing a deck or checking standings and did not use canonical XP, rank, proof, profile, crew, zine, or current-cycle vote state.
- The old logic logged user state on every evaluation.
- Several routes were obsolete or ineffective:
  - `/capture/{missionId}` did not match the `/capture?id=...` contract.
  - `/deck?deck=...` redirected to `/missions/decks` and could discard the requested deck.
  - `/logbook?filter=starter` did not select the Profile Logbook tab.
  - `/deck` was only a redirect and did not open a specific accessible pack.
- The fixed voting-rules button could overlap Trevor, the bottom navigation, reward feedback, and development controls on mobile.

## Canonical implementation

- `src/components/TrevorGuide.tsx` is the only stateful Trevor instance and is mounted once at the application-shell level.
- `src/components/TrevorGuideView.tsx` owns the existing launcher/panel presentation and accessible native controls.
- `src/services/trevorContextService.ts` normalizes existing `AppContext` data. It does not read Firestore or install listeners.
- `src/services/trevorRecommendationEngine.ts` evaluates deterministic rules by priority.
- `src/config/trevorActions.ts` validates labels, availability, destinations, analytics names, and safe fallbacks.
- `src/content/trevorDialogue.ts` rotates concise curated copy without changing facts or actions.
- `src/services/trevorHistoryService.ts` stores bounded local cooldown history and session suppression.
- Voting rules are now an inline labeled action in the Weekly Voting status card instead of a competing floating question-mark launcher.

## Context sources

Trevor consumes the authenticated user/profile, canonical Starter progress, entries, pending and repair counts, active trip, drawn mission cards, accessible deck packs, canonical level progress, current weekly votes, Pacific voting phase, standings, memories, crew ID, and feature/preferences already exposed by `AppContext`.

Rank-gap advice is produced only when the profile has a weekly rank and score and the adjacent rank exists in the loaded standings. Proof-variety and zine advice is derived only from approved entries, canonical mission proof types, field notes, location evidence, crew-memory eligibility, and loaded memories.

## Verified destinations

- Starter or recommended deck: `/missions/decks?pack={deckId}`
- Active mission: `/mission-briefing?id={missionId}`
- More proof: `/capture?id={missionId}&mode=addMoreProof&entryId={entryId}`
- Rejected retry: `/capture?id={missionId}&isRetry=true&originalEntryId={entryId}`
- Logbook: `/profile?tab=logbook`
- Level progress: `/profile?tab=overview`
- Standings: `/big-board`
- Weekly voting: `/voting`
- Crew Home: `/crew`
- Profile settings: `/profile?tab=settings`
- Zines: `/dex/zines`

## Deliberate limitations

- `AppContext` does not currently expose a canonical open crew-task collection or selector. `crewHasOpenTasks` remains false in production wiring rather than inventing an action from crew membership.
- Recommendation history is local to the browser. It avoids extra reads and works for beta accounts, but cooldown history does not roam across devices.
- The existing profile field `trevorSettings.lastSeenApprovedCount` is read for the post-Starter introduction, but no new server write is added by this UI-only guide upgrade.
