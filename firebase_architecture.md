# Field Trip: Firebase Backend Architecture

## Strategy
This app uses a **Client-Side Heavy / Server-Side Verified** architecture. The client initiates state, but critical game logic is enforced via Firestore Security Rules and Cloud Functions.

## Critical Server-Side Operations (Cloud Functions)
The following operations **MUST** bypass client constraints and be implemented as Cloud Functions for security and integrity:

1. **`approveEntry`**:
   - **Trigger**: Called by an Admin OR automatically after AI validation.
   - **Logic**: 
     - Verify `status` is currently `submitted`.
     - Update `status` to `approved`.
     - Increment `User.points` by the challenge value (plus Field Type modifiers).
     - Increment `User.soloCount`.
     - Update `LeaderboardScore`.
   - **Why**: Prevents users from giving themselves unlimited points.

2. **`castSnitch`**:
   - **Trigger**: Callable function or write trigger.
   - **Logic**: 
     - Check if sender has `canSnitchNow == true`.
     - Create a `Notification` for the target.
     - (Optional) Apply immediate point deduction to target.
   - **Why**: Handles cross-user state changes reliably.

3. **`aiValidateProof`**:
   - **Trigger**: Firestore Trigger on `Entry` create.
   - **Logic**: 
     - Pass `Entry.proofImage` and `Challenge.description` to Gemini API.
     - If AI confirms proof, transition to `approved` (or flag for review).

## Rule Enforcement Summary
- **Default Deny**: All paths are locked by default.
- **Identity Lock**: `request.auth.uid` must match the document path for user data.
- **Verified Only**: Critical writes require `request.auth.token.email_verified == true`.
- **Economic Safety**: Points fields are immutable for the client (`incoming().points == existing().points`).
- **State Guard**: Users can only set status to `submitted`. transitions to `approved` fail rule checks for users.

## Storage Security
- **Path Isolation**: Files stored at `proofPhotos/{uid}/{entryId}/{fileName}`.
- **Type Guard**: Only `image/*` mimetypes accepted.
- **Size Guard**: Max 5MB per upload to prevent resource exhaustion attacks.
