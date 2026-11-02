import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
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
  deleteField,
  DocumentReference,
  CollectionReference,
  Query,
  QuerySnapshot,
  DocumentSnapshot
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { KaizoLevel, ProofSubmission, PlayerProfile, ChangelogItem, ListHelper, ChangeDetail, User } from '../types/kaizo';
import initialLevelsData from '../data/kaizoLevels.json';
import { firestoreMonitor } from '../utils/firestoreMonitor';

// Re-export firestoreMonitor
export { firestoreMonitor };

// Tracked Wrapper for getDoc
export async function trackedGetDoc(docRef: DocumentReference, caller?: string): Promise<DocumentSnapshot> {
  const path = docRef.path;
  const snap = await getDoc(docRef);
  firestoreMonitor.logRead('getDoc', path, 1, caller);
  return snap;
}

// Tracked Wrapper for getDocs
export async function trackedGetDocs(colRefOrQuery: CollectionReference | Query, caller?: string): Promise<QuerySnapshot> {
  const path = (colRefOrQuery as any).path || (colRefOrQuery as any)._query?.path?.toString() || 'collection';
  const snap = await getDocs(colRefOrQuery);
  const count = Math.max(1, snap.docs.length);
  firestoreMonitor.logRead('getDocs', path, count, caller);
  return snap;
}

// Tracked Wrapper for onSnapshot
export function trackedOnSnapshot(
  refOrQuery: any,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void,
  caller?: string
): () => void {
  const path = refOrQuery.path || refOrQuery._query?.path?.toString() || 'subscription';
  firestoreMonitor.trackListenerAttach(path);
  let isFirst = true;

  const unsubscribe = onSnapshot(
    refOrQuery,
    (snapshot: any) => {
      let readCount = 0;
      if (typeof snapshot.docs !== 'undefined') {
        // QuerySnapshot
        if (isFirst) {
          readCount = snapshot.docs.length;
        } else {
          const changes = snapshot.docChanges ? snapshot.docChanges() : [];
          readCount = changes.filter((c: any) => c.type === 'added' || c.type === 'modified').length;
        }
      } else {
        // DocumentSnapshot
        readCount = 1;
      }

      if (readCount > 0) {
        firestoreMonitor.logRead('onSnapshot', path, readCount, caller, isFirst);
      }
      isFirst = false;

      onNext(snapshot);
    },
    (error) => {
      if (onError) onError(error);
    }
  );

  return () => {
    firestoreMonitor.trackListenerDetach(path);
    unsubscribe();
  };
}

// Tracked Wrapper for setDoc
export async function trackedSetDoc(
  docRef: any,
  data: any,
  options?: any,
  caller?: string
): Promise<void> {
  const path = docRef.path || 'document';
  if (options) {
    await setDoc(docRef, data, options);
  } else {
    await setDoc(docRef, data);
  }
  firestoreMonitor.logWrite('setDoc', path, 1, caller);
}

// Tracked Wrapper for updateDoc
export async function trackedUpdateDoc(
  docRef: any,
  data: any,
  caller?: string
): Promise<void> {
  const path = docRef.path || 'document';
  await updateDoc(docRef, data);
  firestoreMonitor.logWrite('updateDoc', path, 1, caller);
}

// Tracked Wrapper for deleteDoc
export async function trackedDeleteDoc(
  docRef: any,
  caller?: string
): Promise<void> {
  const path = docRef.path || 'document';
  await deleteDoc(docRef);
  firestoreMonitor.logWrite('deleteDoc', path, 1, caller);
}

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistent local cache across tabs & reloads (0 reads on refresh)
export const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  },
  firebaseConfig.firestoreDatabaseId
);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged };

// In-Memory User Auth and Info Caches
const userAuthCache = new Map<string, { role: string; name: string }>();

