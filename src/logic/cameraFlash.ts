export type CameraFacingMode = 'user' | 'environment';
export type CameraSourceMode = 'camera' | 'simulated';
export type CameraFlashStrategy = 'none' | 'torch' | 'screen';

interface TorchCapableTrack {
  getCapabilities?: () => MediaTrackCapabilities & { torch?: boolean };
  applyConstraints: (constraints: MediaTrackConstraints) => Promise<void>;
}

export function cameraTrackSupportsTorch(track: Pick<TorchCapableTrack, 'getCapabilities'> | undefined): boolean {
  if (!track?.getCapabilities) return false;
  try {
    return track.getCapabilities().torch === true;
  } catch {
    return false;
  }
}

export function getCameraFlashStrategy(params: {
  enabled: boolean;
  torchSupported: boolean;
  facingMode: CameraFacingMode;
  sourceMode: CameraSourceMode;
}): CameraFlashStrategy {
  if (!params.enabled || params.sourceMode !== 'camera') return 'none';
  if (params.torchSupported) return 'torch';
  return params.facingMode === 'user' ? 'screen' : 'none';
}

export function isCameraFlashAvailable(params: {
  torchSupported: boolean;
  facingMode: CameraFacingMode;
  sourceMode: CameraSourceMode;
}): boolean {
  return params.sourceMode === 'camera' && (params.torchSupported || params.facingMode === 'user');
}

export async function setCameraTorch(track: TorchCapableTrack | undefined, enabled: boolean): Promise<boolean> {
  if (!track || !cameraTrackSupportsTorch(track)) return false;
  try {
    await track.applyConstraints({ advanced: [{ torch: enabled } as MediaTrackConstraintSet] });
    return true;
  } catch {
    return false;
  }
}
