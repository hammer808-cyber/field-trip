# Fieldtrip Codex Workflow

**Status:** Canonical
**Applies to:** Codex prompts, repository changes, branch work, reviews, deployment, and technical handoff

This workflow keeps Codex from improvising product rules, modifying unrelated systems, or deploying from the wrong branch. Computers are literal; humans remain oddly committed to giving them ambiguous instructions and acting surprised.

---

## 1. Canonical Context Order

Before changing Fieldtrip, Codex must read:

1. `FIELDTRIP_PRODUCT_RULES.md`
2. `FIELDTRIP_DESIGN_SYSTEM.md`
3. `FIELDTRIP_GAME_LOGIC.md`
4. `FIELDTRIP_CODEX_WORKFLOW.md`
5. task-specific issue, prompt, screenshots, or reference assets
6. current implementation and tests

If a requested change conflicts with a canonical file, Codex must:

- identify the conflict;
- preserve current behavior until the decision is resolved;
- update the canonical file in the same change when the user explicitly chooses the new rule.

Missing reference files are blockers for reference-specific visual matching. Codex must not invent details from a folder that is absent from the checkout, Git history, or supplied assets.

---

## 2. Repository Orientation

Run before editing:

```bash
pwd
git rev-parse --show-toplevel
git status --short --branch
git remote -v
git fetch --all --prune
```

Confirm:

- correct repository;
- current branch;
- upstream branch;
- working tree state;
- referenced files exist;
- package manager from lockfile;
- deployment target from checked-in config.

Never run Git commands from `$HOME` and then diagnose “not a git repository” as though the repository has betrayed you personally.

---

## 3. Branch Rules

Use one branch per scoped change.

Recommended prefixes:

- `feat/`
- `fix/`
- `refactor/`
- `chore/`
- `docs/`

Example:

```bash
git switch main
git pull --ff-only origin main
git switch -c feat/basecamp-redesign
```

Rules:

- Do not reuse an unrelated old branch.
- Do not merge or commit unrelated local changes into the task.
- Never force-push unless explicitly authorized and the branch is not shared.
- Do not edit directly on `main` except an explicitly authorized emergency workflow.

---

## 4. Task Intake Template

A strong Codex instruction includes:

```text
Goal:
[One outcome.]

Canonical references:
- FIELDTRIP_PRODUCT_RULES.md
- FIELDTRIP_DESIGN_SYSTEM.md
- FIELDTRIP_GAME_LOGIC.md

Scope:
[Files/routes/components allowed to change.]

Must preserve:
[Auth, guards, data contracts, existing behavior, visual assets, etc.]

Required states:
[Loading, empty, locked, error, success, mobile.]

Acceptance criteria:
[Observable behavior and tests.]

Do not:
[No unrelated refactors, no invented routes, no schema changes without migration.]

Validation:
[Commands and manual checks.]
```

---

## 5. Audit Before Edit

Codex must inspect the complete path of the feature:

- route definition;
- page component;
- shared components;
- context/state hooks;
- services and queries;
- Firestore rules/indexes;
- tests;
- feature flags/config;
- mobile and desktop rendering;
- error handling;
- analytics/logging where present.

The audit output should separate:

- verified facts;
- likely cause;
- assumptions;
- proposed files;
- risks;
- out-of-scope findings.

Do not change code during the audit unless the task explicitly asks for immediate repair and the cause is confirmed.

---

## 6. Implementation Rules

### Preserve architecture

- Reuse canonical resolvers and services.
- Do not duplicate Starter-count, score, or unlock logic in components.
- Do not fork a page for each skin.
- Do not create a new status name because the existing one was inconvenient to type.

### Keep changes scoped

- Touch the smallest coherent set of files.
- Avoid drive-by formatting.
- Avoid dependency upgrades unless required.
- Avoid schema changes without migration and rollback notes.

### Handle every state

Implement:

- loading;
- empty;
- ready;
- locked;
- error;
- success;
- mobile;
- accessibility behavior.

### Security

- Treat client state as untrusted.
- Review Firestore Rules for every new read/write path.
- Keep admin and score mutations in trusted code.
- Preserve App Check behavior.

---

## 7. Validation Commands

Use the package manager indicated by the repository lockfile.

Typical npm validation:

