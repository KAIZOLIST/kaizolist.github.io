import { KaizoLevel } from '../types/kaizo';
import { getPointsForRank, getVictorName, getVerifiedPlacements } from './kaizoUtils';

export interface PlayerCompletion {
  level: KaizoLevel;
  videoUrl?: string;
  isVerifier: boolean;
  isWorldRecord: boolean;
  pointsEarned: number;
}

export interface PlayerStats {
  name: string;
  placement: number; // 1-based rank in Victors Hall
  finalScore: number;
  rawScore: number;
  totalCompletions: number;
  verifierCount: number;
  wrCount: number;
  createdCount: number;
  hardestLevel: KaizoLevel | null;
  hardestPlacement?: number; // Verified rank of hardest level
  completions: PlayerCompletion[];
  completedLevelIds: Set<string>;
}

export interface GemstoneInfo {
  name: string; // e.g. 'Diamond'
  title: string; // e.g. 'Celestial Diamond'
  tierLabel: string; // e.g. 'Rank #1'
  iconEmoji: string;
  hex: string;
  // Tailwind theme classes
  textClass: string;
  textLightClass: string;
  textGradient: string;
  borderClass: string;
  borderGlowClass: string;
  badgeClass: string;
  bgTint: string;
  modalGlow: string;
  progressColor: string;
}

export function isValidProofUrl(url?: string): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (
    !trimmed ||
    trimmed === '-' ||
    trimmed === 'none' ||
    trimmed.toLowerCase() === 'n/a' ||
    trimmed.toLowerCase().includes('jellycade.com') ||
    trimmed.toLowerCase().includes('winterpixel.io')
  ) {
    return undefined;
  }
  return trimmed;
}

