# ADMIN BETA REVIEW GUIDE

This guide is for admins managing the Fieldtrip Beta submissions.

## 1. Accessing the Queue
1. Log in with an **Admin Account**.
2. Navigate to the **Admin Review Panel** (usually via `/admin/review` or the admin dashboard icon).

## 2. Reviewing Submissions
- **View Proof**: Look at the uploaded image and the user's field note.
- **AI Context**: Check what the Evidence Detector saw (if available).
- **Standards**:
  - **Approve**: Image matches the mission prompt + Note adds context.
  - **Needs More Proof**: Image is blurry, incorrect subject, or note is missing required details.
  - **Reject**: Spam, inappropriate content, or deliberate cheating.

## 3. Impact of Actions
- **Approval**: 
  - Awards base XP + Catalyst bonuses.
  - Updates the user's Starter Signals count (3 needed for deck unlocks).
  - Syncs the mission to the user's **Collection**.
- **Request More Proof**: Moves mission to the user's "Action Required" list.
- **Rejection**: Allows the user to "Retry" the mission (removes active status).

## 4. Managing Decks
- Confirm **SoCal Summer** and **Heatwave Receipts** are gated behind the `starter-complete` rule (3 approvals).
- Use the **Admin Dev Tools** to inspect deck mission counts and active overrides if a tester gets stuck.

## 5. Security & Safety
- **Audit Logs**: Monitor the `adminLogs` collection for all review actions.
- **Reporting**: If a tester reports offensive content via the **Report Modal**, handle it immediately in the **Moderation Panel**.

## 6. Pro-Tips
- Do not "Bulk Approve" without looking; beta testing quality depends on honest review friction.
- If a user reports a bug in the "Fix Proof" flow, use the **User Data Reset** tool carefully as a last resort.
