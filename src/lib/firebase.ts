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
  getDoc
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
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

export { signInWithPopup, signOut, onAuthStateChanged };

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

// Subscribe to Levels real-time with automatic field sanitization and baseline defaults
export function subscribeToLevels(
  onUpdate: (levels: KaizoLevel[]) => void,
  onError?: (err: Error) => void
) {
  const levelsCollection = collection(db, 'levels');
  return onSnapshot(
    levelsCollection,
    (snapshot) => {
      const levels: KaizoLevel[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Partial<KaizoLevel>;
        if (data && typeof data === 'object') {
          const docId = docSnap.id;
          const baseline = baselineLevelsMap.get(docId) || baselineLevelsMap.get(data.id || '');

          const sanitizedLevel: KaizoLevel = {
            id: docId || data.id || baseline?.id || 'unknown',
            rank: typeof data.rank === 'number' ? data.rank : (baseline?.rank ?? 999),
            name: data.name || baseline?.name || 'Untitled Level',
            creator: data.creator || baseline?.creator || 'Unknown Creator',
            verifier: data.verifier !== undefined ? data.verifier : (baseline?.verifier ?? ''),
            worldRecord: data.worldRecord || baseline?.worldRecord || '-',
            directPlayUrl: data.directPlayUrl || baseline?.directPlayUrl || 'https://jellycade.com/games/goober-dash',
            difficulty: data.difficulty || baseline?.difficulty || 'Entry Kaizo',
            thumbnailUrl: data.thumbnailUrl !== undefined ? data.thumbnailUrl : (baseline?.thumbnailUrl || null),
            imageFit: data.imageFit || baseline?.imageFit || 'cover',
            length: data.length || baseline?.length || 'Short',
            victors: Array.isArray(data.victors) && data.victors.length > 0 ? data.victors : (baseline?.victors || []),
            isLegacy: data.isLegacy !== undefined ? Boolean(data.isLegacy) : (baseline?.isLegacy || false)
          };
          levels.push(sanitizedLevel);
        }
      });
      // Sort levels by rank ascending
      levels.sort((a, b) => a.rank - b.rank);
      onUpdate(levels);
    },
    (error) => {
      console.warn('Failed to subscribe to levels:', error);
      handleFirestoreError(error, OperationType.LIST, 'levels');
      if (onError) onError(error);
    }
  );
}

// Sync/seed levels to Firestore: check for missing documents or incomplete documents and update them in Firestore
export async function syncLevelsToFirestore(initialLevels: KaizoLevel[]): Promise<number> {
  try {
    const levelsCol = collection(db, 'levels');
    const snapshot = await getDocs(levelsCol);
    const existingDocsMap = new Map(
      snapshot.docs.map((docSnap) => [docSnap.id, docSnap.data() as Partial<KaizoLevel>])
    );

    let updatedCount = 0;
    const docsToUpdate: { id: string; data: KaizoLevel }[] = [];

    for (const lvl of initialLevels) {
      const existingData = existingDocsMap.get(lvl.id);
      if (!existingData) {
        // Missing entirely in Firestore -> add complete baseline level
        docsToUpdate.push({ id: lvl.id, data: lvl });
        updatedCount++;
      } else {
        // Document exists, check if required fields like rank or creator are missing
        const isMissingFields =
          typeof existingData.rank !== 'number' ||
          !existingData.creator ||
          !existingData.difficulty;

        if (isMissingFields) {
          const mergedData: KaizoLevel = {
            ...lvl,
            ...existingData,
            id: lvl.id,
            rank: typeof existingData.rank === 'number' ? existingData.rank : lvl.rank,
            name: existingData.name || lvl.name,
            creator: existingData.creator || lvl.creator,
            verifier: existingData.verifier !== undefined ? existingData.verifier : lvl.verifier,
            difficulty: existingData.difficulty || lvl.difficulty,
            directPlayUrl: existingData.directPlayUrl || lvl.directPlayUrl || 'https://jellycade.com/games/goober-dash',
            thumbnailUrl: existingData.thumbnailUrl !== undefined ? existingData.thumbnailUrl : lvl.thumbnailUrl,
            victors: Array.isArray(existingData.victors) && existingData.victors.length > 0 ? existingData.victors : lvl.victors,
          };
          docsToUpdate.push({ id: lvl.id, data: mergedData });
          updatedCount++;
        }
      }
    }

    if (docsToUpdate.length > 0) {
      console.log(`Syncing/restoring ${docsToUpdate.length} levels in Firestore...`);
      for (let i = 0; i < docsToUpdate.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = docsToUpdate.slice(i, i + 400);
        chunk.forEach((item) => {
          const docRef = doc(db, 'levels', item.id);
          batch.set(docRef, sanitizeFirestoreData(item.data), { merge: true });
        });
        await batch.commit();
      }
      console.log(`Successfully synced ${docsToUpdate.length} levels in Firestore!`);
      return docsToUpdate.length;
    }
    return 0;
  } catch (error) {
    console.warn('Notice during level sync to Firestore:', error);
    return 0;
  }
}

