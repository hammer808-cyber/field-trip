/**
 * TIME SERVICE
 * Synchronizes local clock with server time to prevent device clock manipulation.
 */

let timeOffset = 0;
let isSynced = false;

export async function syncServerTime() {
  try {
    const start = Date.now();
    const response = await fetch('/api/time');
    const data = await response.json();
    const end = Date.now();
    
    // Latency approx: (end - start) / 2
    const latency = (end - start) / 2;
    const serverTime = data.serverTime;
    
    // ServerTime - (LocalTime - Latency)
    timeOffset = serverTime - (end - latency);
    isSynced = true;
    console.log(`[TIME_SYNC] Offset: ${timeOffset}ms, Latency: ${latency}ms`);
  } catch (error) {
    console.error('[TIME_SYNC] Failed to sync with server time:', error);
  }
}

/**
 * Returns the trusted server time as a number
 */
export function getServerTime(): number {
  return Date.now() + timeOffset;
}

/**
 * Returns the trusted server time as a Date object
 */
export function getServerDate(): Date {
  return new Date(getServerTime());
}

export function isTimeSynced(): boolean {
  return isSynced;
}
