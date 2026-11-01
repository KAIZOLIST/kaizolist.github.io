import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Trophy,
  Flame,
  Check,
  Video,
  ExternalLink,
  Search,
  Sparkles,
  Play,
  Copy,
  CheckCheck,
  ChevronRight,
  ShieldCheck,
  Crown,
  Disc,
  Shuffle
} from 'lucide-react';
import { KaizoLevel } from '../types/kaizo';
import {
  calculatePlayerLeaderboard,
  getGemstoneForPlacement,
  normalizePlayerName,
  PlayerStats,
  GEMSTONE_TIERS
} from '../utils/playerStats';
import { getPointsForRank, getLevelIdFromLink, getVerifiedPlacements, isLevelVerified } from '../utils/kaizoUtils';
import { GemstoneIcon } from './GemstoneIcon';
import { fetchLevelThumbnail, subscribeToLevelThumbnail } from '../lib/firebase';

const PlayerLevelThumbnail: React.FC<{
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
      <div className="w-16 h-10 sm:w-20 sm:h-12 rounded-lg shrink-0 bg-slate-900/80 border border-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-mono">
        No image
      </div>
    );
  }

  return (
    <div className="w-16 h-10 sm:w-20 sm:h-12 rounded-lg overflow-hidden shrink-0 bg-slate-900 border border-slate-700/60 relative">
      <img
        src={thumb}
        alt=""
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
      />
    </div>
  );
};

