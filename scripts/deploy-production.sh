#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

# Canonical Fieldtrip production deployment.
# Override only with explicit environment variables documented below.

PROJECT_ID="${PROJECT_ID:-field-trip-495823}"
HOSTING_SITE="${HOSTING_SITE:-field-trip-495823}"
PRODUCTION_URL="${PRODUCTION_URL:-https://field-trip-495823.web.app}"
EXPECTED_HTML_MARKER="${EXPECTED_HTML_MARKER:-<div id=\"root\">}"
APPROVED_BRANCH_REGEX="${APPROVED_BRANCH_REGEX:-^(main|release/.+)$}"
ALLOW_DIRTY="${ALLOW_DIRTY:-0}"
ALLOW_NON_MAIN="${ALLOW_NON_MAIN:-0}"
SKIP_TESTS="${SKIP_TESTS:-0}"
DEPLOY_CLOUD_RUN="${DEPLOY_CLOUD_RUN:-0}"
CLOUD_RUN_SERVICE="${CLOUD_RUN_SERVICE:-}"
CLOUD_RUN_REGION="${CLOUD_RUN_REGION:-us-central1}"
CLOUD_RUN_SOURCE="${CLOUD_RUN_SOURCE:-.}"
CLOUD_RUN_SERVICE_ACCOUNT="${CLOUD_RUN_SERVICE_ACCOUNT:-}"
SMOKE_PATHS=("/" "/basecamp" "/deck" "/collection" "/voting" "/big-board")

log()  { printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
warn() { printf '\nWARNING: %s\n' "$*" >&2; }
die()  { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

on_error() {
  local exit_code=$?
  local line_no=${1:-unknown}
  printf '\nDEPLOYMENT FAILED at line %s (exit %s).\n' "$line_no" "$exit_code" >&2
  exit "$exit_code"
}
trap 'on_error $LINENO' ERR

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

run_npm_script_if_present() {
  local script="$1"
  if node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts['$script'] ? 0 : 1)"; then
    log "Running npm script: $script"
    npm run "$script"
  else
    log "Skipping undefined npm script: $script"
  fi
}

json_has_key() {
  local file="$1"
  local key="$2"
  node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); process.exit(Object.prototype.hasOwnProperty.call(p, process.argv[2]) ? 0 : 1)" "$file" "$key"
}

log "Checking required tools"
require_command git
require_command node
require_command npm
require_command firebase
require_command curl

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || die "Run this script from inside the Fieldtrip Git repository."
cd "$REPO_ROOT"

[[ -f package.json ]] || die "package.json not found at repository root: $REPO_ROOT"
[[ -f firebase.json ]] || die "firebase.json not found at repository root: $REPO_ROOT"

BRANCH="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)"
[[ -n "$BRANCH" ]] || die "Detached HEAD is not allowed for production deployment."
COMMIT="$(git rev-parse HEAD)"
SHORT_COMMIT="$(git rev-parse --short=12 HEAD)"

log "Deployment context"
printf 'Repository:       %s\n' "$REPO_ROOT"
printf 'Branch:           %s\n' "$BRANCH"
printf 'Commit:           %s\n' "$COMMIT"
printf 'Firebase project: %s\n' "$PROJECT_ID"
printf 'Hosting site:     %s\n' "$HOSTING_SITE"
printf 'Production URL:   %s\n' "$PRODUCTION_URL"

if [[ "$ALLOW_NON_MAIN" != "1" && ! "$BRANCH" =~ $APPROVED_BRANCH_REGEX ]]; then
  die "Branch '$BRANCH' is not approved for production. Use main/release/* or set ALLOW_NON_MAIN=1 deliberately."
fi

if [[ "$ALLOW_DIRTY" != "1" && -n "$(git status --porcelain)" ]]; then
  git status --short
  die "Working tree has uncommitted changes. Commit/stash them or set ALLOW_DIRTY=1 deliberately."
fi

if [[ "$ALLOW_DIRTY" == "1" && -n "$(git status --porcelain)" ]]; then
  warn "Deploying with uncommitted changes because ALLOW_DIRTY=1."
fi

