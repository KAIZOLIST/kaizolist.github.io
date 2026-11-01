import React, { useState, useEffect } from 'react';
import { Copy, Check, Play } from 'lucide-react';
import { KaizoLevel } from '../types/kaizo';
import { getPointsForRank, isLevelVerified, getLevelIdFromLink } from '../utils/kaizoUtils';
import { fetchLevelThumbnail, subscribeToLevelThumbnail } from '../lib/firebase';

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
  const [thumbnail, setThumbnail] = useState<string | null>(level?.thumbnailUrl || null);

  useEffect(() => {
    if (!level) return;
    let isMounted = true;
    if (level.thumbnailUrl) {
      setThumbnail(level.thumbnailUrl);
    } else {
      fetchLevelThumbnail(level.id, level.rank, level.imageChunkId).then((thumb) => {
        if (isMounted) {
          setThumbnail(thumb);
        }
      });
    }

    const unsubscribe = subscribeToLevelThumbnail(level.id, (newThumb: string | null) => {
      if (isMounted) {
        setThumbnail(newThumb);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [level?.id, level?.rank, level?.imageChunkId, level?.thumbnailUrl]);

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
    return 'bg-slate-900/90 text-slate-300 border-slate-700';
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
      onClick={() => onSelectLevel({ ...level, thumbnailUrl: thumbnail || level.thumbnailUrl })}
      className="group relative bg-[#111927]/90 hover:bg-[#141e30] border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between h-auto md:h-[152px] min-h-[152px]"
    >
      {/* MOBILE / TABLET VIEW (< md) */}
      <div className="flex md:hidden flex-col w-full">
        <div className="flex items-stretch">
          {/* Thumbnail with absolute rank badge overlay */}
          <div className="relative w-28 sm:w-36 shrink-0 self-stretch min-h-[110px] bg-slate-900 border-r border-slate-700/40 select-none">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={`${level.name || 'Level'} preview`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain object-center transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-xs p-2 text-center">
                No preview
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/30 pointer-events-none" />
            <div
              className={`absolute top-2 left-2 z-10 px-2 py-0.5 rounded-lg text-xs font-extrabold font-heading border shadow-md ${getRankBadgeStyle(
                effectiveRank
              )}`}
            >
              #{effectiveRank}
            </div>
          </div>

          {/* Level Info content */}
          <div className="flex-1 min-w-0 p-3 flex flex-col justify-center gap-1.5">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-400 transition-colors font-heading truncate">
                {level.name || 'Untitled Level'}
              </h3>
              <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-800 shrink-0 ${getDifficultyColor(level.difficulty || 'Entry Kaizo')}`}>
                {level.difficulty || 'Entry Kaizo'}
              </span>
              {!verified && (
                <span className="text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 shrink-0">
                  Unv.
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
              <span className="truncate">By <strong className="text-slate-200 font-medium">{level.creator || 'Unknown'}</strong></span>
              <span aria-hidden="true" className="text-slate-600 shrink-0">·</span>
              {verified ? (
                <span className="truncate">Ver. <strong className="text-slate-200 font-medium">{level.verifier}</strong></span>
              ) : (
                <span className="truncate text-amber-400/90 font-medium">Unverified</span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
              <span className={`${verified ? 'text-amber-400 font-semibold' : 'text-slate-500 font-medium'} tabular-nums shrink-0`}>
                {points} pts
              </span>
              <span aria-hidden="true" className="text-slate-600 shrink-0">·</span>
              <span className="text-emerald-400 font-semibold tabular-nums shrink-0">
                {victorCount} {victorCount === 1 ? 'victor' : 'victors'}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile bottom actions bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-900/60 border-t border-slate-800/80 gap-2">
          <button
            onClick={handleCopyCode}
            title="Copy Goober Dash level ID"
            className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors font-mono tabular-nums text-xs bg-slate-900 px-2 py-1 rounded border border-slate-800 truncate max-w-[140px]"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-emerald-400 font-semibold truncate">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{calculatedLevelId}</span>
              </>
            )}
          </button>

          <button
            onClick={(e) => onQuickPlay(level.directPlayUrl || 'https://jellycade.com/games/goober-dash', e)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all rounded-lg shadow whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play</span>
          </button>
        </div>
      </div>

      {/* DESKTOP VIEW (md+) */}
      <div className="hidden md:flex items-center flex-1 min-w-0 h-full">
        {/* Full-height diagonal thumbnail container */}
        {thumbnail ? (
          <div className="relative w-64 shrink-0 self-stretch h-full overflow-hidden select-none bg-slate-900 border-r border-slate-700/40">
            <img
              src={thumbnail}
              alt={`${level.name || 'Level'} preview`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain object-center transition-transform duration-300 filter brightness-95 group-hover:brightness-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/35 pointer-events-none" />
          </div>
        ) : (
          <div className="relative w-64 shrink-0 self-stretch h-full overflow-hidden select-none [clip-path:polygon(0_0,100%_0,calc(100%-28px)_100%,0_100%)] bg-slate-900/80 border-r border-slate-700/40 flex items-center justify-center text-slate-500 font-mono text-xs">
            <span>No preview</span>
          </div>
        )}

        {/* Content block: Rank # + Info */}
        <div className="flex items-center gap-5 flex-1 min-w-0 py-3.5 pr-4 pl-4 h-full">
          {/* Rank Number */}
          <div
            className={`w-14 h-14 shrink-0 rounded-xl flex items-center justify-center font-extrabold text-xl font-heading border tabular-nums shadow-inner ${getRankBadgeStyle(
              effectiveRank
            )}`}
          >
            #{effectiveRank}
          </div>

          {/* Level Info */}
          <div className="min-w-0 flex-1 flex flex-col justify-center gap-1.5">
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors font-heading truncate">
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

            <div className="flex items-center gap-2 text-sm text-slate-400 flex-wrap truncate">
              <span className="truncate">By <strong className="text-slate-200 font-medium">{level.creator || 'Unknown'}</strong></span>
              <span aria-hidden="true" className="text-slate-600 shrink-0">·</span>
              {verified ? (
                <span className="truncate">Verified by <strong className="text-slate-200 font-medium">{level.verifier}</strong></span>
              ) : (
                <span className="truncate text-amber-400/90 font-medium">Unverified</span>
              )}
            </div>

            {/* Clean unboxed metadata */}
            <div className="flex items-center gap-3 text-sm text-slate-400 flex-wrap mt-0.5">
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

        {/* Right side: Action controls */}
        <div className="flex items-center gap-2.5 pr-5 pl-2 justify-end shrink-0 h-full">
          <button
            onClick={(e) => onQuickPlay(level.directPlayUrl || 'https://jellycade.com/games/goober-dash', e)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all rounded-lg shadow-md whitespace-nowrap"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Play Level</span>
          </button>
        </div>
      </div>
    </div>
  );
};
