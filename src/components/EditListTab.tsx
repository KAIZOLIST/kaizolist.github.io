import React, { useState, useMemo, useEffect } from 'react';
import { KaizoLevel, Victor, PlayerProfile, ProofSubmission, ChangeDetail, User } from '../types/kaizo';
import {
  updateLevelData,
  addPlayerToFirestore,
  updatePlayerIdentity,
  deletePlayerFromFirestore,
  deleteLevelFromFirestore,
  saveReorderedLevelsToFirestore,
  addLevelToFirestore,
  addChangelogItem,
  subscribeToSubmissions,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  isUserAuthorized,
  getPlayerNameByEmail,
  subscribeToUsers,
  updateAuthorizedUser,
  removeAuthorizedUser,
  fetchLevelsBundle,
  fetchLevelThumbnail,
  subscribeToLevelThumbnail,
  notifyThumbnailUpdated,
  LevelsBundleData,
  auth,
  googleProvider
} from '../lib/firebase';
import { ChangelogTab } from './ChangelogTab';
import { PendingSubmissions } from './PendingSubmissions';
import { PLAYER_SLUG_NAME_MAP, getPointsForRank, getVictorName, isLevelVerified, getVerifiedPlacements, getLevelIdFromLink } from '../utils/kaizoUtils';
import {
  Pencil,
  Image as ImageIcon,
  Check,
  X,
  Upload,
  Search,
  Database,
  ExternalLink,
  Sparkles,
  Plus,
  Trash2,
  Users,
  Video,
  Crown,
  Layers,
  Globe,
  Award,
  ShieldCheck,
  Link as LinkIcon,
  Code,
  UserPlus,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Move,
  AlertTriangle,
  Clock,
  LogOut,
  Lock,
  Key,
  User as UserIcon,
  Download,
  FileDown,
  Loader2
} from 'lucide-react';

