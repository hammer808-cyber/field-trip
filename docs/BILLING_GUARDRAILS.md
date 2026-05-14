# Field Trip App: Billing & Operation Guardrails

This document outlines the hard guardrails implemented to prevent runaway costs, excessive API usage, and billing spikes.

## 1. Centralized Guarded Service Layer
All expensive or limited service calls (Firebase, Storage, AI/Vision, Cloud Functions) are routed through a centralized `guardedCall` utility in `/src/services/guardedService.ts`.

- **Cooldowns:** Enforced wait times between consecutive calls from the same user (e.g., 5s for submissions, 15s for AI proof checks).
- **In-flight Locking:** Prevents duplicate overlapping requests if a user double-clicks or experiences latency.
- **Graceful Failures:** Returns user-friendly "System Busy" messages rather than raw API errors.

## 2. Global Kill Switches
Managed via `/appConfig/global` in Firestore and monitored in real-time by the app.

- **Maintenance Mode:** Blocks all field submissions and record writes.
- **AI/Proof Switch:** Disables the Proof Evidence Department (Gemini Vision) to stop AI costs.
- **Upload Switch:** Discovered/blocked mass storage uploads.
- **Leaderboard throttling:** Option to disable live leaderboard updates to reduce Firestore read counts.

## 3. Proof Check Protections
Located in `/src/services/proofService.ts`.

- **Daily Quota:** Hard limit on automated proof evaluations per user per day (default: 5).
- **Status Gating:** Once a proof is `approved`, `rejected`, or `pending`, subsequent checks are blocked.
- **Transaction Safety:** Checks are recorded in a separate `proofReviews` collection for auditability.

## 4. Storage & Upload Hardening
Located in `/src/services/storageService.ts`.

- **Client-side Compression:** Images are resized (max 1000px) and compressed (JPEG 0.7) on the client before being sent across the wire.
- **Size Limits:** Hard 5MB limit enforced after compression.
- **MIME Validation:** Only `image/*` content is accepted.

## 5. Firestore Read/Write Optimization
- **Pagination:** All feeds (Journal, Leaderboard, Admin tools) use `limit()` and Cursor-based pagination.
- **Count Optimization:** Global stats use `getCountFromServer()` which is 100x cheaper than `getDocs()`.
- **Restricted Write Access:** 
  - **Sensitive Fields:** `points`, `score`, `role`, and `audit` fields can only be modified by the System/Admin.
  - **Idempotency:** Submission IDs are checked before creation to prevent duplicates.

## 6. Security Rule Enforcement
Hardened `firestore.rules` and `storage.rules` implement the "Eight Pillars of Security":
- **Default Deny:** All paths are blocked by default.
- **Identity Integrity:** Users can only create documents where `userId` matches their Auth UID.
- **Size Guards:** String lengths and file sizes are strictly capped in the rules themselves.
- **Relational Sync:** Access to sub-resources requires valid parent document status.

## 7. Emergency Response
In the event of a billing spike:
1. Set `maintenanceMode: true` in `/appConfig/global`.
2. Disable `proofChecksEnabled` to stop AI processing.
3. Check GCP Console for Top 10 expensive operations.
