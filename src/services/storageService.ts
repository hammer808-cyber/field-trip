import { 
  ref, 
  uploadString, 
  getDownloadURL 
} from 'firebase/storage';
import { storage } from '../lib/firebase';

/**
 * Uploads a base64 image string to Firebase Storage.
 * @param userId - Owner of the image
 * @param type - Folder name (e.g., 'proofs', 'avatars')
 * @param filename - Name of the file
 * @param base64String - Data URL or base64 string
 */
export async function uploadBase64Image(userId: string, type: string, filename: string, base64String: string): Promise<string> {
  // Extract pure base64 if it's a data URL
  const base64Data = base64String.includes(',') ? base64String.split(',')[1] : base64String;
  
  const storageRef = ref(storage, `${type}/${userId}/${filename}`);
  
  // Uploading as base64 string
  const snapshot = await uploadString(storageRef, base64Data, 'base64', {
    contentType: 'image/jpeg',
    customMetadata: {
        'userId': userId
    }
  });

  return await getDownloadURL(snapshot.ref);
}