// Legacy alias for seeding initial levels
export async function seedLevelsIfEmpty(initialLevels: KaizoLevel[]): Promise<boolean> {
  const count = await syncLevelsToFirestore(initialLevels);
  return count > 0;
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

// Update level name
export async function updateLevelName(levelId: string, newName: string) {
  const levelRef = doc(db, 'levels', levelId);
  try {
    await setDoc(levelRef, sanitizeFirestoreData({ name: newName }), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `levels/${levelId}`);
    throw error;
  }
}

// Update level thumbnail preview image (URL or Base64 data string)
export async function updateLevelThumbnail(levelId: string, thumbnailUrl: string | null) {
  const levelRef = doc(db, 'levels', levelId);
  try {
    await setDoc(levelRef, sanitizeFirestoreData({ thumbnailUrl: thumbnailUrl || null }), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `levels/${levelId}`);
    throw error;
  }
}

// Generic update for level fields
export async function updateLevelData(levelId: string, data: Partial<KaizoLevel>) {
  const levelRef = doc(db, 'levels', levelId);
  try {
    const sanitizedPayload = sanitizeFirestoreData(data);
    await setDoc(levelRef, sanitizedPayload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `levels/${levelId}`);
    throw error;
  }
}

// Delete a level document from Firestore and register in deletedLevels
export async function deleteLevelFromFirestore(levelId: string) {
  const levelRef = doc(db, 'levels', levelId);
  const deletedRef = doc(db, 'deletedLevels', levelId);
  try {
    await deleteDoc(levelRef);
    await setDoc(deletedRef, { id: levelId, deletedAt: new Date().toISOString() });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `levels/${levelId}`);
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

// Save reordered level ranks to Firestore in batch
export async function saveReorderedLevelsToFirestore(reorderedLevels: KaizoLevel[]): Promise<void> {
  try {
    const updatedLevels = reorderedLevels.map((lvl, idx) => ({
      ...lvl,
      rank: idx + 1
    }));

    for (let i = 0; i < updatedLevels.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = updatedLevels.slice(i, i + 400);
      chunk.forEach((lvl) => {
        const docRef = doc(db, 'levels', lvl.id);
        batch.set(docRef, sanitizeFirestoreData(lvl), { merge: true });
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'levels');
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
    const levelToAdd: KaizoLevel = {
      ...newLevelData,
      id: newId,
      rank: placementRank
    };

    // Clone and insert new level at placementRank - 1
    const sortedExisting = [...existingLevels].sort((a, b) => a.rank - b.rank);
    const targetIdx = Math.max(0, Math.min(placementRank - 1, sortedExisting.length));

    sortedExisting.splice(targetIdx, 0, levelToAdd);

    // Save all updated level ranks to Firestore
    await saveReorderedLevelsToFirestore(sortedExisting);
    return newId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'levels');
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

// Delete Player profile from Firestore and purge from deletedPlayers registry
export async function deletePlayerFromFirestore(playerId: string, playerName?: string) {
  const playerRef = doc(db, 'players', playerId);
  const deletedRef = doc(db, 'deletedPlayers', playerId);
  try {
    await deleteDoc(playerRef);
    await setDoc(deletedRef, { id: playerId, name: playerName || '', deletedAt: new Date().toISOString() });

    // Also purge victor entries matching this player from Firestore levels collection
    const levelsCol = collection(db, 'levels');
    const snapshot = await getDocs(levelsCol);
    const pKey = playerId.toLowerCase();
    const pNameLower = (playerName || '').toLowerCase().trim();

    const batch = writeBatch(db);
    let modified = false;

    snapshot.docs.forEach((docSnap) => {
      const lvl = docSnap.data() as KaizoLevel;
      if (Array.isArray(lvl.victors) && lvl.victors.length > 0) {
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
          batch.set(docSnap.ref, sanitizeFirestoreData({ ...lvl, victors: filteredVictors }), { merge: true });
        }
      }
    });

    if (modified) {
      await batch.commit();
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
