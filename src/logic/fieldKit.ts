/**
 * Field Kit readiness.
 *
 * "Ready" means the kit can actually do its job: camera AND location
 * both granted. Before Nov 20, 2026, completeFieldKitOnboarding() wrote
 * fieldKitReady: true unconditionally, so "Continue without
 * permissions" recorded a ready kit that was not ready (P0-6
 * follow-up, Zach's call).
 *
 * hasCompletedFieldKitOnboarding is deliberately separate: the flow
 * itself finished — the player went through onboarding and chose —
 * even when the kit is not ready.
 */
export function resolveFieldKitReady(
  cameraPermissionGranted: boolean,
  locationPermissionGranted: boolean
): boolean {
  return cameraPermissionGranted && locationPermissionGranted;
}
