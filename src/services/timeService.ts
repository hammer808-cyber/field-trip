/**
 * TIME SERVICE
 * Synchronizes local clock with server time to prevent device clock manipulation.
 */

let timeOffset = 0;
let isSynced = false;

export async function syncServerTime(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const start = Date.now();
      const response = await fetch('/api/time');
      if (!response.ok) throw new Error(`Server responded with ${response.status}`);
      const data = await response.json();
      const end = Date.now();
      
      // Latency approx: (end - start) / 2
      const latency = (end - start) / 2;
      const serverTime = data.serverTime;
      
      // ServerTime - (LocalTime - Latency)
      timeOffset = serverTime - (end - latency);
      isSynced = true;
      console.log(`[TIME_SYNC] Offset: ${timeOffset}ms, Latency: ${latency}ms`);
      return; // Success
    } catch (error) {
      console.warn(`[TIME_SYNC] Attempt ${i + 1} failed:`, error);
      if (i === retries - 1) {
        console.error('[TIME_SYNC] All attempts failed to sync with server time:', error);
      } else {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
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
