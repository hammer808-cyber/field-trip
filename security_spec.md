# Security Specification for Field Trip

## Data Invariants
1. **Identity Integrity**: Users can only create and partially update their own profiles and entries.
2. **Economic Integrity**: Points and scores are immutable for the client; they must be managed by backend logic or approved by admins.
3. **Relational Consistency**: Entries must reference valid challenges.
4. **Access Control**: Crew data and private profiles are strictly restricted to members/owners.
5. **State Transitions**: Challenge submissions start at 'submitted' and can only be moved to 'approved' or 'rejected' by admins.

## The "Dirty Dozen" (Attack Payloads)
1. **Self-Promotion**: `setDoc('/users/MY_UID', { points: 99999, ... })`
2. **Account Takeover (Partial)**: `updateDoc('/users/ANOTHER_UID', { name: 'Hacker' })`
3. **Instant Approval**: `addDoc('/entries', { status: 'approved', pointsAwarded: 500, ... })`
4. **Shadow Approval**: `updateDoc('/entries/MY_ENTRY', { status: 'approved' })`
5. **Challenge Counterfeiting**: `setDoc('/challenges/fake', { points: 1000, ... })`
6. **Notification Spam**: `addDoc('/notifications/OTHER_USER/items', { title: 'You got hacked', ... })`
7. **Leaderboard Spoofing**: `setDoc('/leaderboard/season1/scores/MY_UID', { points: 1000000 })`
8. **PII Leak**: `getDoc('/users/ANOTHER_UID/private/profile')`
9. **Identity Theft**: `addDoc('/crews/crew1/members/ANOTHER_UID', { role: 'admin' })`
10. **Denial of Wallet**: Sending 1MB of garbage text in the `note` field of an entry.
11. **ID Poisoning**: Creating a document with a 2KB long ID string.
12. **Role Escalation**: `updateDoc('/users/MY_UID', { isAdmin: true })`

## The Test Runner
See `firestore.rules.test.ts` for implementation of these checks.
