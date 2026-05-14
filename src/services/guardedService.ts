/**
 * GUARDED SERVICE LAYER
 * Prevents runaway reads, writes, and AI analysis calls.
 * Implements cooldowns, in-flight locks, and retry prevention.
 */

interface GuardConfig {
  cooldownMs?: number;
  lockKey?: string;
  maxRetries?: number;
}

const lastCallMap = new Map<string, number>();
const inFlightRequests = new Set<string>();

export async function guardedCall<T>(
  key: string,
  fn: () => Promise<T>,
  config: GuardConfig = {}
): Promise<T> {
  const { cooldownMs = 1000, lockKey = key } = config;

  // 1. In-flight Lock
  if (inFlightRequests.has(lockKey)) {
    console.warn(`[GUARD] Call blocked: Request already in-flight for key "${lockKey}"`);
    throw new Error('SYSTEM_BUSY: A similar request is already processing. Please wait.');
  }

  // 2. Cooldown Check
  const now = Date.now();
  const lastCall = lastCallMap.get(key) || 0;
  if (now - lastCall < cooldownMs) {
    const remaining = Math.ceil((cooldownMs - (now - lastCall)) / 1000);
    console.warn(`[GUARD] Call blocked: Cooldown active for key "${key}". Remaining: ${remaining}s`);
    throw new Error(`COOLDOWN: Please wait ${remaining}s before attempting this action again.`);
  }

  // 3. Execute
  inFlightRequests.add(lockKey);
  lastCallMap.set(key, now);

  try {
    const result = await fn();
    return result;
  } catch (error: any) {
    // Clear cooldown on specific transient errors if needed, but usually keep it to prevent spamming failed requests
    console.error(`[GUARD] Execution failed for key "${key}":`, error.message);
    throw error;
  } finally {
    inFlightRequests.delete(lockKey);
  }
}