export async function getCachedUserInfo(email: string | null): Promise<{ isAuthorized: boolean; role: string; name: string } | null> {
  if (!email) return null;
  const cleanEmail = email.toLowerCase().trim();
  if (cleanEmail === 'tomatosauceman500@gmail.com') {
    return { isAuthorized: true, role: 'admin', name: 'Admin' };
  }

  if (userAuthCache.has(cleanEmail)) {
    const cached = userAuthCache.get(cleanEmail)!;
    return {
      isAuthorized: cached.role === 'helper' || cached.role === 'admin',
      role: cached.role,
      name: cached.name
    };
  }

  try {
    const userId = cleanEmail.replace(/[@.]/g, '_');
    const docRef = doc(db, 'users', userId);
    const docSnap = await trackedGetDoc(docRef, 'isUserAuthorizedCheck');
    if (!docSnap.exists()) {
      return { isAuthorized: false, role: 'none', name: 'List Helper' };
    }
    const data = docSnap.data();
    const role = data?.role || 'none';
    const name = data?.name || 'List Helper';
    userAuthCache.set(cleanEmail, { role, name });
    return {
      isAuthorized: role === 'helper' || role === 'admin',
      role,
      name
    };
  } catch (err) {
    console.warn('Error checking user authorization:', err);
    return null;
  }
}

export async function isUserAuthorized(email: string | null): Promise<boolean> {
  const info = await getCachedUserInfo(email);
  return info ? info.isAuthorized : false;
}

export async function getPlayerNameByEmail(email: string | null): Promise<string> {
  const info = await getCachedUserInfo(email);
  return info ? info.name : 'List Helper';
}

// --- SHARED PERSISTENT BUNDLE SUBSCRIPTION MANAGERS ---
// Prevents re-subscribing and re-reading whole collections when switching tabs or refreshing

// 1. Users Subscription Manager
let cachedUsersList: User[] | null = null;
const usersSubscribers = new Set<(users: User[]) => void>();
let usersUnsubscribeRef: (() => void) | null = null;

export function subscribeToUsers(onUpdate: (users: User[]) => void) {
  usersSubscribers.add(onUpdate);
  if (cachedUsersList) {
    onUpdate(cachedUsersList);
  }

  if (!usersUnsubscribeRef) {
    const usersCollection = collection(db, 'users');
    usersUnsubscribeRef = trackedOnSnapshot(
      usersCollection,
      (snapshot) => {
        const users: User[] = [];
        snapshot.forEach((docSnap: any) => {
          users.push(docSnap.data() as User);
        });
        cachedUsersList = users;
        for (const sub of usersSubscribers) {
          sub(users);
        }
      },
      (error) => console.warn('Users subscription notice:', error),
      'subscribeToUsers'
    );
  }

  return () => {
    usersSubscribers.delete(onUpdate);
  };
}

export interface ChangelogBundleData {
  id: string;
  updatedAt: string;
  items: ChangelogItem[];
}

let cachedChangelogBundle: ChangelogBundleData | null = null;
let changelogBundlePromise: Promise<ChangelogBundleData | null> | null = null;

export async function fetchChangelogBundle(): Promise<ChangelogBundleData | null> {
  if (cachedChangelogBundle) {
    return cachedChangelogBundle;
  }
  if (changelogBundlePromise) {
    return changelogBundlePromise;
  }

  const bundleRef = doc(db, 'bundles', 'changelog');
  changelogBundlePromise = (async () => {
    try {
      const snap = await trackedGetDoc(bundleRef, 'fetchChangelogBundle');
      if (snap.exists()) {
        const data = snap.data() as ChangelogBundleData;
        cachedChangelogBundle = data;
        if (data && Array.isArray(data.items)) {
          cachedChangelogList = data.items;
        }
        return data;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'bundles/changelog');
      return null;
    } finally {
      changelogBundlePromise = null;
    }
  })();

  return changelogBundlePromise;
}

// 2. Changelog Subscription Manager
let cachedChangelogList: ChangelogItem[] | null = null;
const changelogSubscribers = new Set<(changelog: ChangelogItem[]) => void>();
let changelogUnsubscribeRef: (() => void) | null = null;

export function subscribeToChangelog(onUpdate: (changelog: ChangelogItem[]) => void) {
  changelogSubscribers.add(onUpdate);
  if (cachedChangelogList) {
    onUpdate(cachedChangelogList);
  }

  if (!changelogUnsubscribeRef) {
    const bundleRef = doc(db, 'bundles', 'changelog');
    changelogUnsubscribeRef = trackedOnSnapshot(
      bundleRef,
      (snapshot: any) => {
        let items: ChangelogItem[] = [];
        if (snapshot.exists()) {
          const data = snapshot.data() as ChangelogBundleData;
          cachedChangelogBundle = data;
          if (Array.isArray(data.items)) {
            items = data.items;
          }
        }
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        cachedChangelogList = items;
        for (const sub of changelogSubscribers) {
          sub(items);
        }
      },
      (error) => console.warn('Changelog subscription notice:', error),
      'subscribeToChangelog'
    );
  }

  return () => {
    changelogSubscribers.delete(onUpdate);
  };
}

