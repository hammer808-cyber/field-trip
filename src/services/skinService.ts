import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, getDocs, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Skin, SkinSettings, UserThemePreference } from '../types/skin';

const COLLECTION = 'appConfig';
const DOC_ID = 'skinSettings';

/**
 * FETCH: Gets global skin settings.
 */
export async function getSkinSettings(): Promise<SkinSettings | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTION, DOC_ID));
    if (snap.exists()) {
      return snap.data() as SkinSettings;
    }
    return null;
  } catch (error) {
    return handleFirestoreError(error, OperationType.GET, `${COLLECTION}/${DOC_ID}`);
  }
}

/**
 * REALTIME: Subscribe to skin changes.
 */
export function subscribeToSkinSettings(callback: (settings: SkinSettings) => void) {
  return onSnapshot(doc(db, COLLECTION, DOC_ID), (snap) => {
    if (snap.exists()) {
      callback(snap.data() as SkinSettings);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION}/${DOC_ID}`);
  });
}

/**
 * REALTIME: Only listen to the ACTIVE skin.
 */
export function subscribeToSkin(skinId: string, callback: (skin: Skin) => void) {
  return onSnapshot(doc(db, 'skins', skinId), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() } as Skin);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `skins/${skinId}`);
  });
}

/**
 * FETCH/REALTIME: Get all skins (for Admin/Settings).
 */
export function subscribeToSkins(callback: (skins: Skin[]) => void, isAdminMode = false) {
  let q = query(collection(db, 'skins'));
  if (!isAdminMode) {
    q = query(q, where('status', '==', 'active'));
  }

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Skin)));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'skins');
  });
}

export async function isUserAdmin(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch (error) {
    return false;
  }
}

export async function setAdminStatus(uid: string, isAdmin: boolean) {
  try {
    const adminRef = doc(db, 'admins', uid);
    if (isAdmin) {
      await setDoc(adminRef, {
        uid,
        addedAt: serverTimestamp(),
        addedBy: auth.currentUser?.uid || 'system'
      });
    } else {
      await deleteDoc(adminRef);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `admins/${uid}`);
  }
}

export function subscribeToAdmins(callback: (adminIds: string[]) => void) {
  return onSnapshot(collection(db, 'admins'), (snap) => {
    callback(snap.docs.map(d => d.id));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'admins');
  });
}

export function subscribeToUserThemePreference(uid: string, callback: (prefs: UserThemePreference) => void) {
  return onSnapshot(doc(db, 'userPrefs', uid), (snap) => {
    if (snap.exists()) {
      callback(snap.data() as UserThemePreference);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `userPrefs/${uid}`);
  });
}

export async function saveSkin(skin: Partial<Skin>) {
  try {
    const isNew = !skin.id;
    const skinRef = skin.id ? doc(db, 'skins', skin.id) : doc(collection(db, 'skins'));
    const skinId = skinRef.id;
    
    await setDoc(skinRef, {
      ...skin,
      id: skinId,
      updatedAt: serverTimestamp(),
      ...(isNew ? { createdAt: serverTimestamp() } : {}),
      updatedBy: auth.currentUser?.uid || 'system'
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `skins/${skin.id || 'new'}`);
  }
}

export async function setDefaultSkin(skinId: string) {
  try {
    // 1. Get all current default skins
    const q = query(collection(db, 'skins'), where('isDefault', '==', true));
    const snap = await getDocs(q);
    
    // 2. Unset them
    const batch = snap.docs.map(d => updateDoc(d.ref, { isDefault: false }));
    await Promise.all(batch);
    
    // 3. Set the new default
    await updateDoc(doc(db, 'skins', skinId), { isDefault: true });
    
    // 4. Update settings
    await updateSkinSettings({ defaultSkinId: skinId });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `skins/${skinId}`);
  }
}

export async function updateSkinStatus(skinId: string, status: Skin['status']) {
  try {
    await updateDoc(doc(db, 'skins', skinId), {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `skins/${skinId}`);
  }
}

export async function updateThemePreference(uid: string, prefs: Partial<UserThemePreference>) {
  try {
    await setDoc(doc(db, 'userPrefs', uid), prefs, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `userPrefs/${uid}`);
  }
}

export async function updateSkinSettings(settings: Partial<SkinSettings>) {
  try {
    await setDoc(doc(db, COLLECTION, DOC_ID), settings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${DOC_ID}`);
  }
}
