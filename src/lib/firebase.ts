import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
  writeBatch,
  getDoc,
  updateDoc,
  deleteField
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { KaizoLevel, ProofSubmission, PlayerProfile, ChangelogItem, ListHelper, ChangeDetail, User } from '../types/kaizo';

// Subscribe to Authorized Users (Helpers/Admins)
export function subscribeToUsers(onUpdate: (users: User[]) => void) {
  const usersCollection = collection(db, 'users');
  return onSnapshot(
    usersCollection,
    (snapshot) => {
      const users: User[] = [];
      snapshot.forEach((docSnap) => {
        users.push(docSnap.data() as User);
      });
      onUpdate(users);
    },
    (error) => {
      console.warn('Users subscription notice:', error);
    }
  );
}

// Grant or update helper access
export async function updateAuthorizedUser(email: string, name: string, role: 'helper' | 'admin' = 'helper') {
  const userId = email.toLowerCase().replace(/[@.]/g, '_');
  const userRef = doc(db, 'users', userId);
  const userData: User = {
    id: userId,
    email: email.toLowerCase().trim(),
    name: name.trim(),
    role,
    addedAt: new Date().toISOString()
  };
  
  try {
    await setDoc(userRef, sanitizeFirestoreData(userData), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    throw error;
  }
}

// Revoke access
export async function removeAuthorizedUser(email: string) {
  const userId = email.toLowerCase().replace(/[@.]/g, '_');
  const userRef = doc(db, 'users', userId);
  try {
    await deleteDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    throw error;
  }
}

// Add changelog item with rich metadata & change tracking
export async function addChangelogItem(
  action: string,
  description: string,
  author?: string,
  changesOrMeta?: ChangeDetail[] | { levelId?: string; levelName?: string },
  meta?: { levelId?: string; levelName?: string } | ChangeDetail[]
) {
  const changelogRef = doc(collection(db, 'changelog'), `log-${Date.now()}`);
  try {
    let changesList: ChangeDetail[] | undefined = undefined;
    let levelNameVal: string | undefined = undefined;

    if (Array.isArray(changesOrMeta)) {
      changesList = changesOrMeta;
    } else if (changesOrMeta && typeof changesOrMeta === 'object') {
      levelNameVal = changesOrMeta.levelName;
    }

    if (Array.isArray(meta)) {
      changesList = meta;
    } else if (meta && typeof meta === 'object') {
      if (meta.levelName) levelNameVal = meta.levelName;
    }

    const payload = sanitizeFirestoreData({
      id: changelogRef.id,
      timestamp: new Date().toISOString(),
      action,
      description,
      author: author || 'List Helper',
      levelName: levelNameVal || null,
      changes: changesList || null
    });
    await setDoc(changelogRef, payload);
  } catch (error) {
    console.warn('Failed to log changelog item:', error);
  }
}

// Subscribe to Changelog
export function subscribeToChangelog(onUpdate: (changelog: ChangelogItem[]) => void) {
  const colRef = collection(db, 'changelog');
  // Order by timestamp descending
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: ChangelogItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as ChangelogItem);
      });
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(items);
    },
    (error) => {
      console.warn('Changelog subscription notice:', error);
    }
  );
}

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore specifying the dedicated database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged };

export async function isUserAuthorized(email: string | null): Promise<boolean> {
  if (!email) return false;
  if (email === 'tomatosauceman500@gmail.com') return true;
  
  try {
    const docRef = doc(db, 'users', email.toLowerCase().replace(/[@.]/g, '_'));
    const docSnap = await getDoc(docRef);
    return docSnap.exists() && docSnap.data().role === 'helper';
  } catch (err) {
    console.warn('Error checking authorization:', err);
    return false;
  }
}

export async function getPlayerNameByEmail(email: string | null): Promise<string> {
  if (!email) return 'List Helper';
  if (email === 'tomatosauceman500@gmail.com') return 'Admin';
  
  try {
    const docRef = doc(db, 'users', email.toLowerCase().replace(/[@.]/g, '_'));
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().name || 'List Helper';
    }
  } catch (err) {
    console.warn('Error fetching player name:', err);
  }
  return 'List Helper';
}


export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.warn('Firestore Notice:', JSON.stringify(errInfo));
  return errInfo;
}