// 3. Submissions Subscription Manager (reads from single document bundles/submissions)
export interface SubmissionsBundleData {
  id: string;
  updatedAt: string;
  submissions: ProofSubmission[];
}

let cachedSubmissionsList: ProofSubmission[] | null = null;
const submissionsSubscribers = new Set<(subs: ProofSubmission[]) => void>();
let submissionsUnsubscribeRef: (() => void) | null = null;

export function subscribeToSubmissions(onUpdate: (submissions: ProofSubmission[]) => void) {
  submissionsSubscribers.add(onUpdate);
  if (cachedSubmissionsList) {
    onUpdate(cachedSubmissionsList);
  }

  if (!submissionsUnsubscribeRef) {
    const bundleRef = doc(db, 'bundles', 'submissions');
    submissionsUnsubscribeRef = trackedOnSnapshot(
      bundleRef,
      (snapshot: any) => {
        let subs: ProofSubmission[] = [];
        if (snapshot.exists()) {
          const data = snapshot.data() as SubmissionsBundleData;
          if (Array.isArray(data.submissions)) {
            subs = data.submissions;
          }
        }
        cachedSubmissionsList = subs;
        for (const sub of submissionsSubscribers) {
          sub(subs);
        }
      },
      (error) => {
        console.warn('Submissions bundle subscription notice:', error);
      },
      'subscribeToSubmissions'
    );
  }

  return () => {
    submissionsSubscribers.delete(onUpdate);
  };
}

// 4. Players Subscription Manager (reads from single document bundles/players)
export interface PlayersBundleData {
  id: string;
  updatedAt: string;
  players: PlayerProfile[];
}

let cachedPlayersList: PlayerProfile[] | null = null;
const playersSubscribers = new Set<(players: PlayerProfile[]) => void>();
let playersUnsubscribeRef: (() => void) | null = null;

export function subscribeToPlayers(onUpdate: (players: PlayerProfile[]) => void) {
  playersSubscribers.add(onUpdate);
  if (cachedPlayersList) {
    onUpdate(cachedPlayersList);
  }

  if (!playersUnsubscribeRef) {
    const bundleRef = doc(db, 'bundles', 'players');
    playersUnsubscribeRef = trackedOnSnapshot(
      bundleRef,
      (snapshot: any) => {
        let players: PlayerProfile[] = [];
        if (snapshot.exists()) {
          const data = snapshot.data() as PlayersBundleData;
          if (Array.isArray(data.players)) {
            players = data.players;
          }
        }
        cachedPlayersList = players;
        for (const sub of playersSubscribers) {
          sub(players);
        }
      },
      (error) => {
        console.warn('Players bundle subscription notice:', error);
      },
      'subscribeToPlayers'
    );
  }

  return () => {
    playersSubscribers.delete(onUpdate);
  };
}

export async function updatePlayersBundleInFirestore(players: PlayerProfile[]): Promise<void> {
  const bundleRef = doc(db, 'bundles', 'players');
  cachedPlayersList = players;
  const payload: PlayersBundleData = {
    id: 'players',
    updatedAt: new Date().toISOString(),
    players
  };
  try {
    await trackedSetDoc(bundleRef, sanitizeFirestoreData(payload), { merge: true }, 'updatePlayersBundleInFirestore');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'bundles/players');
    throw error;
  }
}

// 5. Deleted Levels & Players Subscription Managers (reads from bundles/deletedLevels & bundles/deletedPlayers)
export interface DeletedBundleData {
  id: string;
  updatedAt: string;
  ids: string[];
}

let cachedDeletedLevelsSet: Set<string> | null = null;
const deletedLevelsSubscribers = new Set<(dSet: Set<string>) => void>();
let deletedLevelsUnsubscribeRef: (() => void) | null = null;

