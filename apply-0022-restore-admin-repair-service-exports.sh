#!/usr/bin/env bash
set -euo pipefail

python3 <<'PY'
from pathlib import Path

path = Path("src/services/repairService.ts")
if not path.exists():
    raise SystemExit("src/services/repairService.ts not found. Run this from /workspaces/field-trip.")

text = path.read_text()

block = r'''

export interface AdminUserLookupResult {
  uid: string;
  email?: string | null;
  username?: string;
  displayName?: string;
  photoURL?: string | null;
  role?: string;
  isAdmin?: boolean;
  createdAt?: any;
  lastLoginAt?: any;
  starterApprovedCount?: number;
  totalXP?: number;
}

export interface UserResetReport {
  success: boolean;
  mode: 'soft' | 'hard';
  userId: string;
  username?: string;
  email?: string | null;
  archivedCounts: Record<string, number>;
  errors: string[];
}

export async function lookupAdminUsers(searchTerm: string): Promise<AdminUserLookupResult[]> {
  const response = await authenticatedFetch(`/api/admin/user-lookup?q=${encodeURIComponent(searchTerm)}`, {
    method: 'GET'
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || errData.error || `User lookup failed with HTTP ${response.status}`);
  }

  const raw = await response.json();
  return raw.users || raw.results || [];
}

export async function resetUserState(params: {
  targetUserId?: string;
  targetUsername?: string;
  targetEmail?: string;
  mode: 'soft' | 'hard';
  confirmReset: boolean;
  confirmationText?: string;
}): Promise<UserResetReport> {
  const endpoint = params.mode === 'hard'
    ? '/api/admin/hard-reset-user'
    : '/api/admin/soft-reset-user';

  const response = await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || errData.error || `${params.mode} reset failed with HTTP ${response.status}`);
  }

  const raw = await response.json();
  const report = raw.report || raw;
  return {
    success: raw.success !== false,
    mode: params.mode,
    userId: report.userId || params.targetUserId || params.targetUsername || params.targetEmail || 'unknown',
    username: report.username || params.targetUsername,
    email: report.email || params.targetEmail || null,
    archivedCounts: report.archivedCounts || report.countsArchived || {},
    errors: report.errors || []
  };
}

export async function archiveOrphanedProofReviews(dryRun: boolean = false): Promise<any> {
  const response = await authenticatedFetch('/api/admin/archive-orphan-proof-reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dryRun })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || errData.error || `Archive orphan reviews failed with HTTP ${response.status}`);
  }

  return response.json();
}
'''

if "export async function lookupAdminUsers" not in text:
    text = text.rstrip() + block + "\n"

path.write_text(text)
PY

npm run build
