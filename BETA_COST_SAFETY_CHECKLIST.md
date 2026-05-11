# Field Trip Beta Cost Safety Checklist

Deploying a Firebase app for beta testing involves financial and security risks. Follow this checklist to ensure the Bureau's budget remains intact.

## 1. Google Cloud Billing
- [ ] **Set Budget Alerts:** Go to [GCP Billing Console](https://console.cloud.google.com/billing) and set a budget alert at $10, $50, and $100.
- [ ] **Note:** Budget alerts do *not* automatically stop services. They only notify you.
- [ ] **Monitor Usage:** Check the Billing dashboard weekly during beta.

## 2. Firestore Safety
- [ ] **Rule Enforcement:** Ensure `firestore.rules` are deployed and reject any unauthenticated or unauthorized writes.
- [ ] **Index Management:** If you see "missing index" errors in the console, follow the link to create them. Only create required indexes to avoid over-indexing costs.
- [ ] **Pagination Check:** Ensure all feeds (Frontlines, Leaderboard) use `limit()` and pagination.
- [ ] **Aggregation Optimization:** Use `getCountFromServer()` instead of `getDocs().size` for counts.

## 3. Storage Safety
- [ ] **File Size Limits:** Storage rules currently limit uploads to 5MB. Do not increase this unless necessary.
- [ ] **Image Optimization:** The app uses `toDataURL('image/jpeg', 0.85)` to compress images before upload. Maintain this quality setting.
- [ ] **Cleanup:** If users upload many "test" proofs, manually clean up the `proofs/` folder in the Firebase Console occasionally.

## 4. App Hosting / Cloud Run
- [ ] **Concurrency:** set to 80 (default) or higher to handle bursts within fewer instances.
- [ ] **Instance Limits:** If you expect a massive surge, set a `maxInstances` limit in the Cloud Run console to prevent unlimited scaling.

## 5. App Check
- [ ] **Enable Enforcement:** Once `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` is set and verified, enable enforcement for Firestore and Storage in the Firebase Console. This prevents unauthorized scripts from scraping your database.

## 6. Invite-Only Control
- [ ] **Access Codes:** Manage codes in the `accessCodes` collection. Set `maxUses` and `active: false` to stop new signups immediately if needed.

## 7. Gemini API
- [ ] **Quota Monitoring:** Check the [Google AI Studio](https://aistudio.google.com/app/plan) plan limits. The free tier has rate limits (RPM/RPD). If the app crashes during high usage, it might be hitting these limits.

---
**Bureau Security Protocol Alpha-6**
"Proof is expensive. Truth is priceless."
