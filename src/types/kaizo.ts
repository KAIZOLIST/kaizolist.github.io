export interface Victor {
  id: string;
  name?: string;
  videoProofUrl?: string;
  verifiedByCreator?: boolean;
  isVerifier?: boolean;
  isWorldRecord?: boolean;
}

export interface KaizoLevel {
  id: string;
  rank: number;
  name: string;
  creator: string;
  verifier: string;
  worldRecord?: string;
  directPlayUrl: string;
  difficulty: 'Impossible Kaizo' | 'Silent Kaizo' | 'Extreme Kaizo' | 'Insane Kaizo' | 'High Kaizo' | 'Mid Kaizo' | 'Entry Kaizo';
  thumbnailUrl: string | null;
  imageFit?: 'contain' | 'cover';
  length: string;
  victors: Victor[];
  isLegacy?: boolean;
  imageChunkId?: string;
}

export interface ImageChunk {
  id: string;
  chunkIndex: number;
  count: number;
  updatedAt: string;
  images: Record<string, string>;
}

export interface ProofSubmission {
  id: string;
  levelId: string;
  levelName: string;
  player: string;
  videoUrl: string;
  screenshotUrl?: string;
  proofType?: 'video' | 'screenshot' | 'both';
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

export interface PlayerProfile {
  id: string;
  name: string;
  country?: string;
  addedAt?: string;
}

export interface ChangeDetail {
  label: string;
  field?: string;
  oldValue?: any;
  newValue?: any;
  description?: string;
  type?: 'added' | 'removed' | 'modified';
}

export interface ChangelogItem {
  id: string;
  timestamp: string;
  action: string;
  description: string;
  author?: string;
  levelName?: string;
  changes?: ChangeDetail[];
}

export interface ListHelper {
  id: string;
  name: string;
  code: string;
  role?: string;
  active: boolean;
  createdAt?: string;
}
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'helper';
  addedAt: string;
}
