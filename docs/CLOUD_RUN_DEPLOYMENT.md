# Cloud Run Deployment

Fieldtrip is moving away from AI Studio as the deployment source. GitHub `main` should become the production source of truth, and Cloud Run should run the built Vite + Express app because `server.ts` serves both the frontend and API routes.

## Current Repo Contract

- Build: `npm run build`
- Type check: `npm run lint`
- Production start: `npm start`
- Server entrypoint after build: `dist/server.cjs`
- Runtime port: `server.ts` reads `process.env.PORT || 8080` and listens on `0.0.0.0`
- Health check: `GET /api/health`

## Required Google Cloud APIs

Enable these APIs in the Google Cloud project that will host the Cloud Run service:

- Cloud Run API: `run.googleapis.com`
- Cloud Build API: `cloudbuild.googleapis.com`
- Artifact Registry API: `artifactregistry.googleapis.com`
- Secret Manager API: `secretmanager.googleapis.com`
- Firestore API: `firestore.googleapis.com`
- Firebase App Check API: `firebaseappcheck.googleapis.com`
- Identity Toolkit API: `identitytoolkit.googleapis.com`
- Cloud Storage API: `storage.googleapis.com`

```sh
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  firebaseappcheck.googleapis.com \
  identitytoolkit.googleapis.com \
  storage.googleapis.com
```

## Manual Deploy

Run this from the repository root after authenticating `gcloud` and selecting the target project:

```sh
gcloud config set project field-trip-495823
gcloud run deploy fieldtrip \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --service-account fieldtrip-cloud-run@field-trip-495823.iam.gserviceaccount.com \
  --set-env-vars NODE_ENV=production,ENFORCE_APP_CHECK=false,VITE_FIREBASE_APPCHECK_DEBUG=false \
  --set-secrets GEMINI_API_KEY=gemini_api_key:latest,VITE_RECAPTCHA_SITE_KEY=recaptcha_site_key:latest
```

Cloud Run source deploys use Cloud Build. Because this repo includes a `Dockerfile`, the source deploy should build the container from that file.

After the first deploy succeeds, add the final Cloud Run URL to any Firebase App Check/reCAPTCHA allowed domain settings that require the production domain.

## Optional GitHub Main Trigger

Manual deploy is recommended for the first migration so you can verify secrets, service account permissions, and `/api/health` before automatic production deploys begin.

After the first verified deploy, create a Cloud Build trigger:

- Repository: `hammer808-cyber/field-trip`
- Event: push to branch
- Branch regex: `^main$`
- Build config: use a Cloud Build config that builds this Dockerfile, pushes the image to Artifact Registry, and deploys that image to Cloud Run
- Service account: use a dedicated Cloud Build service account with only the build/deploy roles it needs

If using a trigger, protect `main` in GitHub before enabling automatic deploys.

## Environment Variables

Runtime variables used by the current codebase:

| Name | Required | Source | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | Yes | Cloud Run env var | Set to `production`. |
| `PORT` | Provided by Cloud Run | Cloud Run | Server falls back to `8080` locally. Do not hard-code a different value. |
| `GEMINI_API_KEY` | Yes | Secret Manager | Used by proof analysis and Gemini-backed API behavior. |
| `VITE_RECAPTCHA_SITE_KEY` | Yes | Secret Manager or env var | Firebase App Check reCAPTCHA v3 site key. This value is included in the frontend build/runtime environment. |
| `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` | Optional | Secret Manager or env var | Optional App Check Enterprise key; preferred by the frontend if set. |
| `VITE_FIREBASE_APPCHECK_DEBUG` | Optional | Cloud Run env var | Keep `false` in production. |
| `ENFORCE_APP_CHECK` | Optional hardening | Cloud Run env var | Set `true` after App Check works on the production Cloud Run domain. |
| `ENABLE_STARTUP_PURGE` | Optional local/dev | Cloud Run env var | Leave unset in production unless intentionally enabling startup purge behavior. |
| `APP_URL` | Optional | Cloud Run env var | Set to the Cloud Run/custom domain URL if self-referential links or callbacks need it. |
| `DISABLE_HMR` | Local/dev only | Local env var | Used by Vite dev server configuration only. |

