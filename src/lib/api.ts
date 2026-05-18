import { auth, getAppCheckToken } from "./firebase";

export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  // 1. Add Firebase Auth Token if user is signed in
  const user = auth.currentUser;
  if (user) {
    const idToken = await user.getIdToken();
    headers.set('Authorization', `Bearer ${idToken}`);
  }

  // 2. Add App Check token if available
  const appCheckToken = await getAppCheckToken();
  if (appCheckToken) {
    headers.set('X-Firebase-AppCheck', appCheckToken);
  }
  
  return fetch(url, {
    ...options,
    headers
  });
}