log "Confirming configured Google/Firebase project"
ACTIVE_GCLOUD_PROJECT=""
if command -v gcloud >/dev/null 2>&1; then
  ACTIVE_GCLOUD_PROJECT="$(gcloud config get-value project 2>/dev/null || true)"
  printf 'gcloud active project: %s\n' "${ACTIVE_GCLOUD_PROJECT:-<unset>}"
  if [[ -n "$ACTIVE_GCLOUD_PROJECT" && "$ACTIVE_GCLOUD_PROJECT" != "$PROJECT_ID" ]]; then
    die "gcloud active project '$ACTIVE_GCLOUD_PROJECT' does not match '$PROJECT_ID'. Run: gcloud config set project $PROJECT_ID"
  fi
fi

firebase projects:list --json >/dev/null

log "Installing dependencies reproducibly"
if [[ -f package-lock.json ]]; then
  npm ci
else
  warn "package-lock.json not found; using npm install. Commit a lockfile for reproducible deployments."
  npm install
fi

if [[ "$SKIP_TESTS" == "1" ]]; then
  warn "Skipping validation because SKIP_TESTS=1. This should be exceptional."
else
  run_npm_script_if_present lint
  run_npm_script_if_present typecheck
  if node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts.test ? 0 : 1)"; then
    log "Running test suite"
    npm test -- --run
  else
    log "Skipping undefined npm script: test"
  fi
fi

run_npm_script_if_present build

DEPLOY_TARGETS=()
if json_has_key firebase.json firestore; then
  DEPLOY_TARGETS+=("firestore:rules" "firestore:indexes")
fi
if json_has_key firebase.json storage; then
  DEPLOY_TARGETS+=("storage")
fi
if json_has_key firebase.json functions; then
  DEPLOY_TARGETS+=("functions")
fi
if json_has_key firebase.json hosting; then
  DEPLOY_TARGETS+=("hosting:${HOSTING_SITE}")
fi

((${#DEPLOY_TARGETS[@]} > 0)) || die "No deployable Firebase services found in firebase.json."

TARGET_CSV="$(IFS=,; echo "${DEPLOY_TARGETS[*]}")"
log "Deploying Firebase services: $TARGET_CSV"
firebase deploy \
  --project "$PROJECT_ID" \
  --only "$TARGET_CSV" \
  --message "Fieldtrip production ${BRANCH}@${SHORT_COMMIT}"

if [[ "$DEPLOY_CLOUD_RUN" == "1" ]]; then
  require_command gcloud
  [[ -n "$CLOUD_RUN_SERVICE" ]] || die "DEPLOY_CLOUD_RUN=1 requires CLOUD_RUN_SERVICE."

  GCLOUD_ARGS=(
    run deploy "$CLOUD_RUN_SERVICE"
    --project "$PROJECT_ID"
    --source "$CLOUD_RUN_SOURCE"
    --region "$CLOUD_RUN_REGION"
    --quiet
  )

  if [[ -n "$CLOUD_RUN_SERVICE_ACCOUNT" ]]; then
    GCLOUD_ARGS+=(--service-account "$CLOUD_RUN_SERVICE_ACCOUNT")
  fi

  log "Deploying Cloud Run service: $CLOUD_RUN_SERVICE ($CLOUD_RUN_REGION)"
  gcloud "${GCLOUD_ARGS[@]}"
fi

log "Running public smoke tests"
for path in "${SMOKE_PATHS[@]}"; do
  url="${PRODUCTION_URL%/}${path}"
  body_file="$(mktemp)"
  status="$(curl \
    --silent \
    --show-error \
    --location \
    --retry 3 \
    --retry-all-errors \
    --connect-timeout 10 \
    --max-time 30 \
    --output "$body_file" \
    --write-out '%{http_code}' \
    "$url")"

  if [[ ! "$status" =~ ^2[0-9][0-9]$ ]]; then
    rm -f "$body_file"
    die "Smoke test failed for $url with HTTP $status"
  fi

  if [[ -n "$EXPECTED_HTML_MARKER" ]] && ! grep -Fq "$EXPECTED_HTML_MARKER" "$body_file"; then
    rm -f "$body_file"
    die "Smoke test for $url returned HTTP $status but did not contain expected marker: $EXPECTED_HTML_MARKER"
  fi

  rm -f "$body_file"
  printf 'PASS %-14s HTTP %s\n' "$path" "$status"
done

log "Deployment complete"
printf 'Project: %s\n' "$PROJECT_ID"
printf 'Branch:  %s\n' "$BRANCH"
printf 'Commit:  %s\n' "$COMMIT"
printf 'URL:     %s\n' "$PRODUCTION_URL"
printf 'Targets: %s\n' "$TARGET_CSV"