```bash
npm ci
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

If scripts differ, inspect `package.json` and run the actual equivalents. Do not claim a check passed if the script does not exist.

For Firebase changes:

```bash
firebase use --project field-trip-495823
firebase emulators:exec --project field-trip-495823 "npm test -- --run"
```

Use targeted tests during development and the full required suite before handoff.

---

## 8. Manual QA Matrix

For changed gameplay, test at least:

| State | Required check |
|---|---|
| New player | legal/onboarding route works |
| Mid-onboarding | resume state works |
| Starter 0/3, 1/3, 2/3 | progress and draw eligibility agree |
| Starter 3/3 approved | gated systems unlock |
| Pending proof | no final Field XP or duplicate draw |
| Needs More Proof | direct repair link works |
| Approved | one score event and updated progress |
| Rejected | no final score, correct retry/return behavior |
| Season closed | exact lock explanation |
| Mobile | safe areas, keyboard, camera, bottom nav |
| Slow/offline | retry and preserved work |
| Non-admin | admin writes denied |

---

## 9. Change Review

Before committing:

```bash
git status --short
git diff --stat
git diff --check
git diff
```

Review for:

- accidental files;
- secrets or `.env` values;
- generated artifacts that should not be committed;
- stale debug flags;
- unrelated formatting;
- changed user-facing labels;
- route and state regressions;
- missing tests.

---

## 10. Commit and Push

Use an intentional commit:

```bash
git add <explicit-files>
git commit -m "feat: add canonical Fieldtrip design truth"
git push -u origin HEAD
```

Avoid `git add .` when unrelated files are present.

A handoff must include:

- branch name;
- commit SHA;
- files changed;
- tests run and exact results;
- known limitations;
- deployment required or not;
- screenshots for visual changes.

---

## 11. Pull Request Rules

A PR description should contain:

```markdown
## What changed

## Why

## Canonical rules affected

## Test evidence

## Manual QA

## Screenshots

## Risks and rollback
```

PRs changing product rules must update the corresponding canonical file.

Do not merge when:

- required checks fail;
- the branch includes unrelated work;
- security rules are untested;
- score/unlock migrations are missing;
- mobile behavior was not checked;
- a known dead-end route remains.

---

## 12. Deployment Workflow

Canonical production target:

- Google Cloud/Firebase project: `field-trip-495823`
- Firebase Hosting site: `field-trip-495823`
- Default production URL: `https://field-trip-495823.web.app`
- Firestore database ID: `ai-studio-6bdf91b5-28e9-46f3-ae49-89cf99e2d88a`

The checked-in script is:

```bash
./scripts/deploy-production.sh
```

The script must:

- stop on errors;
- confirm repository root;
- print active Git branch and commit;
- print the active Google/Firebase project;
- reject uncommitted changes by default;
- reject detached HEAD;
- reject non-approved production branches unless overridden;
- install dependencies reproducibly;
- run lint, typecheck, tests, and build when defined;
- deploy Firestore rules/indexes, Storage rules, and Hosting when configured;
- optionally deploy the canonical Cloud Run backend only when explicitly enabled and configured;
- run smoke tests against the production URL;
- print a deployment summary.

Overrides must be explicit environment variables, not hidden edits to the script.

Examples:

```bash
# Normal production deployment
./scripts/deploy-production.sh

# Permit a dirty working tree for a deliberate emergency
ALLOW_DIRTY=1 ./scripts/deploy-production.sh

# Deploy from a reviewed release branch
ALLOW_NON_MAIN=1 ./scripts/deploy-production.sh

# Include configured Cloud Run backend
DEPLOY_CLOUD_RUN=1 \
CLOUD_RUN_SERVICE=fieldtrip \
CLOUD_RUN_REGION=us-central1 \
./scripts/deploy-production.sh
```

---

## 13. Smoke Test Contract

At minimum, smoke tests verify:

- production root returns HTTP 2xx or expected redirect;
- `/basecamp` returns the app shell;
- `/deck` returns the app shell;
- `/collection` returns the app shell;
- `/voting` returns the app shell;
- `/big-board` returns the app shell;
- returned HTML contains an expected app marker;
- no deployment command reported failure.

Authenticated gameplay requires a separate post-deploy QA account or automated end-to-end suite. A public `curl` cannot prove that Firestore, camera capture, admin approval, and voting all work, despite humanity’s recurring hope that one green status code means civilization is stable.

---

## 14. Rollback

Before production deploy, record:

```bash
git rev-parse HEAD
git log -1 --oneline
firebase hosting:releases:list --site field-trip-495823 --project field-trip-495823
```

Rollback options:

- redeploy the last known-good Git commit;
- use Firebase Hosting release rollback/clone workflow when appropriate;
- revert Firestore Rules separately if they caused access regressions;
- never roll back schema-dependent code without checking stored data compatibility.

Document the incident, root cause, affected users, and corrective test.

---

## 15. Standard Codex Completion Message

Codex should finish with:

```text
Completed:
- [concise changes]

Files changed:
- [paths]

Validation:
- [command]: PASS/FAIL

Branch and commit:
- [branch]
- [SHA]

Not changed:
- [important protected systems]

Remaining risks:
- [honest limitations]
```
