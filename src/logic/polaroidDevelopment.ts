export type PolaroidDevelopmentStage =
  | 'captured'
  | 'ejecting'
  | 'developing_early'
  | 'developing_mid'
  | 'developed';

export const POLAROID_STAGE_TIMINGS = {
  ejecting: 120,
  developing_early: 650,
  developing_mid: 1550,
  developed: 2900,
} as const;

export function getPolaroidStageAtElapsed(
  elapsedMs: number,
  reducedMotion = false,
): PolaroidDevelopmentStage {
  if (reducedMotion) return elapsedMs >= 180 ? 'developed' : 'captured';
  if (elapsedMs >= POLAROID_STAGE_TIMINGS.developed) return 'developed';
  if (elapsedMs >= POLAROID_STAGE_TIMINGS.developing_mid) return 'developing_mid';
  if (elapsedMs >= POLAROID_STAGE_TIMINGS.developing_early) return 'developing_early';
  if (elapsedMs >= POLAROID_STAGE_TIMINGS.ejecting) return 'ejecting';
  return 'captured';
}

export function getPolaroidImageFilter(stage: PolaroidDevelopmentStage): string {
  switch (stage) {
    case 'captured':
    case 'ejecting':
      return 'brightness(0.22) saturate(0.12) contrast(0.55) blur(12px)';
    case 'developing_early':
      return 'brightness(0.52) saturate(0.35) contrast(0.7) blur(7px)';
    case 'developing_mid':
      return 'brightness(0.82) saturate(0.72) contrast(0.9) blur(2px)';
    case 'developed':
      return 'brightness(1) saturate(1) contrast(1) blur(0px)';
  }
}

export function isTemporaryPreviewUrl(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith('blob:');
}

export function revokeTemporaryPreviewUrls(
  values: Array<string | null | undefined>,
  revoke: (url: string) => void = url => URL.revokeObjectURL(url),
): string[] {
  const uniqueUrls = Array.from(new Set(values.filter(isTemporaryPreviewUrl) as string[]));
  uniqueUrls.forEach(revoke);
  return uniqueUrls;
}
