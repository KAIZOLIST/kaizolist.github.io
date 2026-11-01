import { Victor } from '../types/kaizo';

export const PLAYER_SLUG_NAME_MAP: Record<string, string> = {
  'everblaze': 'Everblaze',
  'bestegg': 'BestEgg',
  'breadfish': 'Breadfish',
  'sigmundfreud': 'ToJ SigmundFreud',
  'worldx': 'Worldx',
  'royalunicorn': 'RoyalUnicorn',
  'unlimited': 'Unlimited',
  'shadowsurf': 'ShadowSurf',
  'uldm': 'Uldm',
  'nebula': 'Nebula',
  'petbobo': 'Pet BoBo',
  'omegagodzilla': 'Omega Godzilla',
  'ropuloty': 'Ropuloty',
  'dantheman': 'DanTheMan',
  'gamingbeast': 'Gaming Beast',
  'xsetdantesandwic': 'XsetDanteSandwic',
  'lecksibbi': 'Leck Sibbi',
  'sheerfails': 'Sheerfails',
  'yoyble': 'Yoyble',
  '27': '27',
  'leaffy': 'Leaffy',
  'matrixical': 'Matrixical',
  'atomic': 'Atomic',
  'pooploirs': 'Pooploirs',
  'isr': 'isr',
  'deam': 'Deam',
  'kyttas': 'KYTTAS',
  'goobernut': 'Goobernut',
  'twilightphi': 'Twilightphi',
  'jasonthe': 'Jason the',
  'mrpigeon': 'MrPigeon',
  'mmediocre': 'mmediocre',
  'turbofood': 'TurboFood',
  'ez': 'EZ',
  'ognandi': 'Ognandi',
  'thehermit': 'thehermit',
  'sambodi': 'Sambodi',
  'darkrai': 'Darkrai',
  'mezzo': 'Mezzo',
  't3m': 'T3m',
  'leckeier': 'Leck Eier',
  'atheism': 'Atheism',
  'hihiha': 'Hihiha',
  'hotcyclop': 'HotCyclop',
  'ivory': 'Ivory',
  'pizzaking': 'PizzaKing',
  'tojsomeone27': 'ToJ Someone27',
  'turbodaddy': 'TurboDaddy',
  'alexpaquetta': 'AlexPaquetta',
  'yurmom': 'yurmom',
  'legendof3': 'Legend of 3',
  'smoothbanana': 'Smooth Banana',
  'yggsdrul': 'yggsdrul',
  'williwonky': 'Williwonky',
  'juniper': 'Juniper',
  'helloishi': 'Hello is Hi',
  'pencilsharpener': 'Pencil Sharpener',
  'shimobri': 'Shimobri',
  'qtconrad': 'QT Conrad',
  'kittyofconfetti': 'Kittyofconfetti',
  'prodoglover': 'Prodoglover',
  'themathyguy': 'Themathyguy',
  'lune': 'Lune',
  'orbital': 'Orbital',
  'soomies': 'Soomies'
};

export function getVictorName(victor?: { id?: string; name?: string }): string {
  if (!victor) return 'Unknown Player';
  if (victor.name && victor.name.trim()) return victor.name;
  if (!victor.id) return 'Unknown Player';
  const slug = victor.id.replace(/^vic-\d+-/, '');
  if (PLAYER_SLUG_NAME_MAP[slug]) return PLAYER_SLUG_NAME_MAP[slug];
  return slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Unknown Player';
}

/**
 * Preset point values for ranks 1 to 200.
 * Any verified rank beyond 200 awards 1 point.
 */
export const RANK_POINTS_PRESET: number[] = [
  350, 325, 300, 275, 250, 230, 220, 210, 200, 190,
  180, 175, 170, 165, 160, 155, 150, 145, 140, 135,
  130, 125, 120, 115, 110, 105,
  100, 100, 100, 100,
  90, 90, 90, 90, 90,
  80, 80, 80, 80, 80,
  70, 70, 70, 70, 70,
  67,
  65, 65, 65, 65,
  60, 60, 60, 60, 60,
  55, 55, 55, 55, 55,
  50, 50, 50, 50, 50,
  45, 45, 45, 45, 45,
  40, 40, 40, 40, 40,
  35, 35, 35, 35, 35,
  30, 30, 30, 30, 30,
  25, 25, 25, 25, 25,
  20, 20, 20, 20, 20,
  15, 15, 15, 15, 15,
  10, 10, 10, 10, 10,
  9, 9, 9, 9, 9, 9, 9, 9, 9, 9,
  8, 8, 8, 8, 8, 8, 8, 8, 8, 8,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
  5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
  4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
  3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
  2, 2, 2, 2, 2
];