// Test Connection on load
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or waiting for connection.');
    }
  }
}
testConnection();

import initialLevelsData from '../data/kaizoLevels.json';

const baselineLevelsMap = new Map<string, KaizoLevel>(
  (initialLevelsData as KaizoLevel[]).map((lvl) => [lvl.id, lvl])
);

export interface LevelsBundleData {
  id: string;
  description: string;
  count: number;
  updatedAt: string;
  levels: KaizoLevel[];
}

// In-memory cache for level thumbnail images to prevent redundant Firestore reads
const thumbnailMemoryCache = new Map<string, string | null>();
// Level ID to chunk ID mapping (populated from bundle)
const levelToChunkMap = new Map<string, string>();
// In-memory cache for level metadata
const cachedLevelsMap = new Map<string, KaizoLevel>();
// In-flight chunk loading promises to coalesce parallel requests into 1 read
const chunkFetchPromises = new Map<string, Promise<void>>();
// Track chunk IDs that have ALREADY been fetched from Firestore in this session
const loadedImageChunksSet = new Set<string>();

// In-memory cache for levels bundle data
let cachedLevelsBundle: LevelsBundleData | null = null;
let levelsBundlePromise: Promise<LevelsBundleData | null> | null = null;

/**
 * Determine the chunk ID for a level (e.g. 'chunk-1' for ranks 1-10, max 10 per chunk).
 */
export function getChunkIdForLevel(levelId: string, rank?: number, chunkId?: string): string {
  if (chunkId && typeof chunkId === 'string' && chunkId.trim().length > 0) {
    return chunkId.trim();
  }
  const cached = cachedLevelsMap.get(levelId);
  if (cached?.imageChunkId && cached.imageChunkId.trim().length > 0) {
    return cached.imageChunkId.trim();
  }
  if (levelToChunkMap.has(levelId)) {
    return levelToChunkMap.get(levelId)!;
  }
  const effectiveRank = rank ?? cached?.rank;
  if (effectiveRank && effectiveRank > 0) {
    return `chunk-${Math.floor(Math.max(0, effectiveRank - 1) / 10) + 1}`;
  }
  return 'chunk-1';
}

export async function getChunkIdForLevelAsync(levelId: string, rank?: number, chunkId?: string): Promise<string> {
  if (chunkId && typeof chunkId === 'string' && chunkId.trim().length > 0) {
    return chunkId.trim();
  }
  const syncChunk = getChunkIdForLevel(levelId, rank, chunkId);
  if (syncChunk !== 'chunk-1' || (rank && rank <= 10)) {
    return syncChunk;
  }
  const bundle = await fetchLevelsBundle();
  if (bundle && Array.isArray(bundle.levels)) {
    const found = bundle.levels.find(l => l.id === levelId);
    if (found?.imageChunkId && found.imageChunkId.trim().length > 0) {
      return found.imageChunkId.trim();
    }
    if (found?.rank && found.rank > 0) {
      return `chunk-${Math.floor((found.rank - 1) / 10) + 1}`;
    }
  }
  return syncChunk;
}

/**
 * Fetches an entire chunk of up to 10 preview images in 1 single Firestore read.
 * All 10 images are populated directly into `thumbnailMemoryCache`.
 * Already-fetched chunks return immediately from memory with 0 Firestore reads.
 */
export async function fetchImageChunk(chunkId: string): Promise<void> {
  if (loadedImageChunksSet.has(chunkId)) {
    return;
  }
  if (chunkFetchPromises.has(chunkId)) {
    await chunkFetchPromises.get(chunkId);
    return;
  }
  const promise = (async () => {
    try {
      const chunkDocRef = doc(db, 'image_chunks', chunkId);
      const snap = await getDoc(chunkDocRef);
      loadedImageChunksSet.add(chunkId);
      if (snap.exists()) {
        const data = snap.data();
        const images: Record<string, string> = data?.images || {};
        for (const [lvlId, imgUrl] of Object.entries(images)) {
          if (typeof imgUrl === 'string') {
            thumbnailMemoryCache.set(lvlId, imgUrl);
          }
        }
      }
    } catch (err) {
      console.warn(`Notice loading image chunk ${chunkId}:`, err);
    } finally {
      chunkFetchPromises.delete(chunkId);
    }
  })();

  chunkFetchPromises.set(chunkId, promise);
  await promise;
}

