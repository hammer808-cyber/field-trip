# Beta Bug Triage & Severity Matrix

Any issues discovered during the 5/30 Launch window must be triaged according to this matrix.

## 1. Severity Levels

### [BLOCKER] - Fix Now
- App fails to boot / Crash on Landing.
- "No Active Mission" bug prevents proceeding from Deck to Capture.
- Secure Evidence fails to transmit (Database write fail).
- XP result renders as 0 or NaN.

### [HIGH] - Fix Today
- Resume Mission logic breaks after refreshing.
- Mobile buttons (Secure Evidence) are clipped or impossible to tap.
- Evidence requirements (10 chars for notes) are not communicating why validation failed.

### [MEDIUM] - Fix Next Build
- Layout inconsistencies on larger tablets.
- Mission Archive swipe behavior feels "sticky."
- Reward image fallbacks are functional but use generic placeholders.

### [LOW] - Post-Beta / Polish
- Animation timing (transmission pulse) could be shorter.
- Typo in lore or non-critical mission description.
- Theme accent color mismatch in secondary profile tabs.

---

## 2. Triage Workflow
1. **Log**: Record the bug in the Beta Launch Tracker.
2. **Reproduce**: Attempt to trigger the bug on a similar device.
3. **Categorize**: Multi-disciplinary decision (PM + QA).
4. **Patch**: Branch from `main` -> `fix/bug-id`, test, and merge.
5. **Verify**: Close the ticket after a clean field test.
