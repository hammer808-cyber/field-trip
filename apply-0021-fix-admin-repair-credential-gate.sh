#!/usr/bin/env bash
set -euo pipefail

python3 <<'PY'
from pathlib import Path

server = Path("server.ts")
if not server.exists():
    raise SystemExit("server.ts not found. Run this from the repo root, for example /workspaces/field-trip.")

text = server.read_text()

helper = r'''
function getAdminCredentialSetupMessage() {
  const hasServiceAccountJson = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  const hasCredentialFile = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  if (hasServiceAccountJson || hasCredentialFile || process.env.NODE_ENV === 'production') return null;
  return 'Firebase Admin credentials are not configured for this server. Add FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_BASE64 to the server environment, then restart the app.';
}

function assertAdminCredentialsReady() {
  const setupMessage = getAdminCredentialSetupMessage();
  if (setupMessage) {
    throw new Error(setupMessage);
  }
  if (!adminApp || !dbAdmin) {
    throw new Error('DB_ADMIN_NOT_READY: Firebase Admin is not initialized yet. Restart the app after adding Firebase Admin credentials.');
  }
}

'''

if "function assertAdminCredentialsReady(" not in text:
    markers = [
        "\nasync function initAdmin()",
        "\nfunction initAdmin()",
        "\n// Initialize Firebase Admin",
    ]
    for marker in markers:
        if marker in text:
            text = text.replace(marker, "\n" + helper + marker, 1)
            break
    else:
        # Last-resort insert after the admin variables used by the helper.
        marker = "let dbAdmin"
        idx = text.find(marker)
        if idx == -1:
            raise SystemExit("Could not find a safe place to add assertAdminCredentialsReady in server.ts")
        line_end = text.find("\n", idx)
        text = text[:line_end + 1] + helper + text[line_end + 1:]

if "GOOGLE_APPLICATION_CREDENTIALS_JSON" in text and "JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON" not in text:
    # If the current server already has a service-account parser, teach it the common env alias.
    text = text.replace(
        "process.env.FIREBASE_SERVICE_ACCOUNT_JSON",
        "process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON",
        1
    )

server.write_text(text)
PY

npm run build
