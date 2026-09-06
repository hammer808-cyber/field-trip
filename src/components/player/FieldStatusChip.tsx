import React from 'react';
import { CheckCircle2, Clock3, Lock, RotateCcw, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export const FIELD_STATUS_LABELS = {
  here: 'Here',
  now: 'Now',
  locked: 'Locked',
  in_progress: 'In progress',
  pending: 'Pending',
  approved: 'Approved',
  needs_more_proof: 'Needs more proof',
  rejected: 'Rejected',
  complete: 'Complete',
} as const;

export type FieldStatusKey = keyof typeof FIELD_STATUS_LABELS;

const STATUS_ICONS: Record<FieldStatusKey, React.ComponentType<{ className?: string }>> = {
  here: CheckCircle2,
  now: Clock3,
  locked: Lock,
  in_progress: Clock3,
  pending: Clock3,
  approved: CheckCircle2,
  needs_more_proof: RotateCcw,
  rejected: XCircle,
  complete: CheckCircle2,
};

export function FieldStatusChip({
  status,
  label,
  className,
}: {
  status: FieldStatusKey;
  label?: string;
  className?: string;
}) {
  const Icon = STATUS_ICONS[status];
  return (
    <span className={cn('ft-status-chip', `ft-status-chip--${status}`, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label || FIELD_STATUS_LABELS[status]}
    </span>
  );
}
