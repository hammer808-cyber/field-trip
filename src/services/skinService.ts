import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, getDocs, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, logFirestoreError } from '../lib/firebase';
import { logAdminAction } from './moderationService';
import { Skin, SkinSettings, UserThemePreference } from '../types/skin';
import { DEFAULT_SKIN_ID, getBuiltInSkin, normalizeAppSkin } from '../skins/registry';

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
    logFirestoreError(error, OperationType.GET, `${COLLECTION}/${DOC_ID}`);
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
    logFirestoreError(error, OperationType.GET, `skins/${skinId}`);
  });
}

/**
 * FETCH/REALTIME: Get all skins (for Admin/Settings).
 */
export function subscribeToSkins(callback: (skins: Skin[]) => void, _isAdminMode = false) {
  return onSnapshot(collection(db, 'skins'), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Skin)));
  }, (error) => {
    logFirestoreError(error, OperationType.LIST, 'skins');
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

    // Audit Log
    if (auth.currentUser) {
        await logAdminAction(
            auth.currentUser.uid,
            uid,
            'user',
            isAdmin ? 'grant_admin' : 'revoke_admin',
            { targetUserId: uid }
        );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `admins/${uid}`);
  }
}

export function subscribeToAdmins(callback: (adminIds: string[]) => void) {
  return onSnapshot(collection(db, 'admins'), (snap) => {
    callback(snap.docs.map(d => d.id));
  }, (error) => {
    logFirestoreError(error, OperationType.LIST, 'admins');
  });
}

export function subscribeToUserThemePreference(uid: string, callback: (prefs: UserThemePreference) => void) {
  return onSnapshot(doc(db, 'userPrefs', uid), (snap) => {
    if (snap.exists()) {
      const data = snap.data() as UserThemePreference;
      callback({
        ...data,
        frankieMode: data.frankieMode ?? data.reduceCommentary ?? false
      });
    } else {
      // Provide defaults if missing
      callback({
        selectedSkinId: DEFAULT_SKIN_ID,
        frankieMode: false
      });
    }
  }, (error) => {
    // Graceful log for theme prefs
    console.warn("[skinService] User theme preference read skipped:", error.message);
  });
}

export async function saveSkin(skin: Partial<Skin>) {
  try {
    const isNew = !skin.id;
    const skinRef = skin.id ? doc(db, 'skins', skin.id) : doc(collection(db, 'skins'));
    const skinId = skinRef.id;
    
    const normalized = normalizeAppSkin({
      ...skin,
      id: skinId,
      name: skin.name || 'Untitled Skin',
      description: skin.description || 'Custom Fieldtrip skin.',
    });

    await setDoc(skinRef, {
      ...normalized,
      id: skinId,
      updatedAt: serverTimestamp(),
      ...(isNew ? { createdAt: serverTimestamp() } : {}),
      updatedBy: auth.currentUser?.uid || 'system'
    }, { merge: true });

    if (auth.currentUser) {
      await logAdminAction(auth.currentUser.uid, skinId, 'skin', isNew ? 'create' : 'update', { name: skin.name });
    }
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
    const batch = snap.docs.map(d => updateDoc(d.ref, { isDefault: false, 'metadata.isDefault': false }));
    await Promise.all(batch);
    
    // 3. Upsert the target. Local built-ins may not have a Firestore manifest yet.
    const builtIn = getBuiltInSkin(skinId);
    const targetRef = doc(db, 'skins', skinId);
    if (builtIn) {
      await setDoc(targetRef, {
        ...builtIn,
        id: skinId,
        isDefault: true,
        metadata: { ...builtIn.metadata, isDefault: true },
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      await updateDoc(targetRef, {
        isDefault: true,
        'metadata.isDefault': true,
        updatedAt: serverTimestamp(),
      });
    }
    
    // 4. Update settings
    await updateSkinSettings({ defaultSkinId: skinId });

    if (auth.currentUser) {
      await logAdminAction(auth.currentUser.uid, skinId, 'skin', 'set_default');
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `skins/${skinId}`);
  }
}

export async function updateSkinStatus(skinId: string, status: Skin['status']) {
  try {
    const builtIn = getBuiltInSkin(skinId);
    const targetRef = doc(db, 'skins', skinId);
    if (builtIn) {
      await setDoc(targetRef, {
        ...builtIn,
        id: skinId,
        status,
        isActive: status === 'active',
        metadata: { ...builtIn.metadata, status },
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      await updateDoc(targetRef, {
        status,
        isActive: status === 'active',
        'metadata.status': status,
        updatedAt: serverTimestamp(),
      });
    }

    if (auth.currentUser) {
      await logAdminAction(auth.currentUser.uid, skinId, 'skin', 'update_status', { status });
    }
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

    if (auth.currentUser) {
      await logAdminAction(auth.currentUser.uid, 'game', 'config', 'update_skin_settings', { settings });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${DOC_ID}`);
  }
}
