# Local Authenticated Testing

This is a **development-only** path for exercising Fieldtrip as a normal player without touching production Auth, Firestore, Storage, or real user data.

It is not a skip-login switch. Signup, invite validation, and gameplay still run through the real app flows. They talk to local Firebase emulators instead of production.

## Production exclusion

The emulator path cannot activate in production. All of the following must be true:

1. **Server:** `NODE_ENV` is not `production`, and Cloud Run/Functions signals (`K_SERVICE`, `K_REVISION`, `K_CONFIGURATION`, `FUNCTION_TARGET`, `FUNCTION_NAME`) are unset.
2. **Server:** `FIREBASE_AUTH_EMULATOR_HOST` and `FIRESTORE_EMULATOR_HOST` are set to **loopback** (`127.0.0.1` or `localhost`) with ports.
3. **Client:** Vite `import.meta.env.DEV` is true, `PROD` is false, `MODE` is not `production`, and `VITE_USE_FIREBASE_EMULATORS=true`.
4. **Seed / review scripts:** same server guard as (1)+(2). They also require the emulator hub to be reachable before writing.

A production Cloud Run service sets `K_SERVICE` and `NODE_ENV=production`. A production Vite build sets `import.meta.env.DEV=false`. Either one is enough to fail closed, even if emulator host variables are accidentally present.

The local invite code is **not** rendered in Welcome, Access Code, Sign Up, or Sign In. Testers type it into the existing invite field.

## What this does not do

- Does not weaken production authentication.
- Does not add a production-accessible skip-login control.
- Does not create or use a real production user.
- Does not write production Firestore or Auth data.
- Does not change Starter, Basecamp, Trevor, or navigation product behavior.

## Run

In three terminals from the repo root:

```bash
npm run emulators
```

Wait until Auth (9099), Firestore (8080), and Storage (9199) are up, then:

```bash
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199 \
npm run seed:emulator
```

```bash
npm run dev:emulator
```

Open `http://localhost:3000`. A **Local emulator** badge appears only in this mode.

## First-time player fixture

The seed creates:

- Invite code `LOCAL-DEV-PLAYER` (active, high max uses)
- App config, starter missions, public decks, active season
- A **separate** emulator admin for review actions
- **No player account for the tester** — sign up through the UI as a normal player
- **Social fixtures** for Crew privacy testing (emulator-only, password `LocalPlayer1!` unless `LOCAL_EMULATOR_PLAYER_PASSWORD` is set):
  - `social-b@emulator.test` / username `socialb` — unrelated player
  - `social-c@emulator.test` / username `socialc` — intended accepted Crew partner, plus one explicit `public_discovery` receipt
  - `social-d@emulator.test` / username `sociald` — intended incoming-request partner
  - `social-e@emulator.test` / username `sociale` — intended block target

These fixture players are searchable after you sign up as the local player. They are not automatically added to a new player's Crew.

Suggested local-only signup (not a production identity):

- Invite: `LOCAL-DEV-PLAYER`
- Email: `local-player@emulator.test`
- Username: `localplayer`
- Password: any value that meets the on-screen rules (example: `LocalPlayer1!`)

Onboarding starts incomplete: no Starter missions, no Dex/Voting/Big Board unlock.

## Review actions (needs-more-proof / reject / approve)

Do not log in as the admin in the player browser. Keep the player session as a normal player. In another terminal:

```bash
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199 \
npm run review:emulator -- list

npm run review:emulator -- needs-more <entryId>
npm run review:emulator -- reject <entryId>
npm run review:emulator -- approve <entryId>
```

Those commands call the existing `/api/admin/proof-review/action` route with the emulator admin token.

The emulator admin email is `emulator-admin@localhost`. Its password lives only in the local seed/review scripts (`LocalAdmin1!` unless `LOCAL_EMULATOR_ADMIN_PASSWORD` is set). It is not a production credential.

## AI analysis

The seed turns `aiImageAnalysisEnabled` off so proof submit can proceed without a Gemini key. Submissions still go through the normal pending-review path.

## Isolation tests

```bash
npm run test:emulator-guard
```
