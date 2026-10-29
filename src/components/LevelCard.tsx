import React, { useState } from 'react';
import { Copy, Check, Play } from 'lucide-react';
import { KaizoLevel } from '../types/kaizo';
import { getPointsForRank, isLevelVerified, getLevelIdFromLink } from '../utils/kaizoUtils';

interface LevelCardProps {
  level: KaizoLevel;
  displayRank?: number;
  points?: number;
  onSelectLevel: (level: KaizoLevel) => void;
  onQuickPlay: (url: string, e: React.MouseEvent) => void;
}

export const LevelCard: React.FC<LevelCardProps> = ({
  level,
  displayRank,
  points: customPoints,
  onSelectLevel,
  onQuickPlay,
}) => {
  const [copied, setCopied] = useState(false);

  if (!level) return null;

  const calculatedLevelId = getLevelIdFromLink(level.directPlayUrl);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(calculatedLevelId !== 'N/A' ? calculatedLevelId : level.directPlayUrl || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRankBadgeStyle = (rank: number) => {
    if (rank === 1) return 'bg-amber-500/20 text-amber-300 border-amber-500/40 ring-1 ring-amber-500/30';
    if (rank === 2) return 'bg-slate-300/20 text-slate-200 border-slate-400/40';
    if (rank === 3) return 'bg-amber-700/20 text-amber-400 border-amber-700/40';
    return 'bg-slate-800 text-slate-400 border-slate-700';
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Impossible Kaizo':
        return 'text-slate-100 !bg-slate-950 border-slate-700 shadow-[0_0_8px_rgba(255,255,255,0.15)]';
      case 'Silent Kaizo':
        return 'text-fuchsia-400';
      case 'Extreme Kaizo':
        return 'text-rose-400';
      case 'Insane Kaizo':
        return 'text-amber-400';
      case 'High Kaizo':
        return 'text-cyan-400';
      default:
        return 'text-emerald-400';
    }
  };

  const verified = isLevelVerified(level);
  const effectiveRank = displayRank ?? level.rank ?? 999;
  const points = customPoints !== undefined ? customPoints : (verified ? getPointsForRank(effectiveRank) : 0);
  const victorCount = Array.isArray(level.victors) ? level.victors.length : 0;

  return (
    <div
      onClick={() => onSelectLevel(level)}
      className="group relative bg-[#111927]/90 hover:bg-[#141e30] border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between h-auto md:h-[152px] min-h-[152px]"
    >
      {/* Left side: Zoomed-in diagonal thumbnail cut off by the diagonal line + Rank # + Level Info */}
      <div className="flex items-center flex-1 min-w-0 h-full">
        {/* Full-height diagonal thumbnail container */}
        {level.thumbnailUrl ? (
          <div className="relative w-36 sm:w-52 md:w-64 shrink-0 self-stretch h-full overflow-hidden select-none [clip-path:polygon(0_0,100%_0,calc(100%-28px)_100%,0_100%)] bg-slate-900 border-r border-slate-700/40">
            {/* The image is zoomed in and cut off cleanly by the diagonal line */}
            <img
              src={level.thumbnailUrl}
              alt={`${level.name || 'Level'} preview`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center scale-110 group-hover:scale-125 transition-transform duration-300 filter brightness-95 group-hover:brightness-105"
            />
            {/* Subtle contrast gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/35 pointer-events-none" />
          </div>
        ) : (
          <div className="relative w-36 sm:w-52 md:w-64 shrink-0 self-stretch h-full overflow-hidden select-none [clip-path:polygon(0_0,100%_0,calc(100%-28px)_100%,0_100%)] bg-slate-900/80 border-r border-slate-700/40 flex items-center justify-center text-slate-500 font-mono text-xs">
            <span>No preview</span>
          </div>
        )}

        {/* Content block: Rank # + Info */}
        <div className="flex items-center gap-3.5 sm:gap-5 flex-1 min-w-0 py-3.5 pr-4 pl-4 h-full">
          {/* Rank Number */}
          <div
            className={`w-13 h-13 sm:w-14 sm:h-14 shrink-0 rounded-xl flex items-center justify-center font-extrabold text-xl font-heading border tabular-nums shadow-inner ${getRankBadgeStyle(
              effectiveRank
            )}`}
          >
            #{effectiveRank}
          </div>

          {/* Level Info */}
          <div className="min-w-0 flex-1 flex flex-col justify-center gap-1.5">
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-amber-400 transition-colors font-heading truncate">
                {level.name || 'Untitled Level'}
              </h3>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-800 shrink-0 ${getDifficultyColor(level.difficulty || 'Entry Kaizo')}`}>
                {level.difficulty || 'Entry Kaizo'}
              </span>
              {!verified && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 shrink-0">
                  Unverified
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 flex-wrap truncate">
              <span className="truncate">By <strong className="text-slate-200 font-medium">{level.creator || 'Unknown'}</strong></span>
              <span aria-hidden="true" className="text-slate-600 shrink-0">·</span>
              {verified ? (
                <span className="truncate">Verified by <strong className="text-slate-200 font-medium">{level.verifier}</strong></span>
              ) : (
                <span className="truncate text-amber-400/90 font-medium">Unverified</span>
              )}
              {level.worldRecord && level.worldRecord !== '-' && (
                <>
                  <span aria-hidden="true" className="text-slate-600 shrink-0">·</span>
                  <span className="shrink-0">WR: <strong className="text-cyan-300 font-semibold">{level.worldRecord}</strong></span>
                </>
              )}
            </div>

            {/* Clean unboxed metadata */}
            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-400 flex-wrap mt-0.5">
              <span className={`${verified ? 'text-amber-400 font-semibold' : 'text-slate-500 font-medium'} tabular-nums shrink-0`}>
                {points} pts {!verified && '(Unverified)'}
              </span>
              <span aria-hidden="true" className="text-slate-600 shrink-0">·</span>
              <span className="text-emerald-400 font-semibold tabular-nums shrink-0">
                {victorCount} {victorCount === 1 ? 'victor' : 'victors'}
              </span>
              <span aria-hidden="true" className="text-slate-600 shrink-0">·</span>
              <button
                onClick={handleCopyCode}
                title="Copy Goober Dash level ID"
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors font-mono tabular-nums text-xs shrink-0 bg-slate-900/60 hover:bg-slate-800 px-2 py-1 rounded border border-slate-800"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>{calculatedLevelId}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Action controls */}
      <div className="flex items-center gap-2.5 p-4 md:pr-5 md:pl-2 justify-end shrink-0 border-t md:border-t-0 border-slate-800/60 h-full">
        <button
          onClick={(e) => onQuickPlay(level.directPlayUrl || 'https://jellycade.com/games/goober-dash', e)}
          className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all rounded-lg shadow-md whitespace-nowrap"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Play Level</span>
        </button>

        <button
          onClick={() => onSelectLevel(level)}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/70 rounded-lg transition-colors whitespace-nowrap"
        >
          <span>View Details & Victors</span>
        </button>
      </div>
    </div>
  );
};