export const GEMSTONE_TIERS: Record<string, GemstoneInfo> = {
  ruby: {
    name: 'Ruby',
    title: 'Ruby',
    tierLabel: 'Rank #1',
    iconEmoji: '♦️',
    hex: '#f43f5e',
    textClass: 'text-rose-400',
    textLightClass: 'text-rose-100',
    textGradient: 'from-rose-400 via-pink-100 to-amber-200',
    borderClass: 'border-rose-500/60',
    borderGlowClass: 'shadow-[0_0_30px_rgba(244,63,94,0.35)]',
    badgeClass: 'bg-rose-500/20 text-rose-200 border-rose-500/50 ring-1 ring-rose-500/40',
    bgTint: 'bg-rose-950/40 border-rose-500/30',
    modalGlow: 'from-rose-500/45 via-rose-950/30 to-transparent',
    progressColor: 'bg-gradient-to-r from-rose-500 to-pink-400'
  },
  gold: {
    name: 'Gold',
    title: 'Gold',
    tierLabel: 'Top 5',
    iconEmoji: '🥇',
    hex: '#f59e0b',
    textClass: 'text-amber-400',
    textLightClass: 'text-amber-100',
    textGradient: 'from-amber-300 via-yellow-100 to-amber-200',
    borderClass: 'border-amber-500/60',
    borderGlowClass: 'shadow-[0_0_30px_rgba(245,158,11,0.35)]',
    badgeClass: 'bg-amber-500/20 text-amber-200 border-amber-500/50 ring-1 ring-amber-500/40',
    bgTint: 'bg-amber-950/40 border-amber-500/30',
    modalGlow: 'from-amber-500/45 via-amber-950/30 to-transparent',
    progressColor: 'bg-gradient-to-r from-amber-500 to-yellow-300'
  },
  diamond: {
    name: 'Diamond',
    title: 'Diamond',
    tierLabel: 'Top 10',
    iconEmoji: '💎',
    hex: '#38bdf8',
    textClass: 'text-cyan-300',
    textLightClass: 'text-cyan-100',
    textGradient: 'from-cyan-300 via-sky-100 to-white',
    borderClass: 'border-cyan-400/60',
    borderGlowClass: 'shadow-[0_0_30px_rgba(56,189,248,0.35)]',
    badgeClass: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50 ring-1 ring-cyan-400/40',
    bgTint: 'bg-cyan-950/40 border-cyan-500/30',
    modalGlow: 'from-cyan-500/45 via-blue-950/30 to-transparent',
    progressColor: 'bg-gradient-to-r from-cyan-400 to-sky-200'
  },
  emerald: {
    name: 'Emerald',
    title: 'Emerald',
    tierLabel: 'Top 25',
    iconEmoji: '🟢',
    hex: '#10b981',
    textClass: 'text-emerald-400',
    textLightClass: 'text-emerald-100',
    textGradient: 'from-emerald-400 via-teal-100 to-green-200',
    borderClass: 'border-emerald-500/60',
    borderGlowClass: 'shadow-[0_0_30px_rgba(16,185,129,0.35)]',
    badgeClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50 ring-1 ring-emerald-500/40',
    bgTint: 'bg-emerald-950/40 border-emerald-500/30',
    modalGlow: 'from-emerald-500/45 via-emerald-950/30 to-transparent',
    progressColor: 'bg-gradient-to-r from-emerald-500 to-teal-300'
  },
  amethyst: {
    name: 'Amethyst',
    title: 'Amethyst',
    tierLabel: 'Top 50',
    iconEmoji: '🔮',
    hex: '#a855f7',
    textClass: 'text-purple-400',
    textLightClass: 'text-purple-100',
    textGradient: 'from-purple-400 via-fuchsia-100 to-violet-200',
    borderClass: 'border-purple-500/60',
    borderGlowClass: 'shadow-[0_0_30px_rgba(168,85,247,0.35)]',
    badgeClass: 'bg-purple-500/20 text-purple-200 border-purple-500/50 ring-1 ring-purple-500/40',
    bgTint: 'bg-purple-950/40 border-purple-500/30',
    modalGlow: 'from-purple-500/45 via-purple-950/30 to-transparent',
    progressColor: 'bg-gradient-to-r from-purple-500 to-fuchsia-400'
  },
  topaz: {
    name: 'Topaz',
    title: 'Topaz',
    tierLabel: 'Top 100',
    iconEmoji: '🔶',
    hex: '#eab308',
    textClass: 'text-yellow-400',
    textLightClass: 'text-yellow-100',
    textGradient: 'from-yellow-400 via-amber-100 to-orange-200',
    borderClass: 'border-yellow-500/60',
    borderGlowClass: 'shadow-[0_0_30px_rgba(234,179,8,0.35)]',
    badgeClass: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/50 ring-1 ring-yellow-500/40',
    bgTint: 'bg-yellow-950/40 border-yellow-500/30',
    modalGlow: 'from-yellow-500/45 via-yellow-950/30 to-transparent',
    progressColor: 'bg-gradient-to-r from-yellow-500 to-amber-300'
  },
  quartz: {
    name: 'Quartz',
    title: 'Quartz',
    tierLabel: 'Ranked',
    iconEmoji: '⚪',
    hex: '#94a3b8',
    textClass: 'text-slate-300',
    textLightClass: 'text-slate-100',
    textGradient: 'from-slate-200 via-white to-zinc-300',
    borderClass: 'border-slate-500/60',
    borderGlowClass: 'shadow-[0_0_30px_rgba(148,163,184,0.25)]',
    badgeClass: 'bg-slate-500/20 text-slate-200 border-slate-400/40 ring-1 ring-slate-400/30',
    bgTint: 'bg-slate-900/40 border-slate-600/30',
    modalGlow: 'from-slate-400/40 via-slate-900/30 to-transparent',
    progressColor: 'bg-gradient-to-r from-slate-400 to-slate-200'
  },
  obsidian: {
    name: 'Obsidian',
    title: 'Obsidian',
    tierLabel: 'Unranked',
    iconEmoji: '⚫',
    hex: '#64748b',
    textClass: 'text-slate-400',
    textLightClass: 'text-slate-200',
    textGradient: 'from-slate-400 via-slate-200 to-slate-400',
    borderClass: 'border-slate-700/60',
    borderGlowClass: 'shadow-[0_0_20px_rgba(100,116,139,0.2)]',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
    bgTint: 'bg-slate-950/40 border-slate-800',
    modalGlow: 'from-slate-600/40 via-slate-950/30 to-transparent',
    progressColor: 'bg-slate-500'
  }
};

/**
 * Assigns a gemstone rank based on the player's Victors Hall placement.
 * #1 = Ruby
 * Top 5 (2-5) = Gold
 * Top 10 (6-10) = Diamond
 * Top 25 (11-25) = Emerald
 * Top 50 (26-50) = Amethyst
 * Top 100 (51-100) = Topaz
 * 101+ = Quartz
 */