export function subscribeToDeletedLevels(onUpdate: (deletedIds: Set<string>) => void) {
  deletedLevelsSubscribers.add(onUpdate);
  if (cachedDeletedLevelsSet) {
    onUpdate(cachedDeletedLevelsSet);
  }

  if (!deletedLevelsUnsubscribeRef) {
    const bundleRef = doc(db, 'bundles', 'deletedLevels');
    deletedLevelsUnsubscribeRef = trackedOnSnapshot(
      bundleRef,
      (snapshot: any) => {
        const set = new Set<string>();
        if (snapshot.exists()) {
          const data = snapshot.data() as DeletedBundleData;
          if (Array.isArray(data.ids)) {
            data.ids.forEach((id) => set.add(id));
          }
        }
        cachedDeletedLevelsSet = set;
        for (const sub of deletedLevelsSubscribers) {
          sub(set);
        }
      },
      (error) => console.warn('Deleted levels bundle notice:', error),
      'subscribeToDeletedLevels'
    );
  }

  return () => {
    deletedLevelsSubscribers.delete(onUpdate);
  };
}

export async function addDeletedLevelIdToBundle(levelId: string): Promise<void> {
  const bundleRef = doc(db, 'bundles', 'deletedLevels');
  const currentSet = cachedDeletedLevelsSet || new Set<string>();
  currentSet.add(levelId);
  cachedDeletedLevelsSet = currentSet;
  const payload: DeletedBundleData = {
    id: 'deletedLevels',
    updatedAt: new Date().toISOString(),
    ids: Array.from(currentSet)
  };
  await trackedSetDoc(bundleRef, sanitizeFirestoreData(payload), { merge: true }, 'addDeletedLevelIdToBundle');
}

let cachedDeletedPlayersSet: Set<string> | null = null;
const deletedPlayersSubscribers = new Set<(dSet: Set<string>) => void>();
let deletedPlayersUnsubscribeRef: (() => void) | null = null;

export function subscribeToDeletedPlayers(onUpdate: (deletedIds: Set<string>) => void) {
  deletedPlayersSubscribers.add(onUpdate);
  if (cachedDeletedPlayersSet) {
    onUpdate(cachedDeletedPlayersSet);
  }

  if (!deletedPlayersUnsubscribeRef) {
    const bundleRef = doc(db, 'bundles', 'deletedPlayers');
    deletedPlayersUnsubscribeRef = trackedOnSnapshot(
      bundleRef,
      (snapshot: any) => {
        const set = new Set<string>();
        if (snapshot.exists()) {
          const data = snapshot.data() as DeletedBundleData;
          if (Array.isArray(data.ids)) {
            data.ids.forEach((id) => set.add(id));
          }
        }
        cachedDeletedPlayersSet = set;
        for (const sub of deletedPlayersSubscribers) {
          sub(set);
        }
      },
      (error) => console.warn('Deleted players bundle notice:', error),
      'subscribeToDeletedPlayers'
    );
  }

  return () => {
    deletedPlayersSubscribers.delete(onUpdate);
  };
}

export async function addDeletedPlayerIdToBundle(playerId: string): Promise<void> {
  const bundleRef = doc(db, 'bundles', 'deletedPlayers');
  const currentSet = cachedDeletedPlayersSet || new Set<string>();
  currentSet.add(playerId);
  cachedDeletedPlayersSet = currentSet;
  const payload: DeletedBundleData = {
    id: 'deletedPlayers',
    updatedAt: new Date().toISOString(),
    ids: Array.from(currentSet)
  };
  await trackedSetDoc(bundleRef, sanitizeFirestoreData(payload), { merge: true }, 'addDeletedPlayerIdToBundle');
}

// Grant or update helper access
export async function updateAuthorizedUser(email: string, name: string, role: 'helper' | 'admin' = 'helper') {
  const cleanEmail = email.toLowerCase().trim();
  const userId = cleanEmail.replace(/[@.]/g, '_');
  userAuthCache.set(cleanEmail, { role, name: name.trim() });
  const userRef = doc(db, 'users', userId);
  const userData: User = {
    id: userId,
    email: cleanEmail,
    name: name.trim(),
    role,
    addedAt: new Date().toISOString()
  };
  
  try {
    await trackedSetDoc(userRef, sanitizeFirestoreData(userData), { merge: true }, 'updateAuthorizedUser');
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    throw error;
  }
}