const EditListLevelThumb: React.FC<{
  levelId: string;
  rank?: number;
  chunkId?: string;
  initialUrl?: string | null;
}> = ({ levelId, rank, chunkId, initialUrl }) => {
  const [thumb, setThumb] = useState<string | null>(initialUrl || null);

  useEffect(() => {
    let isMounted = true;
    if (initialUrl) {
      setThumb(initialUrl);
    } else {
      fetchLevelThumbnail(levelId, rank, chunkId).then((img) => {
        if (isMounted && img) setThumb(img);
      });
    }

    const unsubscribe = subscribeToLevelThumbnail(levelId, (newImg: string | null) => {
      if (isMounted) setThumb(newImg);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [levelId, rank, chunkId, initialUrl]);

  if (!thumb) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-600">
        <ImageIcon className="w-5 h-5" />
      </div>
    );
  }

  return (
    <img
      src={thumb}
      alt="Preview"
      className="w-full h-full object-cover"
    />
  );
};

interface EditListTabProps {
  levels: KaizoLevel[];
  customPlayers: PlayerProfile[];
  isFirestoreLive: boolean;
  onToast: (msg: string) => void;
  onSelectPlayer?: (playerName: string) => void;
}

export const EditListTab: React.FC<EditListTabProps> = ({
  levels,
  customPlayers,
  isFirestoreLive,
  onToast,
  onSelectPlayer,
}) => {
  // Navigation between Levels, Players, and Changelog management
  const [activeSubTab, setActiveSubTab] = useState<'levels' | 'players' | 'changelog' | 'submissions' | 'access'>('levels');
  const [submissions, setSubmissions] = useState<ProofSubmission[]>([]);
  const [authorizedUsers, setAuthorizedUsers] = useState<User[]>([]);

  // List Helper Authentication State
  const [user, setUser] = useState<any>(null);
  const [playerName, setPlayerName] = useState('List Helper');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const isAdmin = user?.email === 'tomatosauceman500@gmail.com';
  const isHeadAdmin = user?.email?.toLowerCase() === 'tomatosauceman500@gmail.com';

  // Consolidated Levels Bundle Download State
  const [isDownloadingBundle, setIsDownloadingBundle] = useState(false);

  // Access Management Form State
  const [newHelperEmail, setNewHelperEmail] = useState('');
  const [newHelperName, setNewHelperName] = useState('');
  const [isAddingHelper, setIsAddingHelper] = useState(false);

  useEffect(() => {
    // Handle redirect result if returning from a sign-in flow
    getRedirectResult(auth).catch((err: any) => {
      console.error('Redirect sign-in error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        onToast('Error: Domain not authorized for redirect.');
      }
    });

    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const authorized = await isUserAuthorized(currentUser.email);
        setIsAuthorized(authorized);
        if (authorized) {
          const name = await getPlayerNameByEmail(currentUser.email);
          setPlayerName(name);
        }
      } else {
        setIsAuthorized(false);
      }
      setIsCheckingAuth(false);
    });
  }, []);

  useEffect(() => {
    if (isAdmin) {
      return subscribeToUsers(setAuthorizedUsers);
    }
  }, [isAdmin]);

  const handleSignIn = async () => {
    try {
      // First attempt with popup
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Popup sign-in failed, trying redirect...', err);
      
      // If popup is blocked or fails due to COOP/Cross-Origin policies, fallback to redirect
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request' || err.message?.includes('Cross-Origin-Opener-Policy')) {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirErr: any) {
          onToast(`Sign-in failed: ${redirErr.message}`);
        }
      } else {
        const errorMessage = err?.code === 'auth/unauthorized-domain' 
          ? 'Error: Domain not authorized in Firebase Console.' 
          : `Sign-in failed: ${err?.message || 'Unknown error'}`;
        onToast(errorMessage);
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    onToast('Logged out.');
  };

  const handleAddHelper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHelperEmail.trim() || !newHelperName.trim()) {
      onToast('Email and name are required.');
      return;
    }
    setIsAddingHelper(true);
    try {
      await updateAuthorizedUser(newHelperEmail, newHelperName, 'helper');
      await addChangelogItem(
        'Helper Access Granted',
        `Granted List Helper permissions to ${newHelperName.trim()} (${newHelperEmail.trim()})`,
        playerName,
        [
          {
            field: 'access',
            label: 'Helper Added',
            newValue: `${newHelperName.trim()} (${newHelperEmail.trim()})`,
            description: `Granted List Helper permissions to ${newHelperName.trim()}`,
            type: 'added'
          }
        ]
      );
      onToast(`Access granted to ${newHelperName} (${newHelperEmail})`);
      setNewHelperEmail('');
      setNewHelperName('');
    } catch (err) {
      onToast('Failed to add helper.');
    } finally {
      setIsAddingHelper(false);
    }
  };

  const handleRemoveHelper = async (email: string) => {
    try {
      await removeAuthorizedUser(email);
      await addChangelogItem(
        'Helper Access Revoked',
        `Revoked List Helper permissions for ${email}`,
        playerName,
        [
          {
            field: 'access',
            label: 'Helper Revoked',
            oldValue: email,
            description: `Revoked List Helper permissions for ${email}`,
            type: 'removed'
          }
        ]
      );
      onToast(`Revoked access for ${email}`);
    } catch (err) {
      onToast('Failed to revoke access.');
    }
  };

  const handleDownloadLevelsBundle = async () => {
    if (!isHeadAdmin) {
      onToast('Only the Head Admin is authorized to download the consolidated level file.');
      return;
    }

    setIsDownloadingBundle(true);
    try {
      let bundleData: LevelsBundleData | null = null;
      if (isFirestoreLive) {
        bundleData = await fetchLevelsBundle();
      }

      // If document is not yet found or offline, build bundle from current levels list without images
      if (!bundleData || !bundleData.levels || bundleData.levels.length === 0) {
        const sorted = [...levels].sort((a, b) => a.rank - b.rank);
        const levelsWithoutImages = sorted.map((lvl) => {
          const { thumbnailUrl: _omitted, ...rest } = lvl;
          return rest as KaizoLevel;
        });
        bundleData = {
          id: 'levels',
          description: 'Goober Dash Kaizo List - Consolidated Level Data (without images)',
          updatedAt: new Date().toISOString(),
          count: levelsWithoutImages.length,
          levels: levelsWithoutImages,
        };
      }

      const jsonString = JSON.stringify(bundleData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      downloadAnchor.download = `kaizo_levels_bundle_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(url);

      const count = bundleData.count || bundleData.levels?.length || 0;
      onToast(`Downloaded consolidated JSON file (${count} levels)!`);
    } catch (err: any) {
      console.error('Failed to download level bundle:', err);
      onToast('Error downloading consolidated level bundle JSON.');
    } finally {
      setIsDownloadingBundle(false);
    }
  };

  useEffect(() => {
    return subscribeToSubmissions(setSubmissions);
  }, []);

  // Search & Filter state for levels
  const [levelSearch, setLevelSearch] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedVerification, setSelectedVerification] = useState<'All' | 'Verified' | 'Unverified'>('All');
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);

  // Level Form States
  const [editName, setEditName] = useState('');
  const [editCreator, setEditCreator] = useState('');
  const [editVerifier, setEditVerifier] = useState('');
  const [editDirectPlayUrl, setEditDirectPlayUrl] = useState('');
  const [editDifficulty, setEditDifficulty] = useState<KaizoLevel['difficulty']>('Extreme Kaizo');
  const [editLength, setEditLength] = useState('0:50');
  const [editImageInputType, setEditImageInputType] = useState<'url' | 'file' | 'paste'>('url');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editImageModified, setEditImageModified] = useState(false);
  const [editVictors, setEditVictors] = useState<Victor[]>([]);

  // New Victor Input State
  const [newVictorName, setNewVictorName] = useState('');
  const [newVictorVideo, setNewVictorVideo] = useState('');
  const [newVictorIsVerifier, setNewVictorIsVerifier] = useState(false);
  const [newVictorIsWR, setNewVictorIsWR] = useState(false);
  const [newVictorVerifiedByCreator, setNewVictorVerifiedByCreator] = useState(false);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);

  // --- REORDER & ADD/REMOVE LEVELS MODE STATE ---
  const [isManageLevelsMode, setIsManageLevelsMode] = useState(false);
  const [reorderedLevelsList, setReorderedLevelsList] = useState<KaizoLevel[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedVictorIndex, setDraggedVictorIndex] = useState<number | null>(null);

  // Custom Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'level' | 'player';
    id: string;
    name: string;
    rank?: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add New Level Modal State
  const [isAddLevelModalOpen, setIsAddLevelModalOpen] = useState(false);
  const [addLevelName, setAddLevelName] = useState('');
  const [addLevelCreator, setAddLevelCreator] = useState('');
  const [addLevelPlacement, setAddLevelPlacement] = useState<number>(1);
  const [addLevelVerifier, setAddLevelVerifier] = useState('');
  const [addLevelPlayUrl, setAddLevelPlayUrl] = useState('');
  const [addLevelDifficulty, setAddLevelDifficulty] = useState<KaizoLevel['difficulty']>('Extreme Kaizo');
  const [addLevelImageInputType, setAddLevelImageInputType] = useState<'url' | 'file' | 'paste'>('url');
  const [addLevelImage, setAddLevelImage] = useState('');
  const [addLevelImagePreview, setAddLevelImagePreview] = useState<string | null>(null);
  const [addLevelLength, setAddLevelLength] = useState('0:50');
  const [isAddingLevel, setIsAddingLevel] = useState(false);

  // Players directory state
  const [playerSearch, setPlayerSearch] = useState('');
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerCountry, setNewPlayerCountry] = useState('');
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);

  // Edit Player profile state
  const [editingPlayer, setEditingPlayer] = useState<{ id: string; name: string; country?: string } | null>(null);
  const [editPlayerNameInput, setEditPlayerNameInput] = useState('');
  const [editPlayerIdInput, setEditPlayerIdInput] = useState('');
  const [editPlayerCountryInput, setEditPlayerCountryInput] = useState('');
  const [isUpdatingPlayer, setIsUpdatingPlayer] = useState(false);

  // Direct Add Completion Form State in Ranked Players subtab
  const [playerCompletionForms, setPlayerCompletionForms] = useState<
    Record<string, { mapName: string; isWR: boolean; proofUrl: string }>
  >({});
  const [isSubmittingDirect, setIsSubmittingDirect] = useState<string | null>(null);

  // Sync reorder list when entering manage mode
  useEffect(() => {
    if (isManageLevelsMode) {
      const sorted = [...levels].sort((a, b) => a.rank - b.rank);
      setReorderedLevelsList(sorted);
    }
  }, [isManageLevelsMode, levels]);

  // Aggregate total unique players across custom Firestore profiles, level victors, and mapping
  const allPlayersList = useMemo(() => {
    const pMap = new Map<string, { id: string; name: string; country?: string; completionsCount: number; points: number; hardestName?: string }>();

    customPlayers.forEach((cp) => {
      pMap.set(cp.id, {
        id: cp.id,
        name: cp.name,
        country: cp.country || '',
        completionsCount: 0,
        points: 0
      });
    });

    const verifiedPlacements = getVerifiedPlacements(levels);

    levels.forEach((lvl) => {
      const verifiedRank = verifiedPlacements.get(lvl.id);
      const basePts = verifiedRank ? getPointsForRank(verifiedRank) : 0;
      lvl.victors.forEach((v) => {
        const vName = getVictorName(v);
        const slug = v.id ? v.id.replace(/^vic-\d+-/, '').toLowerCase() : vName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const key = slug || vName.toLowerCase();

        let earnedPoints = basePts;
        if (basePts > 0) {
          if (v.isVerifier) earnedPoints += basePts * 0.10;
          if (v.isWorldRecord) earnedPoints += basePts * 0.15;
          earnedPoints = Math.round(earnedPoints * 100) / 100;
        } else {
          earnedPoints = 0;
        }

        const existing = pMap.get(key) || pMap.get(v.id);
        if (existing) {
          existing.completionsCount += 1;
          existing.points = Math.round((existing.points + earnedPoints) * 100) / 100;
          if (verifiedRank && !existing.hardestName) existing.hardestName = `${lvl.name} (#${verifiedRank})`;
        } else {
          pMap.set(key, {
            id: key,
            name: vName,
            completionsCount: 1,
            points: earnedPoints,
            hardestName: verifiedRank ? `${lvl.name} (#${verifiedRank})` : undefined
          });
        }
      });
    });

    return Array.from(pMap.values()).sort((a, b) => b.points - a.points);
  }, [customPlayers, levels]);

  // Start editing a level
  const handleStartEdit = (level: KaizoLevel) => {
    setEditingLevelId(level.id);
    setEditName(level.name);
    setEditCreator(level.creator || '');
    setEditVerifier(level.verifier || '');
    setEditDirectPlayUrl(level.directPlayUrl || '');
    setEditDifficulty(level.difficulty || 'Extreme Kaizo');
    setEditLength(level.length || '0:50');
    setEditImageUrl(level.thumbnailUrl || '');
    setEditImagePreview(level.thumbnailUrl || null);
    setEditImageModified(false);
    if (!level.thumbnailUrl) {
      fetchLevelThumbnail(level.id, level.rank, level.imageChunkId).then((thumb) => {
        if (thumb) {
          setEditImageUrl(thumb.startsWith('data:') ? '' : thumb);
          setEditImagePreview(thumb);
        }
      });
    }
    setEditImageInputType('url');
    setEditVictors(Array.isArray(level.victors) ? JSON.parse(JSON.stringify(level.victors)) : []);

    setNewVictorName('');
    setNewVictorVideo('');
    setNewVictorIsVerifier(false);
    setNewVictorIsWR(false);
    setNewVictorVerifiedByCreator(false);
  };

  const handleCancelEdit = () => {
    setEditingLevelId(null);
  };

  // Handle clipboard paste for level preview images
  const handlePasteImageToLevelPreview = (
    e: React.ClipboardEvent,
    onReady: (dataUrl: string) => void
  ) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const result = event.target?.result as string;
            if (result) {
              const img = new Image();
              img.src = result;
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxDim = 400;
                let width = img.width;
                let height = img.height;
                if (width > maxDim || height > maxDim) {
                  if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                  } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                  }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
                onReady(compressedDataUrl);
                onToast('Pasted image applied to level preview!');
              };
            }
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onToast('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        const img = new Image();
        img.src = result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 400; // Reduced from 800 for better optimization
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Lower quality (0.6) for much smaller document size
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
          setEditImagePreview(compressedDataUrl);
          setEditImageUrl(compressedDataUrl);
          setEditImageModified(true);
        };
      }
    };
    reader.readAsDataURL(file);
  };

  // Victors Management
  const handleAddVictorToLevel = () => {
    if (!newVictorName.trim()) {
      onToast('Player name cannot be empty!');
      return;
    }

    const normalizedNewName = newVictorName.trim().toLowerCase();
    const playerInDatabase = allPlayersList.find(
      (p) => p.name.trim().toLowerCase() === normalizedNewName
    );
    if (!playerInDatabase) {
      onToast(`Player "${newVictorName.trim()}" is not in the ranked players database. Please add them first.`);
      return;
    }

    const pSlug = newVictorName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const newVictor: Victor = {
      id: `vic-${Date.now()}-${pSlug}`,
      name: newVictorName.trim(),
      videoProofUrl: newVictorVideo.trim() || undefined,
      isVerifier: newVictorIsVerifier,
      isWorldRecord: newVictorIsWR,
      verifiedByCreator: newVictorVerifiedByCreator
    };

    setEditVictors([...editVictors, newVictor]);
    setNewVictorName('');
    setNewVictorVideo('');
    setNewVictorIsVerifier(false);
    setNewVictorIsWR(false);
    setNewVictorVerifiedByCreator(false);
    onToast(`Added completion for "${newVictorName.trim()}"`);
  };

  const handleRemoveVictor = (index: number) => {
    const victorToRemove = editVictors[index];
    const updated = editVictors.filter((_, i) => i !== index);
    setEditVictors(updated);
    onToast(`Removed completion entry for ${getVictorName(victorToRemove)}.`);
  };

  const handleUpdateVictorVideo = (index: number, url: string) => {
    const updated = [...editVictors];
    updated[index] = { ...updated[index], videoProofUrl: url.trim() || undefined };
    setEditVictors(updated);
  };

  const handleToggleVictorFlag = (index: number, flag: 'isVerifier' | 'isWorldRecord' | 'verifiedByCreator') => {
    const updated = [...editVictors];
    updated[index] = { ...updated[index], [flag]: !updated[index][flag] };
    setEditVictors(updated);
  };

  // Victor Drag & Drop Handlers
  const handleVictorDragStart = (index: number) => {
    setDraggedVictorIndex(index);
  };

  const handleVictorDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleVictorDrop = (targetIndex: number) => {
    if (draggedVictorIndex === null || draggedVictorIndex === targetIndex) return;
    const updated = [...editVictors];
    const [draggedItem] = updated.splice(draggedVictorIndex, 1);
    updated.splice(targetIndex, 0, draggedItem);
    setEditVictors(updated);
    setDraggedVictorIndex(null);
  };

  // Save changes for a level
  const handleSaveLevel = async (levelId: string) => {
    if (!editName.trim()) {
      onToast('Level name cannot be empty!');
      return;
    }

    setIsSaving(true);
    try {
      const currentLevel = levels.find((l) => l.id === levelId);
      const finalThumbnail = editImagePreview ? editImagePreview.trim() : null;

      const payload: Partial<KaizoLevel> = {
        name: editName.trim(),
        creator: editCreator.trim() || 'Unknown Creator',
        verifier: editVerifier.trim(),
        directPlayUrl: editDirectPlayUrl.trim() || 'https://jellycade.com/games/goober-dash',
        difficulty: editDifficulty,
        length: editLength.trim() || '0:50',
        victors: editVictors,
        rank: currentLevel?.rank,
        imageChunkId: currentLevel?.imageChunkId || (currentLevel?.rank ? `chunk-${Math.floor((currentLevel.rank - 1) / 10)}` : 'chunk-0'),
        ...(editImageModified ? { thumbnailUrl: finalThumbnail } : {})
      };

      // Calculate rich diff for changelog
      const changes: ChangeDetail[] = [];
      const addedVictors: Victor[] = [];
      const removedVictors: Victor[] = [];
      const updatedProofVictors: { name: string; oldUrl?: string; newUrl?: string }[] = [];

      if (currentLevel) {
        // Detailed Victors diffing (added / removed / proof link updated)
        const oldVictors = currentLevel.victors || [];
        const oldIds = new Set(oldVictors.map((v) => v.id));
        const oldNames = new Set(oldVictors.map((v) => getVictorName(v).trim().toLowerCase()));

        editVictors.forEach((nv) => {
          const nvName = getVictorName(nv).trim().toLowerCase();
          if (!oldIds.has(nv.id) && !oldNames.has(nvName)) {
            addedVictors.push(nv);
          } else {
            const match = oldVictors.find(
              (ov) => ov.id === nv.id || getVictorName(ov).trim().toLowerCase() === nvName
            );
            if (match && (match.videoProofUrl || '') !== (nv.videoProofUrl || '')) {
              updatedProofVictors.push({
                name: getVictorName(nv),
                oldUrl: match.videoProofUrl,
                newUrl: nv.videoProofUrl
              });
            }
          }
        });

        oldVictors.forEach((ov) => {
          const ovName = getVictorName(ov).trim().toLowerCase();
          const stillExists = editVictors.some(
            (nv) => nv.id === ov.id || getVictorName(nv).trim().toLowerCase() === ovName
          );
          if (!stillExists) {
            removedVictors.push(ov);
          }
        });

        // Add ChangeDetails for completions
        addedVictors.forEach((v) => {
          const vName = getVictorName(v);
          const flags: string[] = [];
          if (v.isVerifier) flags.push('Verifier');
          if (v.isWorldRecord) flags.push('WR');
          const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
          changes.push({
            field: 'victors',
            label: 'Completion Added',
            newValue: `${vName}${flagStr}${v.videoProofUrl ? ' (Proof linked)' : ''}`,
            description: `Added completion for ${vName}${flagStr}${v.videoProofUrl ? ` (Proof: ${v.videoProofUrl})` : ''}`,
            type: 'added'
          });
        });

        removedVictors.forEach((v) => {
          const vName = getVictorName(v);
          changes.push({
            field: 'victors',
            label: 'Completion Removed',
            oldValue: vName,
            description: `Removed completion record for ${vName}`,
            type: 'removed'
          });
        });

        updatedProofVictors.forEach((u) => {
          changes.push({
            field: 'victors_proof',
            label: 'Proof Link Updated',
            oldValue: u.oldUrl || 'None',
            newValue: u.newUrl || 'None',
            description: `Updated proof link for ${u.name}`,
            type: 'modified'
          });
        });

        // Level Title diffing
        if (currentLevel.name !== editName.trim()) {
          changes.push({
            field: 'name',
            label: 'Level Title',
            oldValue: currentLevel.name,
            newValue: editName.trim(),
            description: `Title changed from "${currentLevel.name}" to "${editName.trim()}"`,
            type: 'modified'
          });
        }

        // Creator Credits diffing
        if ((currentLevel.creator || '').trim() !== editCreator.trim()) {
          changes.push({
            field: 'creator',
            label: 'Creator Credits',
            oldValue: currentLevel.creator || 'None',
            newValue: editCreator.trim() || 'None',
            description: `Creator changed from "${currentLevel.creator || 'None'}" to "${editCreator.trim()}"`,
            type: 'modified'
          });
        }

        // Verifier status diffing
        if ((currentLevel.verifier || '').trim() !== editVerifier.trim()) {
          changes.push({
            field: 'verifier',
            label: 'Verifier',
            oldValue: currentLevel.verifier || 'Unverified',
            newValue: editVerifier.trim() || 'Unverified',
            description: `Verifier updated from "${currentLevel.verifier || 'Unverified'}" to "${editVerifier.trim() || 'Unverified'}"`,
            type: 'modified'
          });
        }

        // Difficulty Tier diffing
        if (currentLevel.difficulty !== editDifficulty) {
          changes.push({
            field: 'difficulty',
            label: 'Difficulty Tier',
            oldValue: currentLevel.difficulty,
            newValue: editDifficulty,
            description: `Difficulty reclassified from ${currentLevel.difficulty} to ${editDifficulty}`,
            type: 'modified'
          });
        }

        // Level Length diffing
        if ((currentLevel.length || '').trim() !== editLength.trim()) {
          changes.push({
            field: 'length',
            label: 'Level Length',
            oldValue: currentLevel.length || '0:50',
            newValue: editLength.trim() || '0:50',
            description: `Level length changed from ${currentLevel.length || '0:50'} to ${editLength.trim()}`,
            type: 'modified'
          });
        }

        // Direct Play URL diffing
        if ((currentLevel.directPlayUrl || '').trim() !== editDirectPlayUrl.trim()) {
          changes.push({
            field: 'directPlayUrl',
            label: 'Level Link',
            oldValue: currentLevel.directPlayUrl || 'None',
            newValue: editDirectPlayUrl.trim(),
            description: `Play link changed to "${editDirectPlayUrl.trim()}"`,
            type: 'modified'
          });
        }

        // Thumbnail diffing
        if (editImageModified) {
          changes.push({
            field: 'thumbnailUrl',
            label: 'Cover Image',
            oldValue: 'Previous Image',
            newValue: finalThumbnail ? 'Updated Image' : 'Removed',
            description: `Cover thumbnail updated for "${editName.trim()}"`,
            type: 'modified'
          });
        }
      }

      // Determine human-friendly action & description
      let action = 'Level Details Updated';
      let description = `Updated level "${editName.trim()}"`;

      if (addedVictors.length > 0) {
        action = 'Completion Added';
        const playerNamesStr = addedVictors.map((v) => getVictorName(v)).join(', ');
        if (changes.length === addedVictors.length) {
          description = `Added completion for ${playerNamesStr} on "${editName.trim()}" (Rank #${currentLevel?.rank ?? 'N/A'})`;
        } else {
          description = `Added completion for ${playerNamesStr} and updated level details on "${editName.trim()}"`;
        }
      } else if (removedVictors.length > 0 && changes.length === removedVictors.length) {
        action = 'Completion Removed';
        const playerNamesStr = removedVictors.map((v) => getVictorName(v)).join(', ');
        description = `Removed completion for ${playerNamesStr} from "${editName.trim()}"`;
      } else if (updatedProofVictors.length > 0 && changes.length === updatedProofVictors.length) {
        action = 'Proof Updated';
        description = `Updated proof link for ${updatedProofVictors.map((u) => u.name).join(', ')} on "${editName.trim()}"`;
      } else if (currentLevel && currentLevel.name !== editName.trim() && changes.length === 1) {
        action = 'Level Renamed';
        description = `Renamed level from "${currentLevel.name}" to "${editName.trim()}"`;
      } else if (currentLevel && currentLevel.difficulty !== editDifficulty && changes.length === 1) {
        action = 'Difficulty Updated';
        description = `Reclassified "${editName.trim()}" from ${currentLevel.difficulty} to ${editDifficulty}`;
      } else if (currentLevel && (currentLevel.verifier || '').trim() !== editVerifier.trim() && changes.length === 1) {
        action = 'Verifier Updated';
        description = `Updated verifier for "${editName.trim()}" to "${editVerifier.trim() || 'Unverified'}"`;
      } else if (currentLevel && (currentLevel.creator || '').trim() !== editCreator.trim() && changes.length === 1) {
        action = 'Creator Updated';
        description = `Updated creator for "${editName.trim()}" to "${editCreator.trim()}"`;
      } else if (changes.length > 0) {
        const labels = Array.from(new Set(changes.map((c) => c.label)));
        description = `Updated "${editName.trim()}": ${labels.join(', ')}`;
      }

      await updateLevelData(levelId, payload);
      if (editImageModified) {
        notifyThumbnailUpdated(levelId, finalThumbnail);
      }
      await addChangelogItem(
        action,
        description,
        playerName,
        changes.length > 0 ? changes : undefined,
        { levelId, levelName: editName.trim() }
      );

      onToast(`Successfully updated "${editName.trim()}".`);
      setEditingLevelId(null);
    } catch (err) {
      console.error(err);
      onToast('Failed to save changes. Check console.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- REORDER & ADD/DELETE LEVEL HANDLERS ---
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...reorderedLevelsList];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setReorderedLevelsList(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index >= reorderedLevelsList.length - 1) return;
    const updated = [...reorderedLevelsList];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setReorderedLevelsList(updated);
  };

  const handleJumpToRank = (index: number, newRankStr: string) => {
    const newRank = parseInt(newRankStr, 10);
    if (isNaN(newRank) || newRank < 1 || newRank > reorderedLevelsList.length) return;
    const targetIdx = newRank - 1;
    if (targetIdx === index) return;

    const updated = [...reorderedLevelsList];
    const [item] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, item);
    setReorderedLevelsList(updated);
  };

  // HTML5 Drag & Drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const updated = [...reorderedLevelsList];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, draggedItem);
    setReorderedLevelsList(updated);
    setDraggedIndex(null);
  };

  // Delete triggers (open custom modal instead of window.confirm)
  const handleDeleteLevelPrompt = (levelId: string, levelName: string, rankNum: number) => {
    setDeleteTarget({
      type: 'level',
      id: levelId,
      name: levelName,
      rank: rankNum
    });
  };

  const handleDeletePlayerPrompt = (playerId: string, playerName: string) => {
    setDeleteTarget({
      type: 'player',
      id: playerId,
      name: playerName
    });
  };

  // Perform actual deletion after user confirms in modal
  const confirmDeleteAction = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'level') {
        const deleteChanges: ChangeDetail[] = [
          {
            field: 'level',
            label: 'Level Deleted',
            oldValue: deleteTarget.name,
            description: `Permanently removed level "${deleteTarget.name}" (Rank #${deleteTarget.rank || 'N/A'})`,
            type: 'removed'
          }
        ];
        await deleteLevelFromFirestore(deleteTarget.id);
        await addChangelogItem(
          'Delete Level',
          `Deleted level "${deleteTarget.name}"`,
          playerName,
          deleteChanges,
          { levelId: deleteTarget.id, levelName: deleteTarget.name }
        );
        const remaining = (reorderedLevelsList.length > 0 ? reorderedLevelsList : levels).filter(
          (l) => l.id !== deleteTarget.id
        );
        setReorderedLevelsList(remaining);
        await saveReorderedLevelsToFirestore(remaining);
        onToast(`Deleted "${deleteTarget.name}" from database.`);
      } else if (deleteTarget.type === 'player') {
        const playerChanges: ChangeDetail[] = [
          {
            field: 'player',
            label: 'Player Removed',
            oldValue: deleteTarget.name,
            description: `Removed player "${deleteTarget.name}" from registry`,
            type: 'removed'
          }
        ];
        await deletePlayerFromFirestore(deleteTarget.id);
        await addChangelogItem(
          'Delete Player',
          `Deleted player "${deleteTarget.name}"`,
          playerName,
          playerChanges
        );
        onToast(`Player "${deleteTarget.name}" removed from database.`);
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      onToast(`Failed to delete ${deleteTarget.type}. Check console.`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Commit reordered placements to Firestore
  const handleSaveReorderedPlacements = async () => {
    if (!isFirestoreLive) {
      onToast('Error: Cannot save reorder while offline or un-synced from Firestore.');
      return;
    }
    setIsSavingOrder(true);
    try {
      // Detect exactly which levels moved and their previous vs new ranks
      const movedLevels: {
        id: string;
        name: string;
        oldRank: number;
        newRank: number;
        delta: number;
      }[] = [];

      reorderedLevelsList.forEach((lvl, idx) => {
        const newRank = idx + 1;
        const orig = levels.find((l) => l.id === lvl.id);
        const oldRank = orig ? orig.rank : lvl.rank;
        if (oldRank !== newRank) {
          movedLevels.push({
            id: lvl.id,
            name: lvl.name,
            oldRank,
            newRank,
            delta: oldRank - newRank // positive if moved up (e.g. 10 -> 4 is +6)
          });
        }
      });

      await saveReorderedLevelsToFirestore(reorderedLevelsList);

      if (movedLevels.length > 0) {
        // Sort by displacement magnitude so the primary mover is front and center
        const sortedMoved = [...movedLevels].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
        const primaryMoved = sortedMoved[0];

        let action = 'Level Moved';
        let description = `Moved "${primaryMoved.name}" from Rank #${primaryMoved.oldRank} to Rank #${primaryMoved.newRank}`;

        if (sortedMoved.length === 2 && Math.abs(sortedMoved[0].delta) === 1 && Math.abs(sortedMoved[1].delta) === 1) {
          action = 'Levels Swapped';
          description = `Swapped "${sortedMoved[0].name}" (Rank #${sortedMoved[0].oldRank} → #${sortedMoved[0].newRank}) and "${sortedMoved[1].name}" (Rank #${sortedMoved[1].oldRank} → #${sortedMoved[1].newRank})`;
        } else if (Math.abs(primaryMoved.delta) > 0) {
          const dir = primaryMoved.delta > 0 ? `up ${primaryMoved.delta}` : `down ${Math.abs(primaryMoved.delta)}`;
          description = `Moved "${primaryMoved.name}" from Rank #${primaryMoved.oldRank} to Rank #${primaryMoved.newRank} (${dir} ${Math.abs(primaryMoved.delta) === 1 ? 'spot' : 'spots'})`;
        }

        const reorderChanges: ChangeDetail[] = sortedMoved.map((m) => {
          const dirStr = m.delta > 0 ? `↑ ${m.delta}` : `↓ ${Math.abs(m.delta)}`;
          return {
            field: 'rank',
            label: 'Placement Moved',
            oldValue: `#${m.oldRank}`,
            newValue: `#${m.newRank}`,
            description: `"${m.name}" moved from Rank #${m.oldRank} to Rank #${m.newRank} (${dirStr})`,
            type: 'modified'
          };
        });

        await addChangelogItem(
          action,
          description,
          playerName,
          reorderChanges,
          { levelId: primaryMoved.id, levelName: primaryMoved.name }
        );
      } else {
        await addChangelogItem(
          'Reorder Checked',
          'Confirmed level placement order with no rank changes',
          playerName
        );
      }

      onToast('Successfully saved new level placements!');
      setIsManageLevelsMode(false);
    } catch (err) {
      console.error(err);
      onToast('Failed to save level order.');
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Add Brand New Level Handler
  const handleCreateNewLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addLevelName.trim()) {
      onToast('Level Name is required!');
      return;
    }
    if (!addLevelCreator.trim()) {
      onToast('Creator Name is required!');
      return;
    }
    if (!addLevelPlacement || addLevelPlacement < 1) {
      onToast('Placement must be a valid rank number (e.g. 1)!');
      return;
    }

    setIsAddingLevel(true);
    try {
      const newLevelPayload: Omit<KaizoLevel, 'id' | 'rank'> = {
        name: addLevelName.trim(),
        creator: addLevelCreator.trim(),
        verifier: addLevelVerifier.trim(),
        directPlayUrl: addLevelPlayUrl.trim() || 'https://jellycade.com/games/goober-dash',
        difficulty: addLevelDifficulty,
        length: addLevelLength.trim() || '0:50',
        thumbnailUrl: addLevelImagePreview || addLevelImage.trim() || null,
        victors: []
      };

      const addChanges: ChangeDetail[] = [
        {
          field: 'level',
          label: 'New Level Placement',
          newValue: `#${addLevelPlacement} - ${addLevelName.trim()}`,
          description: `Added level at Rank #${addLevelPlacement}`,
          type: 'added'
        },
        {
          field: 'creator',
          label: 'Creator',
          newValue: addLevelCreator.trim(),
          description: `Creator: ${addLevelCreator.trim()}`,
          type: 'added'
        },
        {
          field: 'difficulty',
          label: 'Difficulty Tier',
          newValue: addLevelDifficulty,
          description: `Difficulty: ${addLevelDifficulty}`,
          type: 'added'
        }
      ];

      if (addLevelVerifier.trim()) {
        addChanges.push({
          field: 'verifier',
          label: 'Verifier',
          newValue: addLevelVerifier.trim(),
          description: `Verifier: ${addLevelVerifier.trim()}`,
          type: 'added'
        });
      }
      if (addLevelLength.trim()) {
        addChanges.push({
          field: 'length',
          label: 'Level Length',
          newValue: addLevelLength.trim(),
          description: `Length: ${addLevelLength.trim()}`,
          type: 'added'
        });
      }
      if (addLevelPlayUrl.trim()) {
        addChanges.push({
          field: 'directPlayUrl',
          label: 'Level Link',
          newValue: addLevelPlayUrl.trim(),
          description: `Direct Link: ${addLevelPlayUrl.trim()}`,
          type: 'added'
        });
      }

      const newId = await addLevelToFirestore(newLevelPayload, addLevelPlacement, levels);
      await addChangelogItem(
        'Level Added',
        `Added new level "${addLevelName.trim()}" placed at Rank #${addLevelPlacement} (${addLevelDifficulty}) by ${addLevelCreator.trim()}`,
        playerName,
        addChanges,
        { levelId: newId, levelName: addLevelName.trim() }
      );

      onToast(`Successfully added "${addLevelName.trim()}" at Rank #${addLevelPlacement}!`);
      setAddLevelName('');
      setAddLevelCreator('');
      setAddLevelVerifier('');
      setAddLevelPlayUrl('');
      setAddLevelImage('');
      setAddLevelImagePreview(null);
      setAddLevelLength('0:50');
      setIsAddLevelModalOpen(false);
    } catch (err) {
      console.error(err);
      onToast('Failed to add new level.');
    } finally {
      setIsAddingLevel(false);
    }
  };

  // Handle Add Player
  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) {
      onToast('Player name is required!');
      return;
    }

    setIsAddingPlayer(true);
    try {
      const pSlug = newPlayerName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const playerId = pSlug || `player-${Date.now()}`;

      await addPlayerToFirestore({
        id: playerId,
        name: newPlayerName.trim(),
        country: newPlayerCountry.trim().toUpperCase() || '',
        addedAt: new Date().toISOString()
      });

      const playerAddChanges: ChangeDetail[] = [
        {
          field: 'player',
          label: 'Player Profile',
          newValue: newPlayerName.trim(),
          description: `Added "${newPlayerName.trim()}" to ranked players list`,
          type: 'added'
        }
      ];

      await addChangelogItem(
        'Add Player',
        `Added new player "${newPlayerName.trim()}"`,
        playerName,
        playerAddChanges
      );

      onToast(`Player "${newPlayerName.trim()}" added to database!`);
      setNewPlayerName('');
      setNewPlayerCountry('');
      setIsAddPlayerModalOpen(false);
    } catch (err) {
      console.error(err);
      onToast('Failed to add player.');
    } finally {
      setIsAddingPlayer(false);
    }
  };

  const handleStartEditPlayer = (p: { id: string; name: string; country?: string }) => {
    setEditingPlayer(p);
    setEditPlayerNameInput(p.name);
    setEditPlayerIdInput(p.id);
    setEditPlayerCountryInput(p.country || '');
  };

  const handleSavePlayerIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    if (!editPlayerNameInput.trim()) {
      onToast('Player name is required.');
      return;
    }
    if (!editPlayerIdInput.trim()) {
      onToast('Player ID is required.');
      return;
    }

    setIsUpdatingPlayer(true);
    try {
      const oldId = editingPlayer.id;
      const oldName = editingPlayer.name;
      const newName = editPlayerNameInput.trim();
      const newId = editPlayerIdInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const newCountry = editPlayerCountryInput.trim().toUpperCase();

      await updatePlayerIdentity(oldId, oldName, newId, newName, newCountry);

      const changes: ChangeDetail[] = [];
      if (oldName !== newName) {
        changes.push({
          field: 'name',
          label: 'Player Name',
          oldValue: oldName,
          newValue: newName,
          description: `Name updated from "${oldName}" to "${newName}"`,
          type: 'modified'
        });
      }
      if (oldId !== newId) {
        changes.push({
          field: 'id',
          label: 'Player ID',
          oldValue: oldId,
          newValue: newId,
          description: `Player ID updated from "${oldId}" to "${newId}"`,
          type: 'modified'
        });
      }
      if ((editingPlayer.country || '') !== newCountry) {
        changes.push({
          field: 'country',
          label: 'Country',
          oldValue: editingPlayer.country || 'None',
          newValue: newCountry || 'None',
          description: `Country updated to "${newCountry || 'None'}"`,
          type: 'modified'
        });
      }

      let description = `Updated player profile for "${newName}"`;
      if (oldName !== newName && oldId !== newId) {
        description = `Renamed player "${oldName}" to "${newName}" and changed ID from "${oldId}" to "${newId}" across all level records`;
      } else if (oldName !== newName) {
        description = `Renamed player "${oldName}" to "${newName}" across all level records`;
      } else if (oldId !== newId) {
        description = `Updated player ID for "${newName}" from "${oldId}" to "${newId}" across all level records`;
      }

      await addChangelogItem(
        'Player Updated',
        description,
        playerName,
        changes.length > 0 ? changes : undefined
      );

      onToast(`Successfully updated player "${newName}" across the list!`);
      setEditingPlayer(null);
    } catch (err) {
      console.error(err);
      onToast('Failed to update player profile.');
    } finally {
      setIsUpdatingPlayer(false);
    }
  };

  const handleDeletePlayer = (playerId: string, playerName: string) => {
    handleDeletePlayerPrompt(playerId, playerName);
  };

  // Directly add completion for a player by map name from the Ranked Players subtab
  const handleAddDirectCompletion = async (
    targetPlayerName: string,
    targetPlayerId: string,
    mapNameInput: string,
    isWR: boolean,
    proofUrl?: string
  ) => {
    if (!mapNameInput.trim()) {
      onToast('Please enter a map name.');
      return;
    }

    const trimmedInput = mapNameInput.trim().toLowerCase();
    // 1. Exact name match
    let targetLevel = levels.find((lvl) => lvl.name.trim().toLowerCase() === trimmedInput);

    // 2. Exact code / ID match
    if (!targetLevel) {
      targetLevel = levels.find(
        (lvl) =>
          lvl.id.toLowerCase() === trimmedInput ||
          getLevelIdFromLink(lvl.directPlayUrl).toLowerCase() === trimmedInput
      );
    }

    // 3. Includes name match
    if (!targetLevel) {
      targetLevel = levels.find((lvl) => lvl.name.trim().toLowerCase().includes(trimmedInput));
    }

    if (!targetLevel) {
      onToast(`Map "${mapNameInput.trim()}" not found in list. Please check the spelling.`);
      return;
    }

    const existingVictors = targetLevel.victors || [];
    const targetKey = targetPlayerName.trim().toLowerCase();
    const alreadyCompleted = existingVictors.some(
      (v) => getVictorName(v).trim().toLowerCase() === targetKey
    );

    if (alreadyCompleted) {
      onToast(`${targetPlayerName} already has a completion recorded on "${targetLevel.name}".`);
      return;
    }

    setIsSubmittingDirect(targetPlayerId);
    try {
      const pSlug = targetPlayerName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const newVictor: Victor = {
        id: `vic-${Date.now()}-${pSlug}`,
        name: targetPlayerName.trim(),
        videoProofUrl: proofUrl?.trim() || undefined,
        isWorldRecord: isWR,
        isVerifier: false
      };

      const updatedVictors = [...existingVictors, newVictor];
      await updateLevelData(targetLevel.id, { victors: updatedVictors });

      const wrNote = isWR ? ' [World Record]' : '';
      await addChangelogItem(
        'Completion Added',
        `Added completion for ${targetPlayerName.trim()} on "${targetLevel.name}" (Rank #${targetLevel.rank})${wrNote}`,
        playerName,
        [
          {
            field: 'victor',
            label: 'Completion Added',
            newValue: `${targetPlayerName.trim()}${wrNote}${proofUrl?.trim() ? ' (Proof linked)' : ''}`,
            description: `Added completion directly for ${targetPlayerName.trim()} on "${targetLevel.name}" (Rank #${targetLevel.rank})${wrNote}`,
            type: 'added'
          }
        ],
        { levelId: targetLevel.id, levelName: targetLevel.name }
      );

      // Reset form for this player
      setPlayerCompletionForms((prev) => ({
        ...prev,
        [targetPlayerId]: { mapName: '', isWR: false, proofUrl: '' }
      }));

      onToast(`Successfully added completion for ${targetPlayerName} on "${targetLevel.name}"!`);
    } catch (err) {
      console.error(err);
      onToast('Failed to add completion. Check console.');
    } finally {
      setIsSubmittingDirect(null);
    }
  };

  // Filter levels
  const filteredLevels = levels.filter((lvl) => {
    if (levelSearch.trim()) {
      const q = levelSearch.toLowerCase();
      const calculatedId = getLevelIdFromLink(lvl.directPlayUrl).toLowerCase();
      const match =
        lvl.name.toLowerCase().includes(q) ||
        lvl.creator.toLowerCase().includes(q) ||
        lvl.verifier.toLowerCase().includes(q) ||
        calculatedId.includes(q) ||
        lvl.rank.toString() === q;
      if (!match) return false;
    }
    if (selectedDifficulty !== 'All' && lvl.difficulty !== selectedDifficulty) {
      return false;
    }
    if (selectedVerification === 'Verified' && !isLevelVerified(lvl)) {
      return false;
    }
    if (selectedVerification === 'Unverified' && isLevelVerified(lvl)) {
      return false;
    }
    return true;
  });

  // Filter players
  const filteredPlayers = allPlayersList.filter((p) => {
    if (!playerSearch.trim()) return true;
    const q = playerSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
  });

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-[#111927] border border-amber-500/30 rounded-2xl shadow-2xl space-y-6 text-center animate-in fade-in">
        <div className="mx-auto w-16 h-16 bg-amber-500/10 border border-amber-400/30 rounded-2xl flex items-center justify-center text-amber-400 shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white font-heading">
            List Helper Access Required
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Database tools, level editing, and submission verification are restricted to authorized List Helpers. Please sign in with your authorized account.
          </p>
        </div>

        <button
          onClick={handleSignIn}
          className="w-full py-2.5 px-4 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
        >
          <Key className="w-4 h-4" />
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Header & Navigation Banner */}
      <div className="bg-[#111927] border border-amber-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-amber-400/10 border border-amber-400/30 rounded-xl text-amber-400">
                <Database className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight font-heading flex items-center gap-2">
                  List Helper Tools
                </h1>
                <p className="text-xs text-slate-400">
                  Manage levels, creator credits, placements, video proof, and ranked player profiles in real-time.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-800 text-xs shrink-0 flex-wrap">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Helper: {playerName}</span>
            </div>
            
            <button
              type="button"
              onClick={handleLogout}
              className="px-2.5 py-1 text-[11px] font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors flex items-center gap-1"
              title="Log out"
            >
              <LogOut className="w-3 h-3 text-rose-400" />
              <span>Log Out</span>
            </button>

            <span className="text-slate-500">|</span>
            <span className="text-amber-400 font-mono font-bold">
              {levels.length} Levels
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-amber-400 font-mono font-bold">
              {allPlayersList.length} Players
            </span>
          </div>
        </div>

        {/* Sub-tab Toggle Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('levels')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                activeSubTab === 'levels'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Edit Levels ({levels.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('players')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                activeSubTab === 'players'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Ranked Players ({allPlayersList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('changelog')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                activeSubTab === 'changelog'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Changelog</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('submissions')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                activeSubTab === 'submissions'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Pending Submissions ({submissions.filter(s => s.status === 'pending').length})</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveSubTab('access')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                  activeSubTab === 'access'
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Manage Access</span>
              </button>
            )}
          </div>

          {activeSubTab === 'levels' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAddLevelPlacement(1);
                  setIsAddLevelModalOpen(true);
                }}
                className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Level</span>
              </button>

              <button
                type="button"
                onClick={() => setIsManageLevelsMode(!isManageLevelsMode)}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-2 ${
                  isManageLevelsMode
                    ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-400/20'
                    : 'bg-slate-800 text-amber-400 hover:text-amber-300 border-amber-400/30'
                }`}
              >
                <ArrowUpDown className="w-4 h-4" />
                <span>{isManageLevelsMode ? 'Exit Reorder Mode' : 'Add or Remove Levels & Reorder'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SUB-TAB 1: EDIT LEVELS */}
      {activeSubTab === 'levels' && (
        <div className="space-y-6">
          {/* REORDER & MANAGE PLACEMENTS INTERACTIVE MODE */}
          {isManageLevelsMode ? (
            <div className="bg-[#111927] border-2 border-amber-400/60 rounded-2xl p-6 shadow-2xl space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white font-heading flex items-center gap-2">
                    <Move className="w-5 h-5 text-amber-400" />
                    Reorder Placements & Manage Levels
                  </h3>
                  <p className="text-xs text-slate-400">
                    Drag levels to reorder them, use up/down arrows, jump directly to a rank number, or delete levels.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAddLevelPlacement(1);
                      setIsAddLevelModalOpen(true);
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Level</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveReorderedPlacements}
                    disabled={isSavingOrder}
                    className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-400/20"
                  >
                    {isSavingOrder ? 'Saving Ranks...' : 'Save Reordered Placements'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsManageLevelsMode(false)}
                    className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Reordering Drag & Drop List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                {reorderedLevelsList.map((lvl, index) => (
                  <div
                    key={lvl.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index)}
                    className={`bg-slate-900/90 border rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs transition-all ${
                      draggedIndex === index
                        ? 'border-amber-400 bg-amber-400/10 opacity-60'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-amber-400 p-1">
                        <GripVertical className="w-4 h-4" />
                      </span>

                      <span className="font-heading font-black text-xs text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20 shrink-0">
                        Rank #{index + 1}
                      </span>

                      <div className="truncate">
                        <span className="font-extrabold text-white text-sm block truncate">{lvl.name}</span>
                        <span className="text-[11px] text-slate-400">by {lvl.creator}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Jump to Rank Input */}
                      <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-500 font-medium">Rank:</span>
                        <input
                          type="number"
                          min={1}
                          max={reorderedLevelsList.length}
                          defaultValue={index + 1}
                          key={`rank-${lvl.id}-${index + 1}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleJumpToRank(index, (e.target as HTMLInputElement).value);
                            }
                          }}
                          onBlur={(e) => handleJumpToRank(index, e.target.value)}
                          className="w-12 bg-transparent text-center font-mono font-bold text-amber-400 text-xs focus:outline-none"
                        />
                      </div>

                      {/* Move Up / Move Down */}
                      <button
                        type="button"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 bg-slate-950 rounded-lg border border-slate-800"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === reorderedLevelsList.length - 1}
                        className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 bg-slate-950 rounded-lg border border-slate-800"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Level Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteLevelPrompt(lvl.id, lvl.name, index + 1)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                        title="Delete level from database"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Search & Filter Controls */
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#111927] p-4 rounded-xl border border-slate-800">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search level name, creator, verifier, rank #, code..."
                  value={levelSearch}
                  onChange={(e) => setLevelSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Status:</span>
                  <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-700/80">
                    {(['All', 'Verified', 'Unverified'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setSelectedVerification(status)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                          selectedVerification === status
                            ? status === 'Unverified'
                              ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/30'
                              : status === 'Verified'
                              ? 'bg-emerald-500/20 text-emerald-300 shadow-sm border border-emerald-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 shadow-sm border border-indigo-500/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Difficulty:</span>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  >
                    <option value="All">All Difficulties</option>
                    <option value="Impossible Kaizo">Impossible Kaizo</option>
                    <option value="Silent Kaizo">Silent Kaizo</option>
                    <option value="Extreme Kaizo">Extreme Kaizo</option>
                    <option value="Insane Kaizo">Insane Kaizo</option>
                    <option value="High Kaizo">High Kaizo</option>
                    <option value="Mid Kaizo">Mid Kaizo</option>
                    <option value="Entry Kaizo">Entry Kaizo</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Levels List */}
          {!isManageLevelsMode && (
            <div className="space-y-4">
              {filteredLevels.length === 0 ? (
                <div className="p-12 text-center bg-[#111927] border border-slate-800 rounded-2xl text-slate-400 space-y-2">
                  <p className="text-sm">No levels match your search query.</p>
                  <button
                    onClick={() => {
                      setLevelSearch('');
                      setSelectedDifficulty('All');
                      setSelectedVerification('All');
                    }}
                    className="text-xs text-amber-400 hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                filteredLevels.map((lvl) => {
                  const isEditing = editingLevelId === lvl.id;
                  const isJustSaved = saveSuccessId === lvl.id;

                  return (
                    <div
                      key={lvl.id}
                      className={`bg-[#111927] border rounded-2xl p-4 sm:p-5 transition-all duration-200 ${
                        isEditing
                          ? 'border-amber-400 shadow-xl shadow-amber-400/10 bg-[#141e2e]'
                          : isJustSaved
                          ? 'border-emerald-500/80 bg-emerald-950/10'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {!isEditing ? (
                        /* Display Row Mode */
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start sm:items-center gap-4">
                            <span className="font-heading font-black text-lg text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-xl px-3 py-1.5 min-w-[50px] text-center shrink-0">
                              #{lvl.rank}
                            </span>

                            <div className="w-20 h-12 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shrink-0 relative group">
                              <EditListLevelThumb levelId={lvl.id} rank={lvl.rank} chunkId={lvl.imageChunkId} initialUrl={lvl.thumbnailUrl} />
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-extrabold text-white text-base font-heading">
                                  {lvl.name}
                                </h3>
                                <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60">
                                  {lvl.difficulty}
                                </span>
                                {isLevelVerified(lvl) ? (
                                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                    Verified
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                                    Unverified (0 pts)
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                                <span>Creator: <strong className="text-slate-200">{lvl.creator}</strong></span>
                                <span>·</span>
                                <span>
                                  Verifier:{' '}
                                  <strong className={isLevelVerified(lvl) ? "text-slate-200" : "text-amber-400/90 italic"}>
                                    {isLevelVerified(lvl) ? lvl.verifier : 'Unverified'}
                                  </strong>
                                </span>
                                <span>·</span>
                                <span className="font-mono text-amber-400 font-semibold">Level ID: {getLevelIdFromLink(lvl.directPlayUrl)}</span>
                                <span>·</span>
                                <span>{lvl.victors.length} Completions</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                            {isJustSaved && (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold px-2.5 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20 animate-in fade-in">
                                <Check className="w-3.5 h-3.5" />
                                Saved!
                              </span>
                            )}
                            <button
                              onClick={() => handleStartEdit(lvl)}
                              className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit Level</span>
                            </button>
                            <button
                              onClick={() => handleDeleteLevelPrompt(lvl.id, lvl.name, lvl.rank)}
                              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors border border-transparent hover:border-red-500/20"
                              title="Delete Level"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Full Edit Mode Form */
                        <div className="space-y-6 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-heading font-black text-amber-400 text-sm bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
                                Editing Rank #{lvl.rank}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">
                                ID: {lvl.id}
                              </span>
                            </div>
                            <button
                              onClick={handleCancelEdit}
                              className="text-slate-400 hover:text-white text-xs p-1 rounded-lg hover:bg-slate-800"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-200 mb-1 uppercase tracking-wider">
                                Level Title
                              </label>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white"
                                placeholder="Level title"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-200 mb-1 uppercase tracking-wider">
                                Creator(s)
                              </label>
                              <input
                                type="text"
                                value={editCreator}
                                onChange={(e) => setEditCreator(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white"
                                placeholder="Creator name"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-200 mb-1 uppercase tracking-wider">
                                Verifier <span className="text-slate-500 font-normal lowercase">(blank = unverified)</span>
                              </label>
                              <input
                                type="text"
                                value={editVerifier}
                                onChange={(e) => setEditVerifier(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white"
                                placeholder="Leave blank if unverified"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-slate-200 mb-1 uppercase tracking-wider">
                                Direct Play URL / Link
                              </label>
                              <input
                                type="text"
                                value={editDirectPlayUrl}
                                onChange={(e) => setEditDirectPlayUrl(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-mono"
                                placeholder="https://jellycade.com/games/goober-dash?g_play=..."
                              />
                              <p className="text-[11px] text-amber-400/90 font-mono mt-1">
                                Calculated Level ID: <strong className="text-white">{getLevelIdFromLink(editDirectPlayUrl)}</strong>
                              </p>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-200 mb-1 uppercase tracking-wider">
                                Difficulty Rating
                              </label>
                              <select
                                value={editDifficulty}
                                onChange={(e) => setEditDifficulty(e.target.value as KaizoLevel['difficulty'])}
                                className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white"
                              >
                                <option value="Impossible Kaizo">Impossible Kaizo</option>
                                <option value="Silent Kaizo">Silent Kaizo</option>
                                <option value="Extreme Kaizo">Extreme Kaizo</option>
                                <option value="Insane Kaizo">Insane Kaizo</option>
                                <option value="High Kaizo">High Kaizo</option>
                                <option value="Mid Kaizo">Mid Kaizo</option>
                                <option value="Entry Kaizo">Entry Kaizo</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-200 mb-1 uppercase tracking-wider">
                                Estimated Duration
                              </label>
                              <div className="relative">
                                <Clock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  value={editLength}
                                  onChange={(e) => setEditLength(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white"
                                  placeholder="e.g. 0:50"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Thumbnail Upload Section */}
                          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                                Preview Image / Screenshot
                              </label>

                              <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => setEditImageInputType('url')}
                                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                                    editImageInputType === 'url' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                                  }`}
                                >
                                  Image URL
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditImageInputType('file')}
                                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                                    editImageInputType === 'file' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                                  }`}
                                >
                                  Upload File
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditImageInputType('paste')}
                                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                                    editImageInputType === 'paste' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                                  }`}
                                >
                                  Paste Image
                                </button>
                              </div>
                            </div>

                            {editImageInputType === 'url' ? (
                              <input
                                type="url"
                                value={editImageUrl}
                                onPaste={(e) =>
                                  handlePasteImageToLevelPreview(e, (dataUrl) => {
                                    setEditImagePreview(dataUrl);
                                    setEditImageUrl(dataUrl);
                                    setEditImageModified(true);
                                  })
                                }
                                onChange={(e) => {
                                  setEditImageUrl(e.target.value);
                                  setEditImagePreview(e.target.value || null);
                                  setEditImageModified(true);
                                }}
                                placeholder="https://i.imgur.com/example.png or paste image directly"
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                              />
                            ) : editImageInputType === 'file' ? (
                              <label
                                onPaste={(e) =>
                                  handlePasteImageToLevelPreview(e, (dataUrl) => {
                                    setEditImagePreview(dataUrl);
                                    setEditImageUrl(dataUrl);
                                    setEditImageModified(true);
                                  })
                                }
                                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-amber-400/60 rounded-xl bg-slate-900/50 cursor-pointer text-center"
                              >
                                <Upload className="w-5 h-5 text-amber-400 mb-1" />
                                <span className="text-xs text-slate-200 font-medium">Click to select image file or press Ctrl+V to paste</span>
                                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                              </label>
                            ) : (
                              <div
                                tabIndex={0}
                                onPaste={(e) =>
                                  handlePasteImageToLevelPreview(e, (dataUrl) => {
                                    setEditImagePreview(dataUrl);
                                    setEditImageUrl(dataUrl);
                                    setEditImageModified(true);
                                  })
                                }
                                className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-amber-400/70 hover:border-amber-400 focus:border-amber-400 rounded-xl bg-amber-400/10 cursor-pointer text-center outline-none"
                              >
                                <Upload className="w-6 h-6 text-amber-400 mb-1.5 animate-bounce" />
                                <span className="text-xs text-white font-bold block">
                                  Press Ctrl+V (Cmd+V) to paste copied screenshot or image
                                </span>
                                <span className="text-[11px] text-amber-400/90 font-medium block mt-0.5">
                                  Image will automatically convert & compress for level preview
                                </span>
                              </div>
                            )}

                            {editImagePreview && (
                              <div className="relative w-full h-32 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                                <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditImagePreview(null);
                                    setEditImageUrl('');
                                    setEditImageModified(true);
                                  }}
                                  className="absolute top-2 right-2 bg-slate-950/80 hover:bg-red-500 text-white p-1 rounded-lg text-xs"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Completions / Victors & Video Footage Section */}
                          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Video className="w-4 h-4" />
                                Completions & Video Footage ({editVictors.length})
                              </h4>
                            </div>

                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                              {editVictors.length === 0 ? (
                                <p className="text-xs text-slate-500 italic p-2">No completions recorded for this level yet.</p>
                              ) : (
                                editVictors.map((v, idx) => (
                                  <div
                                    key={v.id || idx}
                                    draggable
                                    onDragStart={() => handleVictorDragStart(idx)}
                                    onDragOver={handleVictorDragOver}
                                    onDrop={() => handleVictorDrop(idx)}
                                    className={`bg-slate-950 border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                                      draggedVictorIndex === idx
                                        ? 'border-amber-400 bg-amber-400/10 opacity-60'
                                        : 'border-slate-800 hover:border-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 flex-1">
                                      <span className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-amber-400 p-1">
                                        <GripVertical className="w-3.5 h-3.5" />
                                      </span>
                                      <span className="font-bold text-white text-xs">{getVictorName(v)}</span>
                                      {v.isVerifier && (
                                        <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded font-semibold">Verifier</span>
                                      )}
                                      {v.isWorldRecord && (
                                        <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-semibold">WR</span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 flex-1">
                                      <input
                                        type="text"
                                        value={v.videoProofUrl || ''}
                                        onChange={(e) => handleUpdateVictorVideo(idx, e.target.value)}
                                        placeholder="Video URL (YouTube/Twitch/Streamable)"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-600 focus:border-amber-400"
                                      />
                                      {v.videoProofUrl && (
                                        <a href={v.videoProofUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-amber-400">
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleVictorFlag(idx, 'isVerifier')}
                                        className={`px-2 py-1 text-[10px] font-semibold rounded border ${v.isVerifier ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                                      >
                                        Verifier
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleVictorFlag(idx, 'isWorldRecord')}
                                        className={`px-2 py-1 text-[10px] font-semibold rounded border ${v.isWorldRecord ? 'bg-purple-500 text-white border-purple-500' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                                      >
                                        WR
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveVictor(idx)}
                                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Remove completion"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            <div className="border-t border-slate-800 pt-3 space-y-3">
                              <span className="text-xs font-bold text-slate-300 block">+ Add New Completion</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input
                                  type="text"
                                  value={newVictorName}
                                  onChange={(e) => setNewVictorName(e.target.value)}
                                  placeholder="Player name (e.g. Everblaze)"
                                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:border-amber-400"
                                />
                                <input
                                  type="text"
                                  value={newVictorVideo}
                                  onChange={(e) => setNewVictorVideo(e.target.value)}
                                  placeholder="Video URL (e.g. https://youtu.be/...)"
                                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:border-amber-400"
                                />
                              </div>

                              <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div className="flex items-center gap-4 text-xs text-slate-300">
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={newVictorIsVerifier}
                                      onChange={(e) => setNewVictorIsVerifier(e.target.checked)}
                                      className="rounded border-slate-700 text-amber-400 focus:ring-amber-400"
                                    />
                                    <span>Level Verifier</span>
                                  </label>
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={newVictorIsWR}
                                      onChange={(e) => setNewVictorIsWR(e.target.checked)}
                                      className="rounded border-slate-700 text-amber-400 focus:ring-amber-400"
                                    />
                                    <span>World Record</span>
                                  </label>
                                </div>

                                <button
                                  type="button"
                                  onClick={handleAddVictorToLevel}
                                  className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl flex items-center gap-1 transition-all active:scale-95"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add Completion</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Save Actions */}
                          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                              disabled={isSaving}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveLevel(lvl.id)}
                              disabled={isSaving}
                              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-400/20 transition-all active:scale-95"
                            >
                              {isSaving ? (
                                <span>Saving...</span>
                              ) : (
                                <>
                                  <Check className="w-4 h-4" />
                                  <span>Save Changes to Database</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: RANKED PLAYERS DIRECTORY */}
      {activeSubTab === 'players' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#111927] p-4 rounded-xl border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ranked player name..."
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsAddPlayerModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-sm shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Ranked Player</span>
            </button>
          </div>

          {/* Levels Datalist for fast autocomplete */}
          <datalist id="gdkl-levels-datalist">
            {levels.map((lvl) => (
              <option key={lvl.id} value={lvl.name}>{`#${lvl.rank} - ${lvl.name} (${lvl.difficulty})`}</option>
            ))}
          </datalist>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlayers.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-[#111927] border border-slate-800 rounded-2xl text-slate-400">
                <p className="text-sm">No players found matching "{playerSearch}".</p>
              </div>
            ) : (
              filteredPlayers.map((player, idx) => (
                <div key={player.id} className="bg-[#111927] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 relative group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 font-heading font-extrabold text-xs flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-white text-sm font-heading truncate">{player.name}</h3>
                          {onSelectPlayer && (
                            <button
                              type="button"
                              onClick={() => onSelectPlayer(player.name)}
                              className="px-2 py-0.5 text-[11px] font-bold text-amber-400 hover:text-slate-950 bg-amber-400/10 hover:bg-amber-400 border border-amber-400/30 rounded-lg flex items-center gap-1 transition-all active:scale-95 shadow-sm shrink-0"
                              title={`View full profile for ${player.name}`}
                            >
                              <UserIcon className="w-3 h-3" />
                              <span>Profile</span>
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">ID: {player.id}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEditPlayer({ id: player.id, name: player.name, country: player.country })}
                        className="text-slate-500 hover:text-amber-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Edit player profile (Name & ID)"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlayer(player.id, player.name)}
                        className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Remove player profile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Total Points</span>
                      <span className="font-mono font-bold text-amber-400">{player.points.toFixed(2)} pts</span>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Completions</span>
                      <span className="font-mono font-bold text-slate-200">{player.completionsCount} Demons</span>
                    </div>
                  </div>

                  {/* Direct Add Completion Section under player's name */}
                  <div className="pt-2.5 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                        <Plus className="w-3 h-3 text-amber-400" />
                        <span>Add Completion</span>
                      </label>
                      <span className="text-[10px] text-slate-500 font-mono">Helper Entry</span>
                    </div>

                    <div className="space-y-1.5">
                      <input
                        type="text"
                        list="gdkl-levels-datalist"
                        value={playerCompletionForms[player.id]?.mapName || ''}
                        onChange={(e) =>
                          setPlayerCompletionForms((prev) => ({
                            ...prev,
                            [player.id]: {
                              mapName: e.target.value,
                              isWR: prev[player.id]?.isWR || false,
                              proofUrl: prev[player.id]?.proofUrl || ''
                            }
                          }))
                        }
                        placeholder="Enter map name..."
                        className="w-full bg-slate-900 border border-slate-700/80 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 transition-colors"
                      />

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 select-none hover:text-white">
                          <input
                            type="checkbox"
                            checked={Boolean(playerCompletionForms[player.id]?.isWR)}
                            onChange={(e) =>
                              setPlayerCompletionForms((prev) => ({
                                ...prev,
                                [player.id]: {
                                  mapName: prev[player.id]?.mapName || '',
                                  isWR: e.target.checked,
                                  proofUrl: prev[player.id]?.proofUrl || ''
                                }
                              }))
                            }
                            className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-amber-400 focus:ring-0 accent-amber-400"
                          />
                          <span className={playerCompletionForms[player.id]?.isWR ? 'text-amber-400 font-bold' : ''}>
                            World Record (WR)
                          </span>
                        </label>

                        <button
                          type="button"
                          disabled={
                            isSubmittingDirect === player.id ||
                            !playerCompletionForms[player.id]?.mapName?.trim()
                          }
                          onClick={() => {
                            const form = playerCompletionForms[player.id] || { mapName: '', isWR: false, proofUrl: '' };
                            handleAddDirectCompletion(player.name, player.id, form.mapName, form.isWR, form.proofUrl);
                          }}
                          className="px-3 py-1 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center gap-1 transition-all active:scale-95 shadow-sm shrink-0"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{isSubmittingDirect === player.id ? 'Adding...' : 'Add'}</span>
                        </button>
                      </div>

                      <input
                        type="url"
                        value={playerCompletionForms[player.id]?.proofUrl || ''}
                        onChange={(e) =>
                          setPlayerCompletionForms((prev) => ({
                            ...prev,
                            [player.id]: {
                              mapName: prev[player.id]?.mapName || '',
                              isWR: prev[player.id]?.isWR || false,
                              proofUrl: e.target.value
                            }
                          }))
                        }
                        placeholder="Video proof URL (optional)..."
                        className="w-full bg-slate-900/60 border border-slate-800 focus:border-amber-400/80 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 placeholder-slate-600 font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD BRAND NEW LEVEL */}
      {isAddLevelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111927] border border-amber-400/40 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white font-heading flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                Add New Ranked Kaizo Level
              </h3>
              <button onClick={() => setIsAddLevelModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewLevel} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1 uppercase tracking-wider">
                    Level Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={addLevelName}
                    onChange={(e) => setAddLevelName(e.target.value)}
                    placeholder="e.g. Final Gateway"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1 uppercase tracking-wider">
                    Creator Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addLevelCreator}
                    onChange={(e) => setAddLevelCreator(e.target.value)}
                    placeholder="e.g. Everblaze"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-amber-400 mb-1 uppercase tracking-wider flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5" />
                    Placement Rank Position *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={levels.length + 1}
                    required
                    value={addLevelPlacement}
                    onChange={(e) => setAddLevelPlacement(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-900 border border-amber-400/60 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs font-bold font-mono text-amber-400"
                    placeholder="e.g. 1 for Top 1"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Inserts at Rank #{addLevelPlacement} and automatically updates remaining levels.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1 uppercase tracking-wider">
                    Difficulty Rating
                  </label>
                  <select
                    value={addLevelDifficulty}
                    onChange={(e) => setAddLevelDifficulty(e.target.value as KaizoLevel['difficulty'])}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  >
                    <option value="Impossible Kaizo">Impossible Kaizo</option>
                    <option value="Silent Kaizo">Silent Kaizo</option>
                    <option value="Extreme Kaizo">Extreme Kaizo</option>
                    <option value="Insane Kaizo">Insane Kaizo</option>
                    <option value="High Kaizo">High Kaizo</option>
                    <option value="Mid Kaizo">Mid Kaizo</option>
                    <option value="Entry Kaizo">Entry Kaizo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1 uppercase tracking-wider">
                  Verifier <span className="text-slate-500 font-normal lowercase">(leave blank if unverified)</span>
                </label>
                <input
                  type="text"
                  value={addLevelVerifier}
                  onChange={(e) => setAddLevelVerifier(e.target.value)}
                  placeholder="Leave blank if unverified"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1 uppercase tracking-wider">
                  Direct Play Link / URL
                </label>
                <input
                  type="text"
                  value={addLevelPlayUrl}
                  onChange={(e) => setAddLevelPlayUrl(e.target.value)}
                  placeholder="https://jellycade.com/games/goober-dash?g_play=048daa76-753d-408f-97bf-83b437da102e"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono"
                />
                <p className="text-[11px] text-amber-400/90 font-mono mt-1">
                  Calculated Level ID: <strong className="text-white">{getLevelIdFromLink(addLevelPlayUrl)}</strong>
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Thumbnail Screenshot
                  </label>

                  <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setAddLevelImageInputType('url')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                        addLevelImageInputType === 'url' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Image URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddLevelImageInputType('file')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                        addLevelImageInputType === 'file' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddLevelImageInputType('paste')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                        addLevelImageInputType === 'paste' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Paste Image
                    </button>
                  </div>
                </div>

                {addLevelImageInputType === 'url' ? (
                  <input
                    type="url"
                    value={addLevelImage}
                    onPaste={(e) =>
                      handlePasteImageToLevelPreview(e, (dataUrl) => {
                        setAddLevelImagePreview(dataUrl);
                        setAddLevelImage(dataUrl);
                      })
                    }
                    onChange={(e) => {
                      setAddLevelImage(e.target.value);
                      setAddLevelImagePreview(e.target.value || null);
                    }}
                    placeholder="https://i.imgur.com/example.png or paste image directly"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-slate-200"
                  />
                ) : addLevelImageInputType === 'file' ? (
                  <label
                    onPaste={(e) =>
                      handlePasteImageToLevelPreview(e, (dataUrl) => {
                        setAddLevelImagePreview(dataUrl);
                        setAddLevelImage(dataUrl);
                      })
                    }
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-amber-400/60 rounded-xl bg-slate-900/50 cursor-pointer text-center"
                  >
                    <Upload className="w-5 h-5 text-amber-400 mb-1" />
                    <span className="text-xs text-slate-200 font-medium">Click to select image file or press Ctrl+V to paste</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const result = event.target?.result as string;
                          if (result) {
                            const img = new Image();
                            img.src = result;
                            img.onload = () => {
                              const canvas = document.createElement('canvas');
                              const maxDim = 400;
                              let w = img.width;
                              let h = img.height;
                              if (w > maxDim || h > maxDim) {
                                if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
                                else { w = Math.round((w * maxDim) / h); h = maxDim; }
                              }
                              canvas.width = w; canvas.height = h;
                              canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
                              const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                              setAddLevelImagePreview(dataUrl);
                              setAddLevelImage(dataUrl);
                            };
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div
                    tabIndex={0}
                    onPaste={(e) =>
                      handlePasteImageToLevelPreview(e, (dataUrl) => {
                        setAddLevelImagePreview(dataUrl);
                        setAddLevelImage(dataUrl);
                      })
                    }
                    className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-amber-400/70 hover:border-amber-400 focus:border-amber-400 rounded-xl bg-amber-400/10 cursor-pointer text-center outline-none"
                  >
                    <Upload className="w-6 h-6 text-amber-400 mb-1.5 animate-bounce" />
                    <span className="text-xs text-white font-bold block">
                      Press Ctrl+V (Cmd+V) to paste copied screenshot or image
                    </span>
                    <span className="text-[11px] text-amber-400/90 font-medium block mt-0.5">
                      Image will automatically convert & compress for level preview
                    </span>
                  </div>
                )}

                {addLevelImagePreview && (
                  <div className="relative w-full h-32 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    <img src={addLevelImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setAddLevelImagePreview(null);
                        setAddLevelImage('');
                      }}
                      className="absolute top-2 right-2 bg-slate-950/80 hover:bg-red-500 text-white p-1 rounded-lg text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1 uppercase tracking-wider">
                  Estimated Duration
                </label>
                <input
                  type="text"
                  value={addLevelLength}
                  onChange={(e) => setAddLevelLength(e.target.value)}
                  placeholder="e.g. 0:50"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddLevelModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingLevel}
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl flex items-center gap-1.5 shadow-md"
                >
                  {isAddingLevel ? 'Adding Level...' : 'Add Level to Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW PLAYER */}
      {isAddPlayerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111927] border border-amber-400/40 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white font-heading flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                Add New Ranked Player
              </h3>
              <button onClick={() => setIsAddPlayerModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePlayer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">
                  Player Name *
                </label>
                <input
                  type="text"
                  required
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="e.g. ShadowKing"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">
                  Country Code (Optional)
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={newPlayerCountry}
                  onChange={(e) => setNewPlayerCountry(e.target.value)}
                  placeholder="e.g. US, DE, JP"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddPlayerModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingPlayer}
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl flex items-center gap-1.5 shadow-md"
                >
                  {isAddingPlayer ? 'Adding...' : 'Add Player'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PLAYER PROFILE */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111927] border border-amber-400/40 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white font-heading flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-400" />
                Edit Ranked Player Profile
              </h3>
              <button onClick={() => setEditingPlayer(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlayerIdentity} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">
                  Player Name *
                </label>
                <input
                  type="text"
                  required
                  value={editPlayerNameInput}
                  onChange={(e) => setEditPlayerNameInput(e.target.value)}
                  placeholder="e.g. ShadowKing"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">
                  Player ID *
                </label>
                <input
                  type="text"
                  required
                  value={editPlayerIdInput}
                  onChange={(e) => setEditPlayerIdInput(e.target.value)}
                  placeholder="e.g. shadowking"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs font-mono text-amber-400"
                />
                <p className="text-[11px] text-amber-400/90 mt-1">
                  Updating name or ID will automatically sync across all level victor records in the database.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">
                  Country Code (Optional)
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={editPlayerCountryInput}
                  onChange={(e) => setEditPlayerCountryInput(e.target.value)}
                  placeholder="e.g. US, DE, JP"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white uppercase"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPlayer}
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl flex items-center gap-1.5 shadow-md"
                >
                  {isUpdatingPlayer ? 'Updating across list...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM REACT DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#111927] border border-red-500/40 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white font-heading flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Confirm {deleteTarget.type === 'level' ? 'Level' : 'Player'} Deletion
              </h3>
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p className="text-sm font-medium text-slate-200">
                Are you sure you want to delete this {deleteTarget.type}?
              </p>

              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-xs text-amber-400 flex items-center justify-between">
                <span className="font-bold">{deleteTarget.name}</span>
                {deleteTarget.rank && <span className="text-slate-400 font-normal">Rank #{deleteTarget.rank}</span>}
              </div>

              <p className="text-[11px] text-slate-400">
                This item will be permanently removed from the database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAction}
                disabled={isDeleting}
                className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl flex items-center gap-1.5 shadow-lg shadow-red-600/20 active:scale-95 transition-all"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: CHANGELOG */}
      {activeSubTab === 'changelog' && (
        <div className="animate-in fade-in duration-200">
          <ChangelogTab />
        </div>
      )}

      {/* SUB-TAB 4: PENDING SUBMISSIONS */}
      {activeSubTab === 'submissions' && (
        <div className="animate-in fade-in duration-200">
          <PendingSubmissions
            submissions={submissions}
            levels={levels}
            onToast={onToast}
            playerName={playerName}
          />
        </div>
      )}

      {/* SUB-TAB 5: MANAGE ACCESS (Admin Only) */}
      {activeSubTab === 'access' && isAdmin && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-[#111927] border border-indigo-500/20 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <span className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-extrabold text-white font-heading">
                  Authorized List Helpers
                </h3>
                <p className="text-xs text-slate-400">
                  Grant or revoke database access by managing authorized email addresses.
                </p>
              </div>
            </div>

            <form onSubmit={handleAddHelper} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Helper Email
                </label>
                <input
                  type="email"
                  value={newHelperEmail}
                  onChange={(e) => setNewHelperEmail(e.target.value)}
                  placeholder="user@gmail.com"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Username (for Changelog)
                </label>
                <input
                  type="text"
                  value={newHelperName}
                  onChange={(e) => setNewHelperName(e.target.value)}
                  placeholder="e.g. Everblaze"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isAddingHelper}
                className="py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-all shadow-md flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {isAddingHelper ? 'Authorizing...' : 'Authorize Helper'}
              </button>
            </form>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider px-1">
                Current Access Registry
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Always show the Master Admin */}
                <div className="bg-slate-900/80 border border-indigo-500/30 p-4 rounded-xl flex items-center justify-between shadow-lg relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-1">
                    <span className="text-[9px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-bl-lg border-b border-l border-indigo-500/20">Master Admin</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                      <Crown className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">tomato</div>
                      <div className="text-[10px] text-slate-500 font-mono">tomatosauceman500@gmail.com</div>
                    </div>
                  </div>
                </div>

                {authorizedUsers.filter(u => u.email !== 'tomatosauceman500@gmail.com').map((helper) => (
                  <div key={helper.id} className="bg-[#0b0f17] border border-slate-800 p-4 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-slate-400 border border-slate-800 group-hover:text-amber-400 group-hover:border-amber-400/30 transition-colors">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-200 text-sm">{helper.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{helper.email}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveHelper(helper.email)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                      title="Revoke Access"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              {authorizedUsers.filter(u => u.email !== 'tomatosauceman500@gmail.com').length === 0 && (
                <div className="p-10 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                   <p className="text-sm text-slate-500 italic">No additional helpers authorized.</p>
                </div>
              )}
            </div>
          </div>

          {/* HEAD ADMIN EXCLUSIVE: DOWNLOAD CONSOLIDATED LEVEL DATABASE FILE */}
          {isHeadAdmin && (
            <div className="bg-[#111927] border border-amber-500/30 rounded-2xl p-6 shadow-xl space-y-4 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20 shrink-0">
                    <FileDown className="w-5 h-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-extrabold text-white font-heading">
                        Consolidated Level File (JSON)
                      </h3>
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        <Crown className="w-3 h-3 text-amber-400" />
                        Head Admin Only
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Download the database JSON bundle (<span className="font-mono text-amber-300">bundles/levels</span>) containing all {levels.length} levels, victors, points, and verifications (excluding thumbnail images).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadLevelsBundle}
                  disabled={isDownloadingBundle}
                  className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 active:scale-95 transition-all shrink-0 font-heading tracking-wide self-start sm:self-center cursor-pointer"
                  title="Download consolidated level file as JSON"
                >
                  {isDownloadingBundle ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Fetching JSON...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-slate-950" />
                      <span>Download Levels JSON</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
                  <div className="p-2 bg-slate-800 rounded-lg text-amber-400">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Firestore Doc</div>
                    <div className="font-mono text-white text-xs font-bold">bundles/levels</div>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
                  <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Included Levels</div>
                    <div className="text-white text-xs font-bold">{levels.length} Ranked Levels</div>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
                  <div className="p-2 bg-slate-800 rounded-lg text-indigo-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payload Size</div>
                    <div className="text-white text-xs font-bold">~167 KB (No Images)</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