Frontend Firebase config currently comes from `firebase-applet-config.json` in the repo:

- `projectId`
- `appId`
- `apiKey`
- `authDomain`
- `firestoreDatabaseId`
- `storageBucket`
- `messagingSenderId`
- `measurementId`

If the app later moves away from the checked-in Firebase config file, provide equivalent `VITE_FIREBASE_*` variables and update the app code in a separate behavior-changing pass.

## Secrets

Create these Secret Manager secrets before deploy:

```sh
printf '%s' 'YOUR_GEMINI_KEY' | gcloud secrets create gemini_api_key --data-file=-
printf '%s' 'YOUR_RECAPTCHA_SITE_KEY' | gcloud secrets create recaptcha_site_key --data-file=-
```

For existing secrets, add a new version instead:

```sh
printf '%s' 'YOUR_GEMINI_KEY' | gcloud secrets versions add gemini_api_key --data-file=-
printf '%s' 'YOUR_RECAPTCHA_SITE_KEY' | gcloud secrets versions add recaptcha_site_key --data-file=-
```

## Service Account Permissions

Create a dedicated Cloud Run runtime service account, for example:

```sh
gcloud iam service-accounts create fieldtrip-cloud-run \
  --display-name="Fieldtrip Cloud Run runtime"
```

Grant the least-privilege roles that match the app features enabled in production:

- Firestore server access: `roles/datastore.user`
- Firebase Storage / Cloud Storage object access: `roles/storage.objectUser` on the app bucket, or narrower bucket-level permissions if configured
- Firebase Auth / Identity Platform server-side reads: `roles/firebaseauth.viewer` if available in the project; otherwise grant the narrow Identity Platform/Firebase Auth role your organization supports
- App Check token verification: grant the narrow Firebase App Check verifier/admin role available in the project; if unavailable, validate with project IAM policy before using broader Firebase Admin roles
- Secret Manager access for mounted/injected secrets: `roles/secretmanager.secretAccessor` on only the required secrets

The deployer or Cloud Build deploy service account also needs permission to build and deploy:

- `roles/run.admin`
- `roles/iam.serviceAccountUser` on the runtime service account
- Artifact Registry write access, such as `roles/artifactregistry.writer`
- Cloud Build build execution permissions

## First-Deploy Verification

1. Confirm local readiness:

   ```sh
   npm install
   npm run lint
   npm run build
   npm start
   ```

2. Optional local container smoke check:

   ```sh
   docker build -t fieldtrip-cloud-run .
   docker run --rm -p 8080:8080 \
     -e NODE_ENV=production \
     -e PORT=8080 \
     -e GEMINI_API_KEY=placeholder \
     -e VITE_RECAPTCHA_SITE_KEY=placeholder \
     fieldtrip-cloud-run
   curl http://localhost:8080/api/health
   ```

3. Deploy manually with `gcloud run deploy`.
4. Open the Cloud Run URL and confirm the frontend loads.
5. Request `https://SERVICE_URL/api/health`.
6. Confirm the health response shows `status: "ok"` and Firestore changes from `error` to `connected` after service account credentials and IAM are correct.
7. Test one proof submission route only if it is safe to create test data in the target Firebase project.
8. Confirm Cloud Run logs do not contain missing secret, permission, or App Check errors.

## Rollback Notes

Cloud Run keeps revisions. To roll back:

1. Open Cloud Run.
2. Select the `fieldtrip` service.
3. Go to Revisions.
4. Move 100% traffic back to the last known-good revision.

With `gcloud`:

```sh
gcloud run services update-traffic fieldtrip \
  --region us-central1 \
  --to-revisions REVISION_NAME=100
```

If a GitHub `main` trigger is enabled and a bad commit deployed, disable the trigger or revert the commit before moving traffic forward again.