export function getGemstoneForPlacement(placement: number | null | undefined): GemstoneInfo {
  if (!placement || placement <= 0) return GEMSTONE_TIERS.obsidian;
  if (placement === 1) return GEMSTONE_TIERS.ruby;
  if (placement <= 5) return GEMSTONE_TIERS.gold;
  if (placement <= 10) return GEMSTONE_TIERS.diamond;
  if (placement <= 25) return GEMSTONE_TIERS.emerald;
  if (placement <= 50) return GEMSTONE_TIERS.amethyst;
  if (placement <= 100) return GEMSTONE_TIERS.topaz;
  return GEMSTONE_TIERS.quartz;
}

export function normalizePlayerName(name: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'sigmundfreud' || lower === 'toj sigmundfreud') {
    return 'toj sigmundfreud';
  }
  return lower;
}

export function getCanonicalPlayerName(name: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'sigmundfreud' || lower === 'toj sigmundfreud') {
    return 'ToJ SigmundFreud';
  }
  return trimmed;
}

/**
 * Computes all player stats and returns the full sorted Victors Hall leaderboard.
 */
export function calculatePlayerLeaderboard(levels: KaizoLevel[]): PlayerStats[] {
  const safeLevels = Array.isArray(levels) ? levels : [];
  const verifiedPlacements = getVerifiedPlacements(safeLevels);

  const getCreatedCount = (normalizedKey: string) => {
    let count = 0;
    safeLevels.forEach((l) => {
      if (!l || !l.creator) return;
      const creators = l.creator.split(',').map((s) => normalizePlayerName(s));
      if (
        creators.includes(normalizedKey) ||
        creators.some((c) => c && normalizedKey && (c.includes(normalizedKey) || normalizedKey.includes(c)))
      ) {
        count++;
      }
    });
    return count;
  };

  const isBetterVerifiedLevel = (newLevel: KaizoLevel, currentHardest: KaizoLevel | null): boolean => {
    const newVerifiedRank = verifiedPlacements.get(newLevel.id);
    if (!newVerifiedRank) return false;
    if (!currentHardest) return true;
    const currentVerifiedRank = verifiedPlacements.get(currentHardest.id);
    if (!currentVerifiedRank) return true;
    return newVerifiedRank < currentVerifiedRank;
  };

  const playerMap = new Map<string, {
    name: string;
    finalScore: number;
    rawScore: number;
    totalCompletions: number;
    verifierCount: number;
    wrCount: number;
    createdCount: number;
    hardestLevel: KaizoLevel | null;
    completions: PlayerCompletion[];
    completedLevelIds: Set<string>;
  }>();

  safeLevels.forEach((level) => {
    if (!level) return;
    const verifiedRank = verifiedPlacements.get(level.id);
    const levelPoints = verifiedRank ? getPointsForRank(verifiedRank) : 0;
    const victorsProcessedKeys = new Set<string>();

    const levelVerifierKeys = (level.verifier || '')
      .split(',')
      .map((s) => normalizePlayerName(s))
      .filter((k) => k && k !== '-' && k !== 'none');

    const levelWRKeys = (level.worldRecord || '')
      .split(',')
      .map((s) => normalizePlayerName(s))
      .filter((k) => k && k !== '-' && k !== 'none');

    const victorsList = Array.isArray(level.victors) ? level.victors : [];
    victorsList.forEach((victor) => {
      const rawName = getVictorName(victor);
      const vKey = normalizePlayerName(rawName);
      if (!vKey) return;

      victorsProcessedKeys.add(vKey);
      const displayName = getCanonicalPlayerName(rawName);

      const isVerifier =
        Boolean(victor.isVerifier) ||
        levelVerifierKeys.includes(vKey) ||
        levelVerifierKeys.some((k) => k.includes(vKey) || vKey.includes(k));

      const isWR =
        Boolean(victor.isWorldRecord) ||
        levelWRKeys.includes(vKey) ||
        levelWRKeys.some((k) => k.includes(vKey) || vKey.includes(k));

      let earnedPoints = levelPoints;
      if (isVerifier) earnedPoints += levelPoints * 0.10;
      if (isWR) earnedPoints += levelPoints * 0.15;
      earnedPoints = Math.round(earnedPoints * 100) / 100;

      const existing = playerMap.get(vKey);

      if (existing) {
        if (displayName.includes('ToJ SigmundFreud') || (displayName !== existing.name && displayName.length >= existing.name.length)) {
          existing.name = displayName;
        }

        existing.rawScore += levelPoints;
        existing.finalScore = Math.round((existing.finalScore + earnedPoints) * 100) / 100;
        existing.totalCompletions += 1;
        if (isVerifier) existing.verifierCount += 1;
        if (isWR) existing.wrCount += 1;
        existing.completedLevelIds.add(level.id);

        if (isBetterVerifiedLevel(level, existing.hardestLevel)) {
          existing.hardestLevel = level;
        }
        existing.completions.push({
          level,
          videoUrl: isValidProofUrl(victor.videoProofUrl),
          isVerifier,
          isWorldRecord: isWR,
          pointsEarned: earnedPoints
        });
      } else {
        const completedIds = new Set<string>();
        completedIds.add(level.id);
        playerMap.set(vKey, {
          name: displayName,
          rawScore: levelPoints,
          finalScore: earnedPoints,
          totalCompletions: 1,
          verifierCount: isVerifier ? 1 : 0,
          wrCount: isWR ? 1 : 0,
          createdCount: getCreatedCount(vKey),
          hardestLevel: verifiedRank !== undefined ? level : null,
          completedLevelIds: completedIds,
          completions: [
            {
              level,
              videoUrl: isValidProofUrl(victor.videoProofUrl),
              isVerifier,
              isWorldRecord: isWR,
              pointsEarned: earnedPoints
            }
          ]
        });
      }
    });

    // Also account for level.verifier if not in victors
    if (level.verifier) {
      const verifierNames = level.verifier.split(',');
      verifierNames.forEach((rawVerName) => {
        const verKey = normalizePlayerName(rawVerName);
        if (verKey && verKey !== '-' && verKey !== 'none' && !victorsProcessedKeys.has(verKey)) {
          victorsProcessedKeys.add(verKey);
          const displayName = getCanonicalPlayerName(rawVerName);

          let earnedPoints = levelPoints + levelPoints * 0.10;
          earnedPoints = Math.round(earnedPoints * 100) / 100;

          const existing = playerMap.get(verKey);
          if (existing) {
            existing.rawScore += levelPoints;
            existing.finalScore = Math.round((existing.finalScore + earnedPoints) * 100) / 100;
            existing.totalCompletions += 1;
            existing.verifierCount += 1;
            existing.completedLevelIds.add(level.id);
            if (isBetterVerifiedLevel(level, existing.hardestLevel)) {
              existing.hardestLevel = level;
            }
            existing.completions.push({
              level,
              videoUrl: undefined,
              isVerifier: true,
              isWorldRecord: false,
              pointsEarned: earnedPoints
            });
          } else {
            const completedIds = new Set<string>();
            completedIds.add(level.id);
            playerMap.set(verKey, {
              name: displayName,
              rawScore: levelPoints,
              finalScore: earnedPoints,
              totalCompletions: 1,
              verifierCount: 1,
              wrCount: 0,
              createdCount: getCreatedCount(verKey),
              hardestLevel: verifiedRank !== undefined ? level : null,
              completedLevelIds: completedIds,
              completions: [
                {
                  level,
                  videoUrl: undefined,
                  isVerifier: true,
                  isWorldRecord: false,
                  pointsEarned: earnedPoints
                }
              ]
            });
          }
        }
      });
    }
  });

  // Account for creators who may not have beaten levels yet
  safeLevels.forEach((level) => {
    if (!level || !level.creator) return;
    const creatorNames = level.creator.split(',');
    creatorNames.forEach((rawCrName) => {
      const crKey = normalizePlayerName(rawCrName);
      if (crKey && crKey !== '-' && crKey !== 'none' && !playerMap.has(crKey)) {
        const displayName = getCanonicalPlayerName(rawCrName);
        playerMap.set(crKey, {
          name: displayName,
          rawScore: 0,
          finalScore: 0,
          totalCompletions: 0,
          verifierCount: 0,
          wrCount: 0,
          createdCount: getCreatedCount(crKey),
          hardestLevel: null,
          completedLevelIds: new Set<string>(),
          completions: []
        });
      }
    });
  });

  const sorted = Array.from(playerMap.values()).sort(
    (a, b) => b.finalScore - a.finalScore || b.totalCompletions - a.totalCompletions
  );

  return sorted.map((p, idx) => ({
    ...p,
    placement: idx + 1,
    hardestPlacement: p.hardestLevel ? verifiedPlacements.get(p.hardestLevel.id) : undefined
  }));
}