/**
 * Fetch a single level thumbnail image on demand from image_chunks/{chunkId}.
 * Batches 10 level images together per chunk document so 1 read serves 10 levels.
 * Results are cached in memory so subsequent views cost 0 Firestore reads.
 */
export async function fetchLevelThumbnail(
  levelId: string,
  rank?: number,
  chunkId?: string
): Promise<string | null> {
  if (!levelId) return null;

  // 1. Return from in-memory cache if checked previously (handles both valid URL and null)
  if (thumbnailMemoryCache.has(levelId)) {
    return thumbnailMemoryCache.get(levelId) || null;
  }

  // 2. Determine 1-indexed primary chunk ID
  const targetChunkId = await getChunkIdForLevelAsync(levelId, rank, chunkId);
  await fetchImageChunk(targetChunkId);

  if (thumbnailMemoryCache.has(levelId)) {
    return thumbnailMemoryCache.get(levelId) || null;
  }

  // 3. Fallback: Try 0-indexed chunk ID ONLY if fallback chunk hasn't been fetched yet
  if (rank && rank > 0) {
    const fallback0 = `chunk-${Math.floor(Math.max(0, rank - 1) / 10)}`;
    if (fallback0 !== targetChunkId && !loadedImageChunksSet.has(fallback0)) {
      await fetchImageChunk(fallback0);
      if (thumbnailMemoryCache.has(levelId)) {
        return thumbnailMemoryCache.get(levelId) || null;
      }
    }
  }

  // 4. Fallback: Check custom chunk formatting ONLY if alternative chunk hasn't been fetched yet
  if (targetChunkId.startsWith('chunk-')) {
    const rawNum = targetChunkId.replace('chunk-', '');
    if (rawNum && !isNaN(Number(rawNum))) {
      const altChunk = `chunk${rawNum}`;
      if (!loadedImageChunksSet.has(altChunk)) {
        await fetchImageChunk(altChunk);
        if (thumbnailMemoryCache.has(levelId)) {
          return thumbnailMemoryCache.get(levelId) || null;
        }
      }
    }
  }

  // Mark as null in memory so we never query Firestore for this level again in this session
  thumbnailMemoryCache.set(levelId, null);
  return null;
}

const thumbnailSubscribers = new Map<string, Set<(url: string | null) => void>>();

export function subscribeToLevelThumbnail(levelId: string, callback: (url: string | null) => void): () => void {
  if (!thumbnailSubscribers.has(levelId)) {
    thumbnailSubscribers.set(levelId, new Set());
  }
  thumbnailSubscribers.get(levelId)!.add(callback);

  if (thumbnailMemoryCache.has(levelId)) {
    callback(thumbnailMemoryCache.get(levelId) || null);
  }

  return () => {
    const subs = thumbnailSubscribers.get(levelId);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) {
        thumbnailSubscribers.delete(levelId);
      }
    }
  };
}

export function notifyThumbnailUpdated(levelId: string, url: string | null) {
  thumbnailMemoryCache.set(levelId, url || null);
  const subs = thumbnailSubscribers.get(levelId);
  if (subs) {
    for (const cb of subs) {
      cb(url || null);
    }
  }
}

/**
 * Update level thumbnail preview image (URL or Base64 data string).
 * Writes into the chunk file (image_chunks/{chunkId}) storing up to 10 images per chunk.
 */
