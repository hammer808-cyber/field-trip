import { auth } from '../lib/firebase';
import { guardedCall } from './guardedService';
import { getGlobalConfig } from './configService';

/**
 * Compresses and resizes a base64 image using a canvas.
 */
export async function compressImage(base64Str: string, maxWidth = 1000, quality = 0.7): Promise<string> {
  if (typeof window === 'undefined' || typeof Image === 'undefined' || typeof document === 'undefined') {
    return base64Str;
  }
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn("[compressImage] timeout reached, returning raw");
      resolve(base64Str);
    }, 5000);

    try {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (err) {
          console.warn("[compressImage] canvas compression error, returning raw", err);
          resolve(base64Str);
        }
      };
      img.onerror = (err) => {
        clearTimeout(timeout);
        console.warn("[compressImage] image load error, returning raw", err);
        resolve(base64Str);
      };
    } catch (e) {
      clearTimeout(timeout);
      console.warn("[compressImage] fallback to raw base64 due to exception:", e);
      resolve(base64Str);
    }
  });
}

/**
 * Uploads a base64 image string to Firebase Storage with hard guardrails.
 */
export async function uploadBase64Image(userId: string, type: string, filename: string, base64String: string): Promise<{ url: string; path: string }> {
  const config = getGlobalConfig();
  
  if (!config.uploadsEnabled) {
    throw new Error('UPLOADS_DISABLED: The Bureau has temporarily restricted evidence uploads.');
  }

  return guardedCall(`upload_${userId}_${type.replace(/\//g, '_')}`, async () => {
    // 1. Compression and Resize
    const compressedBase64 = await compressImage(base64String);
    
    // 2. Extract pure base64
    const base64Data = compressedBase64.includes(',') ? compressedBase64.split(',')[1] : compressedBase64;
    
    // 3. Size check (max 5MB after compression)
    const byteSize = atob(base64Data).length;
    if (byteSize > 5 * 1024 * 1024) {
      throw new Error('FILE_TOO_LARGE: Evidence exceeds the 5MB transmission limit.');
    }

    const path = `${type}/${userId}/${filename}`;
    
    try {
      // Switch to server-side proxy to bypass client-side storage rules issues
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('AUTH_REQUIRED: You must be signed in to upload evidence.');

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          userId,
          type,
          filename,
          base64Data,
          metadata: {
            'userId': userId,
            'originalSize': base64Data.length.toString(),
            'compressedSize': byteSize.toString()
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || response.statusText);
      }

      const data = await response.json();
      return { url: data.url, path: data.path };
    } catch (err: any) {
      console.error(`[storageService] FATAL: Cloud storage upload failed (path: ${path}). Persistence requirement violated.`, err.message || err);
      // Re-throw so the calling service (gameService/submissionService) can handle it or show error to user
      throw err;
    }
  }, { cooldownMs: 1000 }); // 1s cooldown per user upload category
}