interface PlayerProfileModalProps {
  playerName: string | null;
  levels: KaizoLevel[];
  onClose: () => void;
  onSelectLevel: (level: KaizoLevel) => void;
  onQuickPlay?: (url: string, e: React.MouseEvent) => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  playerName,
  levels,
  onClose,
  onSelectLevel,
  onQuickPlay
}) => {
  const [activeTab, setActiveTab] = useState<'checklist' | 'completions' | 'gemstones'>('checklist');
  const [checklistSearch, setChecklistSearch] = useState('');
  const [checklistFilter, setChecklistFilter] = useState<'all' | 'completed' | 'uncompleted'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningDisplayLevel, setSpinningDisplayLevel] = useState<KaizoLevel | null>(null);
  const [spunLevel, setSpunLevel] = useState<KaizoLevel | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  // Compute all player stats and find current player
  const leaderboard = useMemo(() => calculatePlayerLeaderboard(levels), [levels]);
  const verifiedPlacements = useMemo(() => getVerifiedPlacements(levels), [levels]);

  // Only verified levels should appear in the personalized checklist
  const verifiedLevels = useMemo(() => {
    return Array.isArray(levels) ? levels.filter((lvl) => isLevelVerified(lvl)) : [];
  }, [levels]);

  const playerStats: PlayerStats | undefined = useMemo(() => {
    if (!playerName) return undefined;
    const targetKey = normalizePlayerName(playerName);
    return leaderboard.find((p) => normalizePlayerName(p.name) === targetKey);
  }, [playerName, leaderboard]);

  const completedLevelIds = useMemo(() => {
    return playerStats ? playerStats.completedLevelIds : new Set<string>();
  }, [playerStats]);

  const incompleteLevelsForSpin = useMemo(() => {
    return verifiedLevels.filter((lvl) => {
      const isCompleted = completedLevelIds.has(lvl.id);
      if (isCompleted) return false;
      if (selectedDifficulty !== 'All' && lvl.difficulty !== selectedDifficulty) return false;
      if (checklistSearch.trim()) {
        const q = checklistSearch.toLowerCase();
        const code = getLevelIdFromLink(lvl.directPlayUrl);
        const matches =
          lvl.name.toLowerCase().includes(q) ||
          lvl.creator.toLowerCase().includes(q) ||
          code.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [verifiedLevels, completedLevelIds, selectedDifficulty, checklistSearch, verifiedPlacements]);

  const handleSpinRandomIncomplete = () => {
    const available = incompleteLevelsForSpin.length > 0
      ? incompleteLevelsForSpin
      : verifiedLevels.filter(lvl => !completedLevelIds.has(lvl.id));

    if (available.length === 0) return;

    setIsSpinning(true);
    setSpunLevel(null);

    let counter = 0;
    const maxTicks = 18;
    const interval = window.setInterval(() => {
      const randomIndex = Math.floor(Math.random() * available.length);
      setSpinningDisplayLevel(available[randomIndex]);
      counter++;

      if (counter >= maxTicks) {
        window.clearInterval(interval);
        const finalRandomLevel = available[Math.floor(Math.random() * available.length)];
        setSpunLevel(finalRandomLevel);
        setIsSpinning(false);
        setIsResultModalOpen(true);
      }
    }, 80);
  };

  const completionDetailsMap = useMemo(() => {
    const map = new Map<string, { isVerifier: boolean; isWorldRecord: boolean; videoUrl?: string; pointsEarned: number }>();
    if (playerStats) {
      playerStats.completions.forEach((c) => {
        map.set(c.level.id, {
          isVerifier: c.isVerifier,
          isWorldRecord: c.isWorldRecord,
          videoUrl: c.videoUrl,
          pointsEarned: c.pointsEarned
        });
      });
    }
    return map;
  }, [playerStats]);

  // Filtered levels for the personalized checklist (Verified levels only)
  const filteredChecklistLevels = useMemo(() => {
    const sorted = [...verifiedLevels].sort((a, b) => {
      const aVerRank = verifiedPlacements.get(a.id) ?? a.rank;
      const bVerRank = verifiedPlacements.get(b.id) ?? b.rank;
      return aVerRank - bVerRank;
    });

    return sorted.filter((lvl) => {
      const isCompleted = completedLevelIds.has(lvl.id);
      if (checklistFilter === 'completed' && !isCompleted) return false;
      if (checklistFilter === 'uncompleted' && isCompleted) return false;

      if (selectedDifficulty !== 'All' && lvl.difficulty !== selectedDifficulty) {
        return false;
      }

      if (checklistSearch.trim()) {
        const q = checklistSearch.toLowerCase();
        const code = getLevelIdFromLink(lvl.directPlayUrl);
        return (
          lvl.name.toLowerCase().includes(q) ||
          lvl.creator.toLowerCase().includes(q) ||
          code.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [verifiedLevels, checklistFilter, selectedDifficulty, checklistSearch, completedLevelIds, verifiedPlacements]);

  if (!playerName) return null;

  // Fallback if player had 0 completions and wasn't in leaderboard
  const displayName = playerStats ? playerStats.name : playerName;
  const placement = playerStats?.placement;
  const gemstone = getGemstoneForPlacement(placement);

  const totalLevelsCount = verifiedLevels.length;
  const completedCount = playerStats?.totalCompletions || 0;
  const completionPercentage = totalLevelsCount > 0 ? ((completedCount / totalLevelsCount) * 100).toFixed(1) : '0';

  const handleSelectLevel = (lvl: KaizoLevel) => {
    onSelectLevel(lvl);
    onClose();
  };

  const handleCopyCode = (levelId: string, directUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const code = getLevelIdFromLink(directUrl);
    navigator.clipboard.writeText(code !== 'N/A' ? code : directUrl || '');
    setCopiedId(levelId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Impossible Kaizo':
        return 'text-slate-100 bg-slate-950 border-slate-700';
      case 'Silent Kaizo':
        return 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30';
      case 'Extreme Kaizo':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'Insane Kaizo':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'High Kaizo':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      default:
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-5xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col transition-all"
        style={{
          background: `linear-gradient(180deg, ${gemstone.hex}35 0%, #0c121e 55%, #080d16 100%)`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dynamic Gemstone Glow Atmosphere */}
        <div
          className={`absolute top-0 left-0 right-0 h-80 pointer-events-none opacity-35 bg-gradient-to-b ${gemstone.modalGlow}`}
        />

        {/* Modal Header */}
        <div className="relative z-10 px-6 py-5 border-b border-slate-800/90 bg-[#0d1422]/80 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* Gemstone Rank Shield Avatar */}
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shrink-0 flex flex-col items-center justify-center border border-slate-700/80 ${gemstone.bgTint} shadow-lg relative overflow-hidden`}
            >
              <GemstoneIcon name={gemstone.name} size={30} className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-md" />
              <span className={`text-[10px] font-extrabold uppercase font-mono tracking-wider mt-0.5 ${gemstone.textClass}`}>
                {gemstone.name}
              </span>
            </div>

            {/* Player Info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-black text-white font-heading tracking-tight truncate">
                  {displayName}
                </h2>
                <div className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-sm ${gemstone.badgeClass}`}>
                  <GemstoneIcon name={gemstone.name} className="w-3.5 h-3.5 shrink-0" />
                  <span>{gemstone.title}</span>
                  {placement && <span>· #{placement}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 mt-1 flex-wrap">
                {placement ? (
                  <span className="font-semibold text-slate-200">
                    Victors Hall Placement: <strong className="text-white">#{placement}</strong> of {leaderboard.length} players
                  </span>
                ) : (
                  <span className="text-slate-500">Unplaced in Victors Hall</span>
                )}
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-emerald-400 font-medium">
                  {completedCount} {completedCount === 1 ? 'completion' : 'completions'} ({completionPercentage}% cleared)
                </span>
                {playerStats && playerStats.createdCount > 0 && (
                  <>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-amber-400 font-medium">
                      {playerStats.createdCount} {playerStats.createdCount === 1 ? 'level created' : 'levels created'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="self-end sm:self-center p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="Close Profile"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Highlights / Stats Grid */}
        <div className="relative z-10 px-6 py-4 bg-[#0a0f1a]/80 border-b border-slate-800/80">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Gemstone Rank */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-[#111927]/90 transition-all">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1">
                <span>Gemstone Rank</span>
                <GemstoneIcon name={gemstone.name} className="w-4 h-4 shrink-0" />
              </div>
              <div className={`text-base sm:text-lg font-black truncate font-heading ${gemstone.textClass}`}>
                {gemstone.title}
              </div>
              <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                {gemstone.tierLabel}
              </span>
            </div>

            {/* Total Points */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-[#111927]">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1">
                <span>Final Score</span>
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-base sm:text-lg font-black text-amber-400 font-heading tabular-nums">
                {playerStats ? playerStats.finalScore.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : '0'} pts
              </div>
              <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                Raw: {playerStats ? playerStats.rawScore : 0} pts
              </span>
            </div>

            {/* Kaizos Completed Progress */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-[#111927]">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1">
                <span>Kaizos Conquered</span>
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-base sm:text-lg font-black text-emerald-400 font-heading tabular-nums">
                {completedCount} <span className="text-xs text-slate-400 font-normal">/ {totalLevelsCount}</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(1, Number(completionPercentage)))}%` }}
                />
              </div>
            </div>

            {/* Hardest Completed */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-[#111927]">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1">
                <span>Hardest Completion</span>
                <Flame className="w-3.5 h-3.5 text-rose-400" />
              </div>
              {playerStats?.hardestLevel ? (
                <div
                  onClick={() => handleSelectLevel(playerStats.hardestLevel!)}
                  className="cursor-pointer group"
                >
                  <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                    {playerStats.hardestLevel.name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
                    <span className="text-rose-400 font-mono font-bold">
                      #{playerStats.hardestPlacement ?? playerStats.hardestLevel.rank}
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="text-amber-400 font-mono">
                      {getPointsForRank(playerStats.hardestPlacement ?? playerStats.hardestLevel.rank)} pts
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic mt-1">
                  No verified clears yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="relative z-10 px-6 pt-3 bg-[#0c121e]/90 border-b border-slate-800/80 flex items-center gap-6 text-xs sm:text-sm font-medium">
          <button
            onClick={() => setActiveTab('checklist')}
            className={`pb-3 font-semibold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'checklist'
                ? 'text-white border-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <CheckCheck className="w-4 h-4" />
            <span>Personalized Kaizo Checklist</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
              activeTab === 'checklist' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
            }`}>
              {completedCount}/{totalLevelsCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('completions')}
            className={`pb-3 font-semibold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'completions'
                ? 'text-white border-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Completions</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-slate-400">
              {playerStats?.completions.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('gemstones')}
            className={`pb-3 font-semibold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'gemstones'
                ? 'text-white border-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Gemstone Rank</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="relative z-10 overflow-y-auto p-6 flex-1 space-y-6">
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              {/* Checklist Controls: Search & Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111927] p-3 rounded-xl border border-slate-800">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search level name, creator, or code..."
                    value={checklistSearch}
                    onChange={(e) => setChecklistSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Status Toggle */}
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 shrink-0">
                  <button
                    onClick={() => setChecklistFilter('all')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      checklistFilter === 'all'
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All ({totalLevelsCount})
                  </button>
                  <button
                    onClick={() => setChecklistFilter('completed')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
                      checklistFilter === 'completed'
                        ? 'bg-emerald-400 text-slate-950 shadow-sm font-bold'
                        : 'text-emerald-400 hover:text-emerald-300'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Completed ({completedCount})</span>
                  </button>
                  <button
                    onClick={() => setChecklistFilter('uncompleted')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      checklistFilter === 'uncompleted'
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Incomplete ({totalLevelsCount - completedCount})
                  </button>
                </div>

                {/* Difficulty Filter */}
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none cursor-pointer"
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

              {/* Random Incomplete Level Spinner (visible in Incomplete tab) */}
              {checklistFilter === 'uncompleted' && (
                <div className="bg-gradient-to-r from-slate-900 via-[#141e30] to-slate-900 border border-slate-700/80 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
                  
                  <div className="flex items-center gap-3.5 relative z-10 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-amber-400 shadow-inner">
                      <Disc className={`w-6 h-6 ${isSpinning ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white font-heading flex items-center gap-2">
                        <span>Random Incomplete Level Spinner</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-amber-300 border border-slate-700">
                          {incompleteLevelsForSpin.length} Available
                        </span>
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {isSpinning 
                          ? `Spinning wheel... #${verifiedPlacements.get(spinningDisplayLevel?.id || '') ?? spinningDisplayLevel?.rank ?? ''} ${spinningDisplayLevel?.name || ''}` 
                          : 'Spin the wheel to pick a random incomplete Kaizo level to conquer next!'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 relative z-10 shrink-0 w-full sm:w-auto justify-end">
                    {isSpinning ? (
                      <div className="px-4 py-2.5 bg-slate-900 border border-amber-500/50 rounded-xl font-mono text-xs text-amber-300 animate-pulse flex items-center gap-2 shadow-lg">
                        <Disc className="w-4 h-4 animate-spin text-amber-400" />
                        <span>Spinning...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSpinRandomIncomplete}
                          disabled={isSpinning || incompleteLevelsForSpin.length === 0}
                          className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 font-heading tracking-wide"
                        >
                          <Shuffle className="w-4 h-4" />
                          <span>Spin Random Level</span>
                        </button>
                        {spunLevel && (
                          <button
                            onClick={() => setIsResultModalOpen(true)}
                            className="px-3.5 py-2.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all active:scale-95"
                          >
                            View Last Result
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Personalized Kaizo Levels List */}
              {filteredChecklistLevels.length === 0 ? (
                <div className="p-12 text-center bg-[#111927] border border-slate-800 rounded-xl text-slate-400 text-xs">
                  No levels match your current search or filter criteria.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredChecklistLevels.map((lvl) => {
                    const isCompleted = completedLevelIds.has(lvl.id);
                    const completionInfo = completionDetailsMap.get(lvl.id);
                    const verifiedRank = verifiedPlacements.get(lvl.id);
                    const pts = verifiedRank ? getPointsForRank(verifiedRank) : getPointsForRank(lvl.rank);
                    const calculatedLevelId = getLevelIdFromLink(lvl.directPlayUrl);

                    return (
                      <div
                        key={lvl.id}
                        onClick={() => handleSelectLevel(lvl)}
                        className={`group relative rounded-xl border p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 transition-all cursor-pointer ${
                          isCompleted
                            ? 'bg-[#0c1f17] border-emerald-500/50 shadow-[0_0_18px_rgba(16,185,129,0.12)] hover:bg-[#0f271d] hover:border-emerald-400'
                            : 'bg-[#111927]/80 hover:bg-[#141e30] border-slate-800/80 hover:border-slate-700 opacity-80 hover:opacity-100'
                        }`}
                      >
                        {/* Left block: Rank + Thumbnail Preview + Level details */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          {/* Rank badge */}
                          <div
                            className={`w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-lg flex items-center justify-center font-bold text-sm font-heading tabular-nums border ${
                              isCompleted
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            #{verifiedRank ?? lvl.rank}
                          </div>

                          {/* Thumbnail preview if available */}
                          <PlayerLevelThumbnail levelId={lvl.id} rank={lvl.rank} chunkId={lvl.imageChunkId} initialUrl={lvl.thumbnailUrl} />

                          {/* Level Details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4
                                className={`text-base font-bold font-heading truncate transition-colors ${
                                  isCompleted ? 'text-white group-hover:text-emerald-300' : 'text-slate-200 group-hover:text-amber-400'
                                }`}
                              >
                                {lvl.name}
                              </h4>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getDifficultyColor(lvl.difficulty)}`}>
                                {lvl.difficulty}
                              </span>
                              {completionInfo?.isVerifier && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                                  Level Verifier (+10%)
                                </span>
                              )}
                              {completionInfo?.isWorldRecord && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
                                  World Record (+15%)
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                              <span className="truncate">By <strong className="text-slate-300">{lvl.creator}</strong></span>
                              <span aria-hidden="true" className="text-slate-600">·</span>
                              <span className={`${isCompleted ? 'text-emerald-400 font-bold' : 'text-amber-400 font-semibold'} font-mono`}>
                                {pts} pts
                              </span>
                              <span aria-hidden="true" className="text-slate-600">·</span>
                              <button
                                onClick={(e) => handleCopyCode(lvl.id, lvl.directPlayUrl, e)}
                                className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400 hover:text-slate-200 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 transition-colors"
                                title="Copy Level Code"
                              >
                                {copiedId === lvl.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span className="text-emerald-400">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>{calculatedLevelId}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Right block: Big Green Checkmark on completed, or uncompleted status */}
                        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                          {isCompleted ? (
                            <div className="flex items-center gap-2">
                              {completionInfo?.videoUrl && (
                                <a
                                  href={completionInfo.videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs transition-colors"
                                  title="Watch victory recording"
                                >
                                  <Video className="w-3.5 h-3.5 text-rose-400" />
                                  <span className="hidden sm:inline">Proof</span>
                                  <ExternalLink className="w-3 h-3 text-slate-400" />
                                </a>
                              )}

                              {/* Prominent Big Green Checkmark */}
                              <div
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 font-extrabold text-xs uppercase tracking-wider shadow-md shadow-emerald-950/50"
                                title="Conquered by this player"
                              >
                                <div className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center font-bold">
                                  <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                                </div>
                                <span>Completed</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {onQuickPlay && (
                                <button
                                  onClick={(e) => onQuickPlay(lvl.directPlayUrl, e)}
                                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                                  title="Play level"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                </button>
                              )}
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-500 text-xs font-medium bg-slate-900/50">
                                <span>Not Completed</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'completions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Verified Completions ({playerStats?.completions.length || 0})</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  Total Earned: <strong className="text-amber-400">{playerStats ? playerStats.finalScore : 0} pts</strong>
                </span>
              </div>

              {!playerStats || playerStats.completions.length === 0 ? (
                <div className="p-12 text-center bg-[#111927] border border-slate-800 rounded-xl text-slate-400 text-xs">
                  This player has no verified level completions registered on the list yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {playerStats.completions.map((comp) => {
                    const verifiedRank = verifiedPlacements.get(comp.level.id) ?? comp.level.rank;
                    return (
                      <div
                        key={comp.level.id}
                        onClick={() => handleSelectLevel(comp.level)}
                        className="p-3.5 rounded-xl border border-slate-800 bg-[#111927] hover:bg-[#141e30] transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-mono text-xs font-bold text-white">
                              #{verifiedRank}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getDifficultyColor(comp.level.difficulty)}`}>
                              {comp.level.difficulty}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1 font-heading">
                            {comp.level.name}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            By {comp.level.creator}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-amber-400 font-mono font-bold">
                              +{comp.pointsEarned} pts
                            </span>
                            {comp.isVerifier && (
                              <span className="text-[9px] px-1 bg-amber-500/20 text-amber-300 rounded">
                                Verifier (+10%)
                              </span>
                            )}
                            {comp.isWorldRecord && (
                              <span className="text-[9px] px-1 bg-cyan-500/20 text-cyan-300 rounded">
                                WR (+15%)
                              </span>
                            )}
                          </div>

                          {comp.videoUrl && (
                            <a
                              href={comp.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-400 hover:text-white p-1 rounded"
                              title="Watch Video Proof"
                            >
                              <Video className="w-3.5 h-3.5 text-rose-400" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'gemstones' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(GEMSTONE_TIERS).map(([key, tier]) => {
                  const isCurrent = gemstone.name.toLowerCase() === tier.name.toLowerCase();
                  return (
                    <div
                      key={key}
                      className={`p-4 rounded-xl border transition-all ${
                        isCurrent
                          ? `${tier.borderClass} ${tier.bgTint} ${tier.borderGlowClass} ring-2 ring-amber-400/50`
                          : 'border-slate-800/80 bg-[#111927]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <GemstoneIcon name={tier.name} size={28} className="w-7 h-7 shrink-0 drop-shadow-sm" />
                          <div>
                            <h4 className={`text-sm font-bold font-heading ${tier.textClass}`}>
                              {tier.title}
                            </h4>
                            <span className="text-[11px] text-slate-400 font-mono block">
                              {tier.tierLabel}
                            </span>
                          </div>
                        </div>

                        {isCurrent && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold uppercase tracking-wider">
                            Current
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2 flex items-center justify-between">
                        <span>Profile Theme</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tier.hex }} />
                          <span className="font-mono text-slate-300 capitalize">{tier.name}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="relative z-10 px-6 py-3.5 bg-[#0a0f1a]/90 border-t border-slate-800/90 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Official GDKL Player Record</span>
            {placement && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-slate-300 font-medium">{gemstone.title} (#{placement})</span>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium transition-colors"
          >
            Close Profile
          </button>
        </div>
      </div>

      {/* Random Level Result Popup Modal */}
      {isResultModalOpen && spunLevel && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#111927] border border-amber-400/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-amber-500/20 to-transparent pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-amber-400/50 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
                <Disc className="w-8 h-8 animate-spin" />
              </div>
              <span className="text-xs font-mono font-bold tracking-widest uppercase text-amber-400">
                Random Incomplete Level Picked!
              </span>
              <h3 className="text-2xl font-black text-white font-heading mt-1">
                {spunLevel.name}
              </h3>
            </div>

            <div 
              onClick={() => {
                setIsResultModalOpen(false);
                handleSelectLevel(spunLevel);
              }}
              className="relative z-10 bg-slate-900 border border-slate-700/80 rounded-xl p-4 text-left cursor-pointer group hover:border-amber-400/60 transition-all flex items-center gap-4"
            >
              <PlayerLevelThumbnail levelId={spunLevel.id} rank={spunLevel.rank} chunkId={spunLevel.imageChunkId} initialUrl={spunLevel.thumbnailUrl} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                    #{verifiedPlacements.get(spunLevel.id) ?? spunLevel.rank}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getDifficultyColor(spunLevel.difficulty)}`}>
                    {spunLevel.difficulty}
                  </span>
                </div>
                
                <h4 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors font-heading truncate mt-1">
                  {spunLevel.name}
                </h4>

                <div className="text-xs text-slate-400 truncate mt-0.5">
                  By <strong className="text-slate-200">{spunLevel.creator}</strong>
                </div>
                <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                  {getPointsForRank(verifiedPlacements.get(spunLevel.id) ?? spunLevel.rank)} pts
                </div>
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  setIsResultModalOpen(false);
                  if (onQuickPlay) {
                    onQuickPlay(spunLevel.directPlayUrl, { stopPropagation: () => {} } as any);
                  } else {
                    window.open(spunLevel.directPlayUrl, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="px-4 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play Level</span>
              </button>

              <button
                onClick={() => {
                  setIsResultModalOpen(false);
                  handleSpinRandomIncomplete();
                }}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Shuffle className="w-3.5 h-3.5 text-amber-400" />
                <span>Spin Again</span>
              </button>
            </div>

            <button
              onClick={() => setIsResultModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