// Revoke access
export async function removeAuthorizedUser(email: string) {
  const cleanEmail = email.toLowerCase().trim();
  const userId = cleanEmail.replace(/[@.]/g, '_');
  userAuthCache.delete(cleanEmail);
  const userRef = doc(db, 'users', userId);
  try {
    await trackedDeleteDoc(userRef, 'removeAuthorizedUser');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    throw error;
  }
}

// Add changelog item with rich metadata & change tracking directly to bundles/changelog in 1 write
export async function addChangelogItem(
  action: string,
  description: string,
  author?: string,
  changesOrMeta?: ChangeDetail[] | { levelId?: string; levelName?: string },
  meta?: { levelId?: string; levelName?: string } | ChangeDetail[]
) {
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

    const newItem: ChangelogItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      action,
      description,
      author: author || 'List Helper',
      levelName: levelNameVal || undefined,
      changes: changesList || undefined
    };

    let currentItems: ChangelogItem[] = cachedChangelogList || [];
    if (!cachedChangelogList) {
      const bundle = await fetchChangelogBundle();
      if (bundle && Array.isArray(bundle.items)) {
        currentItems = bundle.items;
      }
    }

    // Prepend new item and cap at top 1000 items to preserve full history while keeping document lightweight
    const updatedItems = [newItem, ...currentItems.filter((i) => i.id !== newItem.id)].slice(0, 1000);
    cachedChangelogList = updatedItems;

    const bundleRef = doc(db, 'bundles', 'changelog');
    const payload: ChangelogBundleData = {
      id: 'changelog',
      updatedAt: new Date().toISOString(),
      items: updatedItems
    };

    await trackedSetDoc(bundleRef, sanitizeFirestoreData(payload), { merge: true }, 'addChangelogItem');
  } catch (error) {
    console.warn('Failed to log changelog item:', error);
  }
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

