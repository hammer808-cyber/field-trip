#!/usr/bin/env bash
set -euo pipefail

python3 <<'PY'
from pathlib import Path

path = Path("src/lib/firebaseInit.ts")
text = path.read_text()

old = """  // Use fallbacks for import.meta.env
  const getEnv = (key: string) => {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) return import.meta.env[key];
    return process.env[key];
  };

  const RECAPTCHA_SITE_KEY = getEnv('VITE_RECAPTCHA_SITE_KEY');
  const RECAPTCHA_ENTERPRISE_SITE_KEY = getEnv('VITE_RECAPTCHA_ENTERPRISE_SITE_KEY');
  const DEBUG_FLAG = getEnv('VITE_FIREBASE_APPCHECK_DEBUG') === 'true';
  const IS_PROD = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.PROD : process.env.NODE_ENV === 'production';
"""

new = """  // Browser-safe env reader. Vite client code does not have Node's process object.
  const getEnv = (key: string) => {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key] !== undefined) {
      return import.meta.env[key];
    }
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
    return undefined;
  };

  const RECAPTCHA_SITE_KEY = getEnv('VITE_RECAPTCHA_SITE_KEY');
  const RECAPTCHA_ENTERPRISE_SITE_KEY = getEnv('VITE_RECAPTCHA_ENTERPRISE_SITE_KEY');
  const DEBUG_FLAG = getEnv('VITE_FIREBASE_APPCHECK_DEBUG') === 'true';
  const IS_PROD = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.PROD : getEnv('NODE_ENV') === 'production';
"""

if new in text:
    print("Firebase env crash fix already applied.")
elif old in text:
    path.write_text(text.replace(old, new, 1))
    print("Firebase env crash fix applied.")
else:
    raise SystemExit("Could not find firebaseInit env block. Paste src/lib/firebaseInit.ts lines 14-32.")
PY

npm run build