/**
 * Calculates point value based on level rank placement according to the official preset table.
 * Ranks 1-200 map to the preset table, and any rank beyond 200 awards 1 point.
 */
export function getPointsForRank(rank: number): number {
  if (typeof rank !== 'number' || rank <= 0 || isNaN(rank)) return 0;
  const index = Math.floor(rank) - 1;
  if (index < RANK_POINTS_PRESET.length) {
    return RANK_POINTS_PRESET[index];
  }
  return 1;
}

/**
 * Checks if a level has a verified record / verifier.
 * Unverified levels have empty, '-', 'none', or 'unverified' verifier field.
 */
export function isLevelVerified(level?: { verifier?: string } | null): boolean {
  if (!level || !level.verifier) return false;
  const v = level.verifier.trim().toLowerCase();
  return v !== '' && v !== 'unverified' && v !== '-' && v !== 'none' && v !== 'unknown' && v !== 'unknown verifier';
}

/**
 * Builds a map from level ID to its 1-based placement among verified levels only,
 * ordered by the level's rank ascending.
 */
export function getVerifiedPlacements(levels: { id: string; rank: number; verifier?: string }[]): Map<string, number> {
  const verifiedMap = new Map<string, number>();
  const sorted = [...levels].sort((a, b) => a.rank - b.rank);
  let currentVerifiedRank = 1;
  for (const lvl of sorted) {
    if (isLevelVerified(lvl)) {
      verifiedMap.set(lvl.id, currentVerifiedRank);
      currentVerifiedRank++;
    }
  }
  return verifiedMap;
}

/**
 * Calculates point value for a level.
 * Unverified levels give 0 points.
 * Verified levels get points based on their placement on the verified levels list.
 */
export function getLevelPoints(level: { id: string; rank: number; verifier?: string }, verifiedPlacement?: number): number {
  if (!isLevelVerified(level)) return 0;
  const rank = verifiedPlacement ?? level.rank;
  return getPointsForRank(rank);
}

/**
 * Sorts victors so that the level verifier(s) come first,
 * followed by all other victors ordered alphabetically by name.
 */
export function sortVictors(victors?: Victor[], verifierName?: string): Victor[] {
  if (!victors || !Array.isArray(victors)) return [];
  const verifierLower = (verifierName || '').toLowerCase().trim();

  return [...victors].sort((a, b) => {
    const aName = getVictorName(a);
    const bName = getVictorName(b);
    const aNameLower = aName.toLowerCase().trim();
    const bNameLower = bName.toLowerCase().trim();

    const aIsVer = Boolean(a?.isVerifier) || (verifierLower && verifierLower.includes(aNameLower));
    const bIsVer = Boolean(b?.isVerifier) || (verifierLower && verifierLower.includes(bNameLower));

    if (aIsVer && !bIsVer) return -1;
    if (!aIsVer && bIsVer) return 1;

    return aName.localeCompare(bName, undefined, { sensitivity: 'base' });
  });
}

/**
 * Extracts the Level ID from a level URL.
 * URL format: https://jellycade.com/games/goober-dash?g_play=048daa76-753d-408f-97bf-83b437da102e
 * Returns the Level ID (e.g. 048daa76-753d-408f-97bf-83b437da102e) or 'N/A' if default/not found.
 */
export function getLevelIdFromLink(url?: string): string {
  if (!url || !url.trim()) return 'N/A';
  const trimmed = url.trim();

  // Look for g_play parameter first
  const gPlayMatch = trimmed.match(/[?&]g_play=([^&#]+)/i);
  if (gPlayMatch && gPlayMatch[1]) {
    return decodeURIComponent(gPlayMatch[1].trim());
  }

  // Check default base link
  const cleanUrl = trimmed.replace(/\/$/, '').toLowerCase();
  if (
    cleanUrl === 'https://jellycade.com/games/goober-dash' ||
    cleanUrl === 'https://gooberdash.winterpixel.io'
  ) {
    return 'N/A';
  }

  // URL query parameter parsing fallback
  try {
    const parsed = new URL(trimmed);
    const paramVal =
      parsed.searchParams.get('g_play') ||
      parsed.searchParams.get('id') ||
      parsed.searchParams.get('level');
    if (paramVal && paramVal.trim()) {
      return paramVal.trim();
    }
    const parts = parsed.pathname.replace(/\/$/, '').split('/');
    const last = parts[parts.length - 1];
    if (last && last.toLowerCase() !== 'goober-dash' && last.toLowerCase() !== 'games') {
      return last;
    }
  } catch {
    if (trimmed.includes('=')) {
      const parts = trimmed.split('=');
      const candidate = parts[parts.length - 1].trim();
      if (candidate) return candidate;
    }
  }

  return 'N/A';
}