export async function updateLevelThumbnail(
  levelId: string,
  thumbnailUrl: string | null,
  rank?: number,
  chunkId?: string
): Promise<void> {
  const targetChunkId = await getChunkIdForLevelAsync(levelId, rank, chunkId);
  notifyThumbnailUpdated(levelId, thumbnailUrl);

  if (cachedLevelsMap.has(levelId)) {
    const cached = cachedLevelsMap.get(levelId)!;
    cached.thumbnailUrl = thumbnailUrl;
    cached.imageChunkId = targetChunkId;
  }
  levelToChunkMap.set(levelId, targetChunkId);
  loadedImageChunksSet.add(targetChunkId);

  const chunkRef = doc(db, 'image_chunks', targetChunkId);
  try {
    if (!thumbnailUrl) {
      await updateDoc(chunkRef, {
        [`images.${levelId}`]: deleteField(),
        updatedAt: new Date().toISOString()
      }).catch(() => {});
    } else {
      try {
        await updateDoc(chunkRef, {
          [`images.${levelId}`]: thumbnailUrl,
          updatedAt: new Date().toISOString()
        });
      } catch (updateErr) {
        await setDoc(chunkRef, {
          id: targetChunkId,
          updatedAt: new Date().toISOString(),
          images: {
            [levelId]: thumbnailUrl
          }
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `image_chunks/${targetChunkId}`);
    throw error;
  }
}

function registerLevelsInCache(levels: KaizoLevel[]) {
  if (!Array.isArray(levels)) return;
  levelToChunkMap.clear();
  cachedLevelsMap.clear();
  for (const lvl of levels) {
    cachedLevelsMap.set(lvl.id, lvl);
    if (lvl.imageChunkId && lvl.imageChunkId.trim().length > 0) {
      levelToChunkMap.set(lvl.id, lvl.imageChunkId.trim());
    } else if (lvl.rank && lvl.rank > 0) {
      levelToChunkMap.set(lvl.id, `chunk-${Math.floor((lvl.rank - 1) / 10) + 1}`);
    }
  }
}

// Fetch the consolidated level bundle (1 single read for all levels without images)
export async function fetchLevelsBundle(): Promise<LevelsBundleData | null> {
  if (cachedLevelsBundle) {
    return cachedLevelsBundle;
  }
  if (levelsBundlePromise) {
    return levelsBundlePromise;
  }

  const bundleRef = doc(db, 'bundles', 'levels');
  levelsBundlePromise = (async () => {
    try {
      const snap = await getDoc(bundleRef);
      if (snap.exists()) {
        const data = snap.data() as LevelsBundleData;
        cachedLevelsBundle = data;
        if (data && Array.isArray(data.levels)) {
          registerLevelsInCache(data.levels);
        }
        return data;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'bundles/levels');
      return null;
    } finally {
      levelsBundlePromise = null;
    }
  })();

  return levelsBundlePromise;
}

// Subscribe to real-time updates for the consolidated level bundle
export function subscribeToLevelsBundle(
  onUpdate: (data: LevelsBundleData) => void,
  onError?: (err: Error) => void
) {
  const bundleRef = doc(db, 'bundles', 'levels');
  return onSnapshot(
    bundleRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as LevelsBundleData;
        cachedLevelsBundle = data;
        if (data && Array.isArray(data.levels)) {
          registerLevelsInCache(data.levels);
        }
        onUpdate(data);
      }
    },
    (error) => {
      console.warn('Bundle subscription notice:', error);
      handleFirestoreError(error, OperationType.GET, 'bundles/levels');
      if (onError) onError(error);
    }
  );
}

// Update the consolidated levels bundle in Firestore (strips images)
export async function updateLevelsBundleInFirestore(levels: KaizoLevel[]): Promise<void> {
  const bundleRef = doc(db, 'bundles', 'levels');
  const sorted = [...levels].sort((a, b) => a.rank - b.rank);
  const levelsWithoutImages = sorted.map((lvl) => {
    const { thumbnailUrl: _omitted, ...rest } = lvl;
    return rest as KaizoLevel;
  });

  const payload: LevelsBundleData = {
    id: 'levels',
    description: 'Goober Dash Kaizo List - Consolidated Level Data (without images)',
    updatedAt: new Date().toISOString(),
    count: levelsWithoutImages.length,
    levels: levelsWithoutImages
  };

  try {
    await setDoc(bundleRef, sanitizeFirestoreData(payload), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'bundles/levels');
    throw error;
  }
}

// Subscribe to Levels real-time: reads from the consolidated big file (bundles/levels) with 1 document read!
export function subscribeToLevels(
  onUpdate: (levels: KaizoLevel[]) => void,
  onError?: (err: Error) => void
) {
  return subscribeToLevelsBundle((bundleData) => {
    if (bundleData && Array.isArray(bundleData.levels)) {
      registerLevelsInCache(bundleData.levels);
      const sorted = [...bundleData.levels].sort((a, b) => a.rank - b.rank);
      onUpdate(sorted);
    }
  }, onError);
}

// Sync/seed levels: bundles/levels is the single authoritative source of truth
export async function syncLevelsToFirestore(_initialLevels: KaizoLevel[]): Promise<number> {
  return 0;
}

export async function seedLevelsIfEmpty(_initialLevels: KaizoLevel[]): Promise<boolean> {
  return false;
}

/**
 * Recursively sanitizes objects before writing to Firestore.
 * Converts explicit `undefined` properties to `null` so setDoc never throws
 * "Unsupported field value: undefined".
 */
export function sanitizeFirestoreData<T>(obj: T): T {
  if (obj === undefined || obj === null) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeFirestoreData(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (value === undefined) {
        cleaned[key] = null;
      } else if (value !== null && typeof value === 'object') {
        cleaned[key] = sanitizeFirestoreData(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned as T;
  }
  return obj;
}

// Update level name directly in the consolidated big file (bundles/levels)
export async function updateLevelName(levelId: string, newName: string): Promise<void> {
  await updateLevelData(levelId, { name: newName });
}

/**
 * Generic update for level fields.
 * Writes directly to the consolidated big file (bundles/levels).
 * If thumbnailUrl is updated, writes to chunked image document (image_chunks/{chunkId}).
 */
export async function updateLevelData(levelId: string, data: Partial<KaizoLevel>): Promise<void> {
  try {
    let targetRank = data.rank;
    let targetChunkId = data.imageChunkId;

    if (targetRank === undefined || !targetChunkId) {
      const cached = cachedLevelsMap.get(levelId);
      if (cached) {
        targetRank = targetRank ?? cached.rank;
        targetChunkId = targetChunkId ?? cached.imageChunkId;
      }
      if (targetRank === undefined || !targetChunkId) {
        const bundle = await fetchLevelsBundle();
        if (bundle && Array.isArray(bundle.levels)) {
          const found = bundle.levels.find(l => l.id === levelId);
          if (found) {
            targetRank = targetRank ?? found.rank;
            targetChunkId = targetChunkId ?? found.imageChunkId;
          }
        }
      }
    }

    // 1. If an image is updated, write to chunked image document
    if (data.thumbnailUrl !== undefined) {
      await updateLevelThumbnail(levelId, data.thumbnailUrl, targetRank, targetChunkId);
    }

    // 2. Write all other level list info directly to the big file (bundles/levels)
    const { thumbnailUrl: _omitted, ...listFields } = data;
    if (Object.keys(listFields).length > 0) {
      const currentBundle = await fetchLevelsBundle();
      if (currentBundle && Array.isArray(currentBundle.levels)) {
        const updatedLevels = currentBundle.levels.map((lvl) => {
          if (lvl.id === levelId) {
            return { ...lvl, ...listFields };
          }
          return lvl;
        });
        await updateLevelsBundleInFirestore(updatedLevels);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bundles/levels`);
    throw error;
  }
}

// Delete a level document: removes from bundles/levels and purges from image chunk
export async function deleteLevelFromFirestore(levelId: string): Promise<void> {
  const targetChunkId = getChunkIdForLevel(levelId);
  const deletedRef = doc(db, 'deletedLevels', levelId);
  try {
    thumbnailMemoryCache.delete(levelId);
    const chunkRef = doc(db, 'image_chunks', targetChunkId);
    await updateDoc(chunkRef, {
      [`images.${levelId}`]: deleteField(),
      updatedAt: new Date().toISOString()
    }).catch(() => {});
    await setDoc(deletedRef, { id: levelId, deletedAt: new Date().toISOString() });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `image_chunks/${targetChunkId}`);
  }

  try {
    const currentBundle = await fetchLevelsBundle();
    if (currentBundle && Array.isArray(currentBundle.levels)) {
      const filtered = currentBundle.levels.filter((l) => l.id !== levelId);
      const reindexed = filtered.map((lvl, idx) => ({ ...lvl, rank: idx + 1 }));
      await updateLevelsBundleInFirestore(reindexed);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `bundles/levels`);
    throw error;
  }
}

// Subscribe to Deleted Level IDs
export function subscribeToDeletedLevels(onUpdate: (deletedIds: Set<string>) => void) {
  const colRef = collection(db, 'deletedLevels');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const set = new Set<string>();
      snapshot.forEach((docSnap) => {
        set.add(docSnap.id);
      });
      onUpdate(set);
    },
    (error) => {
      console.warn('Deleted levels notice:', error);
    }
  );
}

// Subscribe to Deleted Player IDs
export function subscribeToDeletedPlayers(onUpdate: (deletedIds: Set<string>) => void) {
  const colRef = collection(db, 'deletedPlayers');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const set = new Set<string>();
      snapshot.forEach((docSnap) => {
        set.add(docSnap.id);
      });
      onUpdate(set);
    },
    (error) => {
      console.warn('Deleted players notice:', error);
    }
  );
}

// Save reordered level ranks directly to bundles/levels in 1 single write
export async function saveReorderedLevelsToFirestore(reorderedLevels: KaizoLevel[]): Promise<void> {
  try {
    const updatedLevels = reorderedLevels.map((lvl, idx) => {
      const newRank = idx + 1;
      const expectedChunkId = `chunk-${Math.floor((newRank - 1) / 10) + 1}`;
      return {
        ...lvl,
        rank: newRank,
        imageChunkId: lvl.imageChunkId || expectedChunkId
      };
    });
    await updateLevelsBundleInFirestore(updatedLevels);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'bundles/levels');
    throw error;
  }
}

// Add a brand new level at a specific placement rank
export async function addLevelToFirestore(
  newLevelData: Omit<KaizoLevel, 'id' | 'rank'>,
  placementRank: number,
  existingLevels: KaizoLevel[]
): Promise<string> {
  try {
    const newId = `level-${Date.now()}`;
    const targetChunkId = `chunk-${Math.floor(Math.max(0, placementRank - 1) / 10) + 1}`;
    
    // 1. If image was provided, store in the chunk
    if (newLevelData.thumbnailUrl) {
      await updateLevelThumbnail(newId, newLevelData.thumbnailUrl, placementRank, targetChunkId);
    }

    const { thumbnailUrl: _omitted, ...cleanData } = newLevelData;
    const levelToAdd: KaizoLevel = {
      ...cleanData,
      id: newId,
      rank: placementRank,
      imageChunkId: targetChunkId,
      thumbnailUrl: null
    };

    // Clone and insert new level at placementRank - 1
    const sortedExisting = [...existingLevels].sort((a, b) => a.rank - b.rank);
    const targetIdx = Math.max(0, Math.min(placementRank - 1, sortedExisting.length));

    sortedExisting.splice(targetIdx, 0, levelToAdd);

    // Save all updated level ranks directly to bundles/levels
    await saveReorderedLevelsToFirestore(sortedExisting);
    return newId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'bundles/levels');
    throw error;
  }
}

// Save submission to Firestore
export async function addSubmissionToFirestore(submission: ProofSubmission) {
  const subRef = doc(db, 'submissions', submission.id);
  try {
    await setDoc(subRef, sanitizeFirestoreData(submission));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `submissions/${submission.id}`);
    throw error;
  }
}

// Subscribe to Submissions
export function subscribeToSubmissions(
  onUpdate: (submissions: ProofSubmission[]) => void
) {
  const subCol = collection(db, 'submissions');
  return onSnapshot(
    subCol,
    (snapshot) => {
      const subs: ProofSubmission[] = [];
      snapshot.forEach((docSnap) => {
        subs.push(docSnap.data() as ProofSubmission);
      });
      onUpdate(subs);
    },
    (error) => {
      console.warn('Submissions subscription notice:', error);
      handleFirestoreError(error, OperationType.LIST, 'submissions');
    }
  );
}

// Add/update Player profile in Firestore
export async function addPlayerToFirestore(player: PlayerProfile) {
  const playerRef = doc(db, 'players', player.id);
  try {
    await setDoc(playerRef, sanitizeFirestoreData(player), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `players/${player.id}`);
    throw error;
  }
}

// Update Player Profile identity (Name, ID, Country) and update matching level victors across Firestore
export async function updatePlayerIdentity(
  oldPlayerId: string,
  oldPlayerName: string,
  newPlayerId: string,
  newPlayerName: string,
  newCountry?: string
): Promise<void> {
  const cleanNewId = newPlayerId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || oldPlayerId;
  const cleanNewName = newPlayerName.trim();
  const cleanCountry = (newCountry || '').trim().toUpperCase();

  try {
    // 1. If player ID changed, delete old player document
    if (oldPlayerId !== cleanNewId) {
      const oldPlayerRef = doc(db, 'players', oldPlayerId);
      await deleteDoc(oldPlayerRef);
    }

    // 2. Write/update new player document
    const newPlayerRef = doc(db, 'players', cleanNewId);
    await setDoc(
      newPlayerRef,
      sanitizeFirestoreData({
        id: cleanNewId,
        name: cleanNewName,
        country: cleanCountry,
        addedAt: new Date().toISOString()
      }),
      { merge: true }
    );

    // 3. Update matching victors across bundles/levels in a single write
    const currentBundle = await fetchLevelsBundle();
    if (currentBundle && Array.isArray(currentBundle.levels)) {
      const oldIdLower = oldPlayerId.toLowerCase();
      const oldNameLower = oldPlayerName.toLowerCase().trim();
      let modified = false;

      const updatedLevels = currentBundle.levels.map((lvl) => {
        if (!Array.isArray(lvl.victors) || lvl.victors.length === 0) return lvl;
        let levelVictorsChanged = false;

        const updatedVictors = lvl.victors.map((v) => {
          const vSlug = (v.id || '').replace(/^vic-\d+-/, '').toLowerCase();
          const vName = (v.name || '').toLowerCase().trim();

          const matches =
            vSlug === oldIdLower ||
            (v.id && v.id.toLowerCase() === oldIdLower) ||
            (oldNameLower && vName === oldNameLower);

          if (matches) {
            levelVictorsChanged = true;
            return {
              ...v,
              name: cleanNewName,
              id: `vic-${lvl.id}-${cleanNewId}`
            };
          }
          return v;
        });

        if (levelVictorsChanged) {
          modified = true;
          return { ...lvl, victors: updatedVictors };
        }
        return lvl;
      });

      if (modified) {
        await updateLevelsBundleInFirestore(updatedLevels);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `players/${cleanNewId}`);
    throw error;
  }
}

// Delete Player profile from Firestore and purge from deletedPlayers registry
export async function deletePlayerFromFirestore(playerId: string, playerName?: string) {
  const playerRef = doc(db, 'players', playerId);
  const deletedRef = doc(db, 'deletedPlayers', playerId);
  try {
    await deleteDoc(playerRef);
    await setDoc(deletedRef, { id: playerId, name: playerName || '', deletedAt: new Date().toISOString() });

    // Also purge victor entries matching this player from bundles/levels directly
    const currentBundle = await fetchLevelsBundle();
    if (currentBundle && Array.isArray(currentBundle.levels)) {
      const pKey = playerId.toLowerCase();
      const pNameLower = (playerName || '').toLowerCase().trim();
      let modified = false;

      const updatedLevels = currentBundle.levels.map((lvl) => {
        if (!Array.isArray(lvl.victors) || lvl.victors.length === 0) return lvl;
        const filteredVictors = lvl.victors.filter((v) => {
          const vSlug = (v.id || '').replace(/^vic-\d+-/, '').toLowerCase();
          const vName = (v.name || '').toLowerCase().trim();
          if (vSlug === pKey || (pNameLower && vName === pNameLower)) {
            return false;
          }
          return true;
        });

        if (filteredVictors.length !== lvl.victors.length) {
          modified = true;
          return { ...lvl, victors: filteredVictors };
        }
        return lvl;
      });

      if (modified) {
        await updateLevelsBundleInFirestore(updatedLevels);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `players/${playerId}`);
    throw error;
  }
}

// Subscribe to Players real-time
export function subscribeToPlayers(
  onUpdate: (players: PlayerProfile[]) => void
) {
  const playersCol = collection(db, 'players');
  return onSnapshot(
    playersCol,
    (snapshot) => {
      const players: PlayerProfile[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as PlayerProfile;
        if (data && data.name) {
          players.push({
            id: docSnap.id || data.id,
            name: data.name,
            country: data.country || '',
            addedAt: data.addedAt || new Date().toISOString()
          });
        }
      });
      onUpdate(players);
    },
    (error) => {
      console.warn('Players subscription notice:', error);
      handleFirestoreError(error, OperationType.LIST, 'players');
    }
  );
}