// Consolidated bundle helper for error logging

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
      const snap = await trackedGetDoc(chunkDocRef, `fetchImageChunk:${chunkId}`);
      loadedImageChunksSet.add(chunkId);

      const images: Record<string, string> = snap.exists() ? (snap.data()?.images || {}) : {};

      // 1. Store loaded thumbnail image URLs
      for (const [lvlId, imgUrl] of Object.entries(images)) {
        if (typeof imgUrl === 'string' && imgUrl.trim().length > 0) {
          thumbnailMemoryCache.set(lvlId, imgUrl);
        }
      }

      // 2. Mark null in thumbnailMemoryCache for all levels mapped to this chunk that have no image in Firestore
      for (const [lvlId, mappedChunk] of levelToChunkMap.entries()) {
        if (mappedChunk === chunkId && !thumbnailMemoryCache.has(lvlId)) {
          thumbnailMemoryCache.set(lvlId, null);
        }
      }
      for (const [lvlId, lvl] of cachedLevelsMap.entries()) {
        const cId = getChunkIdForLevel(lvlId, lvl.rank, lvl.imageChunkId);
        if (cId === chunkId && !thumbnailMemoryCache.has(lvlId)) {
          thumbnailMemoryCache.set(lvlId, null);
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

  // 1. Return from in-memory cache if checked previously
  if (thumbnailMemoryCache.has(levelId)) {
    return thumbnailMemoryCache.get(levelId) || null;
  }

  // 2. Determine primary chunk ID and fetch chunk document once
  const targetChunkId = await getChunkIdForLevelAsync(levelId, rank, chunkId);
  await fetchImageChunk(targetChunkId);

  if (thumbnailMemoryCache.has(levelId)) {
    return thumbnailMemoryCache.get(levelId) || null;
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
      await trackedUpdateDoc(chunkRef, {
        [`images.${levelId}`]: deleteField(),
        updatedAt: new Date().toISOString()
      }, 'updateLevelThumbnail').catch(() => {});
    } else {
      try {
        await trackedUpdateDoc(chunkRef, {
          [`images.${levelId}`]: thumbnailUrl,
          updatedAt: new Date().toISOString()
        }, 'updateLevelThumbnail');
      } catch (updateErr) {
        await trackedSetDoc(chunkRef, {
          id: targetChunkId,
          updatedAt: new Date().toISOString(),
          images: {
            [levelId]: thumbnailUrl
          }
        }, undefined, 'updateLevelThumbnail');
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
      const snap = await trackedGetDoc(bundleRef, 'fetchLevelsBundle');
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

// 6. Levels Bundle Subscription Manager
const levelsBundleSubscribers = new Set<{
  onUpdate: (data: LevelsBundleData) => void;
  onError?: (err: Error) => void;
}>();
let levelsBundleUnsubscribeRef: (() => void) | null = null;

export function subscribeToLevelsBundle(
  onUpdate: (data: LevelsBundleData) => void,
  onError?: (err: Error) => void
) {
  const handlerObj = { onUpdate, onError };
  levelsBundleSubscribers.add(handlerObj);

  if (cachedLevelsBundle) {
    onUpdate(cachedLevelsBundle);
  }

  if (!levelsBundleUnsubscribeRef) {
    const bundleRef = doc(db, 'bundles', 'levels');
    levelsBundleUnsubscribeRef = trackedOnSnapshot(
      bundleRef,
      (snapshot: any) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as LevelsBundleData;
          cachedLevelsBundle = data;
          if (data && Array.isArray(data.levels)) {
            registerLevelsInCache(data.levels);
          }
          for (const sub of levelsBundleSubscribers) {
            sub.onUpdate(data);
          }
        }
      },
      (error: any) => {
        console.warn('Bundle subscription notice:', error);
        handleFirestoreError(error, OperationType.GET, 'bundles/levels');
        for (const sub of levelsBundleSubscribers) {
          if (sub.onError) sub.onError(error);
        }
      },
      'subscribeToLevelsBundle'
    );
  }

  return () => {
    levelsBundleSubscribers.delete(handlerObj);
  };
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
    await trackedSetDoc(bundleRef, sanitizeFirestoreData(payload), { merge: true }, 'updateLevelsBundleInFirestore');
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
    await trackedUpdateDoc(chunkRef, {
      [`images.${levelId}`]: deleteField(),
      updatedAt: new Date().toISOString()
    }, 'deleteLevelFromFirestore').catch(() => {});
    await trackedSetDoc(deletedRef, { id: levelId, deletedAt: new Date().toISOString() }, undefined, 'deleteLevelFromFirestore');
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

// Save submission to Firestore in bundles/submissions
export async function addSubmissionToFirestore(submission: ProofSubmission) {
  const current = cachedSubmissionsList || [];
  const updated = [submission, ...current.filter((s) => s.id !== submission.id)];
  cachedSubmissionsList = updated;
  const bundleRef = doc(db, 'bundles', 'submissions');
  const payload: SubmissionsBundleData = {
    id: 'submissions',
    updatedAt: new Date().toISOString(),
    submissions: updated
  };
  try {
    await trackedSetDoc(bundleRef, sanitizeFirestoreData(payload), { merge: true }, 'addSubmissionToFirestore');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'bundles/submissions');
    throw error;
  }
}

// Add/update Player profile in Firestore (writes to bundles/players in 1 write)
export async function addPlayerToFirestore(player: PlayerProfile) {
  const current = cachedPlayersList || [];
  const updated = [player, ...current.filter((p) => p.id !== player.id)];
  await updatePlayersBundleInFirestore(updated);
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
    const currentPlayers = cachedPlayersList || [];
    const updatedPlayers = currentPlayers.map((p) => {
      if (p.id === oldPlayerId) {
        return { ...p, id: cleanNewId, name: cleanNewName, country: cleanCountry };
      }
      return p;
    });
    if (!updatedPlayers.some((p) => p.id === cleanNewId)) {
      updatedPlayers.push({
        id: cleanNewId,
        name: cleanNewName,
        country: cleanCountry,
        addedAt: new Date().toISOString()
      });
    }
    await updatePlayersBundleInFirestore(updatedPlayers);

    // Update matching victors across bundles/levels in a single write
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
              name: cleanNewName
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
    handleFirestoreError(error, OperationType.WRITE, `bundles/players`);
    throw error;
  }
}

// Delete Player profile from Firestore and purge from deletedPlayers registry
export async function deletePlayerFromFirestore(playerId: string, playerName?: string) {
  try {
    const current = cachedPlayersList || [];
    const updated = current.filter((p) => p.id !== playerId);
    await updatePlayersBundleInFirestore(updated);
    await addDeletedPlayerIdToBundle(playerId);

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
    handleFirestoreError(error, OperationType.DELETE, `bundles/players`);
    throw error;
  }
}
