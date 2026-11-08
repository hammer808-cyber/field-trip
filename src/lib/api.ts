import { auth, getAppCheckToken } from "./firebase";

/**
 * An abort signal that fires after `ms`. Uses AbortSignal.timeout when the
 * browser has it, otherwise an AbortController + setTimeout. Every network
 * call in the photo path goes through this: a stalled request on a phone
 * must fail fast with a retry instead of spinning forever (Nov 8, 2026:
 * Capture uploads hung with no timeout anywhere, and once hung the submit
 * button went dead because isUploading never reset).
 */
export function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

export type AuthenticatedFetchOptions = RequestInit & {
  /** Override the default 20s request timeout (ms). */
  timeoutMs?: number;
};

export async function authenticatedFetch(url: string, options: AuthenticatedFetchOptions = {}): Promise<Response> {
  const { timeoutMs = 20000, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers || {});
  
  if (!headers.has('Content-Type') && requestOptions.body && typeof requestOptions.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  // 1. Add Firebase Auth Token if user is signed in
  const user = auth.currentUser;
  if (user) {
    const idToken = await user.getIdToken();
    headers.set('Authorization', `Bearer ${idToken}`);
  }

  // 2. Add App Check token if available. It is optional: if the token
  // fetch stalls (slow reCAPTCHA load on a phone), give up after 5s and
  // send the request without it rather than hanging the whole call.
  const appCheckToken = await Promise.race([
    getAppCheckToken(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
  ]);
  if (appCheckToken) {
    headers.set('X-Firebase-AppCheck', appCheckToken);
  }

  // The request itself times out (default 20s). If the caller passed its
  // own signal, combine the two when the browser supports it.
  const timeout = timeoutSignal(timeoutMs);
  const callerSignal = requestOptions.signal as AbortSignal | undefined;
  const signal =
    callerSignal && typeof AbortSignal.any === 'function'
      ? AbortSignal.any([callerSignal, timeout])
      : timeout;

  return fetch(url, {
    ...requestOptions,
    headers,
    signal,
  });
}
