import { 
  ref, 
  uploadString, 
  getDownloadURL 
} from 'firebase/storage';
import { storage } from '../lib/firebase';
import { guardedCall } from './guardedService';
import { getGlobalConfig } from './configService';

/**
 * Compresses and resizes a base64 image using a canvas.
 */
async function compressImage(base64Str: string, maxWidth = 1000, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
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
    };
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
    const storageRef = ref(storage, path);
    
    const snapshot = await uploadString(storageRef, base64Data, 'base64', {
      contentType: 'image/jpeg',
      customMetadata: {
          'userId': userId,
          'originalSize': base64String.length.toString(),
          'compressedSize': byteSize.toString()
      }
    });

    const url = await getDownloadURL(snapshot.ref);
    return { url, path };
  }, { cooldownMs: 1000 }); // 1s cooldown per user upload category
}
