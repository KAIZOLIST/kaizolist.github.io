import React, { useState } from 'react';
import { Trophy, Medal, ChevronDown, ChevronUp } from 'lucide-react';
import { KaizoLevel } from '../types/kaizo';
import { getPointsForRank, getVictorName, getVerifiedPlacements } from '../utils/kaizoUtils';


interface VictorsHallProps {
  levels: KaizoLevel[];
  onSelectLevel: (level: KaizoLevel) => void;
}

interface PlayerStats {
  name: string;
  finalScore: number;
  rawScore: number;
  totalCompletions: number;
  verifierCount: number;
  wrCount: number;
  createdCount: number;
  hardestLevel: KaizoLevel | null;
  completions: Array<{
    level: KaizoLevel;
    videoUrl: string;
    isVerifier: boolean;
    isWorldRecord: boolean;
    pointsEarned: number;
  }>;
}

export const VictorsHall: React.FC<VictorsHallProps> = ({ levels, onSelectLevel }) => {
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [playerSearch, setPlayerSearch] = useState('');

  // ... (existing normalization helpers)
  const normalizePlayerName = (name: string): string => {
    if (!name) return '';
    const trimmed = name.trim();
    const lower = trimmed.toLowerCase();
    if (lower === 'sigmundfreud' || lower === 'toj sigmundfreud') {
      return 'toj sigmundfreud';
    }
    return lower;
  };

  const getCanonicalPlayerName = (name: string): string => {
    if (!name) return '';
    const trimmed = name.trim();
    const lower = trimmed.toLowerCase();
    if (lower === 'sigmundfreud' || lower === 'toj sigmundfreud') {
      return 'ToJ SigmundFreud';
    }
    return trimmed;
  };

  const getCreatedCount = (normalizedKey: string) => {
    let count = 0;
    levels.forEach((l) => {
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

  // Verified placements map for accurate point calculation and hardest completion tracking
  const verifiedPlacements = getVerifiedPlacements(levels);

  const isBetterVerifiedLevel = (newLevel: KaizoLevel, currentHardest: KaizoLevel | null): boolean => {
    const newVerifiedRank = verifiedPlacements.get(newLevel.id);
    if (!newVerifiedRank) return false;
    if (!currentHardest) return true;
    const currentVerifiedRank = verifiedPlacements.get(currentHardest.id);
    if (!currentVerifiedRank) return true;
    return newVerifiedRank < currentVerifiedRank;
  };

  // Aggregate stats per player
  const playerMap = new Map<string, PlayerStats>();

  levels.forEach((level) => {
    const verifiedRank = verifiedPlacements.get(level.id);
    const levelPoints = verifiedRank ? getPointsForRank(verifiedRank) : 0;
    const victorsProcessedKeys = new Set<string>();

    // Case-insensitive verifier keys for level
    const levelVerifierKeys = (level.verifier || '')
      .split(',')
      .map((s) => normalizePlayerName(s))
      .filter((k) => k && k !== '-' && k !== 'none');

    // Case-insensitive WR keys for level
    const levelWRKeys = (level.worldRecord || '')
      .split(',')
      .map((s) => normalizePlayerName(s))
      .filter((k) => k && k !== '-' && k !== 'none');

    level.victors.forEach((victor) => {
      const rawName = getVictorName(victor);
      const vKey = normalizePlayerName(rawName);
      if (!vKey) return;

      victorsProcessedKeys.add(vKey);
      const displayName = getCanonicalPlayerName(rawName);

      // Verifier status: victor flag OR level verifier match
      const isVerifier =
        Boolean(victor.isVerifier) ||
        levelVerifierKeys.includes(vKey) ||
        levelVerifierKeys.some((k) => k.includes(vKey) || vKey.includes(k));

      // WR status: victor flag OR level WR match
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

        if (isBetterVerifiedLevel(level, existing.hardestLevel)) {
          existing.hardestLevel = level;
        }
        existing.completions.push({
          level,
          videoUrl: victor.videoProofUrl || level.directPlayUrl || 'https://jellycade.com/games/goober-dash',
          isVerifier,
          isWorldRecord: isWR,
          pointsEarned: earnedPoints
        });
      } else {
        playerMap.set(vKey, {
          name: displayName,
          rawScore: levelPoints,
          finalScore: earnedPoints,
          totalCompletions: 1,
          verifierCount: isVerifier ? 1 : 0,
          wrCount: isWR ? 1 : 0,
          createdCount: getCreatedCount(vKey),
          hardestLevel: verifiedRank !== undefined ? level : null,
          completions: [
            {
              level,
              videoUrl: victor.videoProofUrl || level.directPlayUrl || 'https://jellycade.com/games/goober-dash',
              isVerifier,
              isWorldRecord: isWR,
              pointsEarned: earnedPoints
            }
          ]
        });
      }
    });

    // Also account for level.verifier if they verified this level but aren't explicitly listed in victors array
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
            if (isBetterVerifiedLevel(level, existing.hardestLevel)) {
              existing.hardestLevel = level;
            }
            existing.completions.push({
              level,
              videoUrl: level.directPlayUrl,
              isVerifier: true,
              isWorldRecord: false,
              pointsEarned: earnedPoints
            });
          } else {
            playerMap.set(verKey, {
              name: displayName,
              rawScore: levelPoints,
              finalScore: earnedPoints,
              totalCompletions: 1,
              verifierCount: 1,
              wrCount: 0,
              createdCount: getCreatedCount(verKey),
              hardestLevel: verifiedRank !== undefined ? level : null,
              completions: [
                {
                  level,
                  videoUrl: level.directPlayUrl,
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

  // Ensure players who created levels also appear if not already in playerMap
  levels.forEach((level) => {
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
          completions: []
        });
      }
    });
  });

  const sortedPlayers = Array.from(playerMap.values()).sort(
    (a, b) => b.finalScore - a.finalScore || b.totalCompletions - a.totalCompletions
  );

  const filteredPlayers = sortedPlayers.filter((p) => p.name.toLowerCase().includes(playerSearch.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="max-w-3xl">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-amber-400 mb-1">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Official Kaizo Player Leaderboard</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
          Victors Hall of Fame ({filteredPlayers.length} Ranked Players)
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Ranked by Final Score. Base level points are boosted by <strong className="text-amber-300 font-semibold">+10% for Level Verifier</strong> and <strong className="text-emerald-300 font-semibold">+15% for World Record holder</strong>.
        </p>
      {/* Search Input */}
      <div className="w-full sm:w-80 mt-4">
        <input
          type="text"
          placeholder="Search player name..."
          value={playerSearch}
          onChange={(e) => setPlayerSearch(e.target.value)}
          className="w-full bg-[#111927] border border-slate-700 text-white rounded-lg px-4 py-2 text-sm focus:border-amber-400 focus:outline-none"
        />
      </div>
    </div>

      {filteredPlayers.length === 0 ? (
        <div className="p-12 text-center bg-[#111927] border border-slate-800 rounded-2xl text-slate-400 text-sm">
          No players match your search criteria.
        </div>
      ) : (
        <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-2xl overflow-hidden bg-[#111927]/90 shadow-md">
          {filteredPlayers.map((player, idx) => {
            const rank = idx + 1;
            const isExpanded = expandedPlayer === player.name;
            const createdCount = player.createdCount;
            return (
              <div key={player.name} className="p-4 sm:p-5 hover:bg-[#141e30] transition-colors">
                <div
                  className="flex items-center justify-between gap-4 cursor-pointer"
                  onClick={() => setExpandedPlayer(isExpanded ? null : player.name)}
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    {/* Rank Badge */}
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm font-heading tabular-nums ${
                        rank === 1
                          ? 'bg-amber-400 text-slate-950 font-extrabold shadow-sm'
                          : rank === 2
                          ? 'bg-slate-300 text-slate-950 font-bold'
                          : rank === 3
                          ? 'bg-amber-700 text-amber-100 font-bold'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      #{rank}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base sm:text-lg font-bold text-white font-heading truncate">
                          {player.name}
                        </h4>
                        {rank <= 3 && (
                          <Medal className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        {player.verifierCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium">
                            {player.verifierCount} Verified
                          </span>
                        )}
                        {player.wrCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                            {player.wrCount} World Records
                          </span>
                        )}
                        {createdCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30 font-medium">
                            {createdCount} {createdCount === 1 ? 'Kaizo created' : 'Kaizos created'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span>
                          Hardest:{' '}
                          {player.hardestLevel && verifiedPlacements.get(player.hardestLevel.id) ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectLevel(player.hardestLevel!);
                              }}
                              className="text-amber-400 hover:underline font-semibold"
                            >
                              {player.hardestLevel.name} (#{verifiedPlacements.get(player.hardestLevel.id)})
                            </button>
                          ) : (
                            <span className="text-slate-500 italic">None</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-base sm:text-xl font-bold text-amber-400 block tabular-nums font-heading">
                        {player.finalScore.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} pts
                      </span>
                      <span className="text-xs text-slate-400 tabular-nums">
                        {player.totalCompletions}{' '}
                        {player.totalCompletions === 1 ? 'clear' : 'clears'}
                      </span>
                    </div>

                    <div className="p-1 text-slate-400">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Completions Drawer */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Completed Kaizo Gauntlets ({player.completions.length}):
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        Raw Base: {player.rawScore} pts
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto pr-1">
                      {player.completions.map((comp) => (
                        <div
                          key={comp.level.id}
                          className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-amber-400 font-bold shrink-0">
                                #{verifiedPlacements.get(comp.level.id) ?? comp.level.rank}
                              </span>
                              <button
                                onClick={() => onSelectLevel(comp.level)}
                                className="font-semibold text-white hover:text-amber-300 transition-colors text-left truncate"
                              >
                                {comp.level.name}
                              </button>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                              <span className="text-amber-300/90 font-mono font-medium">
                                +{comp.pointsEarned} pts
                              </span>
                              {comp.isVerifier && (
                                <span className="text-[9px] px-1 bg-amber-500/20 text-amber-300 rounded">
                                  Verifier (+10%)
                                </span>
                              )}
                              {comp.isWorldRecord && (
                                <span className="text-[9px] px-1 bg-emerald-500/20 text-emerald-300 rounded">
                                  World Record (+15%)
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => onSelectLevel(comp.level)}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white p-1 shrink-0"
                            title="View level details"
                          >
                            <span>View</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

