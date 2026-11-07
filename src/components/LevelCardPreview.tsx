import React, { useState } from 'react';
import { Copy, Check, Play, X, Monitor, Smartphone, Eye } from 'lucide-react';
import { KaizoLevel, Victor } from '../types/kaizo';
import { getPointsForRank, isLevelVerified, getLevelIdFromLink } from '../utils/kaizoUtils';

interface LevelCardPreviewProps {
  name: string;
  rank: number;
  creator: string;
  verifier?: string;
  difficulty: KaizoLevel['difficulty'];
  thumbnailUrl: string | null;
  directPlayUrl?: string;
  victors?: Victor[];
  skills?: string;
  onRemoveImage?: () => void;
  className?: string;
}

export const LevelCardPreview: React.FC<LevelCardPreviewProps> = ({
  name,
  rank,
  creator,
  verifier = '',
  difficulty,
  thumbnailUrl,
  directPlayUrl = '',
  victors = [],
  skills = '',
  onRemoveImage,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);

  const calculatedLevelId = getLevelIdFromLink(directPlayUrl);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(calculatedLevelId !== 'N/A' ? calculatedLevelId : directPlayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRankBadgeStyle = (r: number) => {
    if (r === 1) return 'bg-amber-500/20 text-amber-300 border-amber-500/40 ring-1 ring-amber-500/30';
    if (r === 2) return 'bg-slate-300/20 text-slate-200 border-slate-400/40';
    if (r === 3) return 'bg-amber-700/20 text-amber-400 border-amber-700/40';
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

  const dummyLevel = { verifier };
  const verified = isLevelVerified(dummyLevel);
  const effectiveRank = rank > 0 ? rank : 1;
  const points = verified ? getPointsForRank(effectiveRank) : 0;
  const victorCount = Array.isArray(victors) ? victors.length : 0;

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* PREVIEW TOOLBAR HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/70 border border-slate-800 px-3.5 py-2 rounded-xl">
        <div className="flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-xs font-bold text-slate-200">
            Card Appearance on List
          </span>
          <span className="hidden sm:inline text-[11px] text-slate-400">
            (Live interactive preview)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('desktop')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                viewMode === 'desktop'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Preview desktop card with diagonal thumbnail cut"
            >
              <Monitor className="w-3 h-3" />
              <span>Desktop View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('mobile')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                viewMode === 'mobile'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Preview mobile/tablet card"
            >
              <Smartphone className="w-3 h-3" />
              <span>Mobile View</span>
            </button>
          </div>

          {onRemoveImage && thumbnailUrl && (
            <button
              type="button"
              onClick={onRemoveImage}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
              title="Remove this preview image"
            >
              <X className="w-3 h-3" />
              <span>Remove Image</span>
            </button>
          )}
        </div>
      </div>

      {/* THE ACTUAL LIVE CARD RENDER */}
      <div className="p-2 sm:p-3 bg-slate-950/80 border border-slate-800/80 rounded-2xl overflow-x-auto shadow-inner">
        {viewMode === 'desktop' ? (
          /* DESKTOP CARD VIEW */
          <div className="w-full min-w-[580px] group relative bg-[#111927]/90 border border-slate-800 rounded-xl overflow-hidden shadow-md flex items-center justify-between h-[152px] select-none">
            {/* Diagonal Clipped Thumbnail Container */}
            {thumbnailUrl ? (
              <div className="relative w-64 shrink-0 self-stretch h-full overflow-hidden [clip-path:polygon(0_0,100%_0,calc(100%-28px)_100%,0_100%)] bg-slate-900 border-r border-slate-700/40">
                <img
                  src={thumbnailUrl}
                  alt={`${name || 'Level'} preview`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center scale-110 filter brightness-95"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/35 pointer-events-none" />
              </div>
            ) : (
              <div className="relative w-64 shrink-0 self-stretch h-full overflow-hidden [clip-path:polygon(0_0,100%_0,calc(100%-28px)_100%,0_100%)] bg-slate-900/80 border-r border-slate-700/40 flex items-center justify-center text-slate-500 font-mono text-xs">
                <span>No preview image</span>
              </div>
            )}

            {/* Content block: Rank # + Info */}
            <div className="flex items-center gap-4 flex-1 min-w-0 py-3.5 pr-4 pl-4 h-full">
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
                  <h3 className="text-xl font-bold text-white font-heading truncate">
                    {name.trim() || 'Untitled Level'}
                  </h3>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-800 shrink-0 ${getDifficultyColor(
                      difficulty || 'Extreme Kaizo'
                    )}`}
                  >
                    {difficulty || 'Extreme Kaizo'}
                  </span>
                  {!verified && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 shrink-0">
                      Unverified
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-400 flex-wrap truncate">
                  <span className="truncate">
                    By <strong className="text-slate-200 font-medium">{creator.trim() || 'Unknown Creator'}</strong>
                  </span>
                  <span aria-hidden="true" className="text-slate-600 shrink-0">·</span>
                  {verified ? (
                    <span className="truncate">
                      Verified by <strong className="text-slate-200 font-medium">{verifier.trim()}</strong>
                    </span>
                  ) : (
                    <span className="truncate text-amber-400/90 font-medium">Unverified</span>
                  )}
                  {skills && skills.trim() && (
                    <>
                      <span aria-hidden="true" className="text-slate-600 shrink-0">·</span>
                      <span className="text-xs text-slate-400 truncate">Skills: <strong className="text-slate-300 font-medium">{skills.trim()}</strong></span>
                    </>
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
                    type="button"
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
                type="button"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-950 bg-amber-400 rounded-lg shadow-md pointer-events-none"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play Level</span>
              </button>
            </div>
          </div>
        ) : (
          /* MOBILE CARD VIEW */
          <div className="w-full max-w-md mx-auto bg-[#111927]/90 border border-slate-800 rounded-xl overflow-hidden shadow-md flex flex-col select-none">
            <div className="flex items-stretch">
              {/* Thumbnail with absolute rank badge overlay */}
              <div className="relative w-32 sm:w-36 shrink-0 self-stretch min-h-[110px] bg-slate-900 border-r border-slate-700/40 overflow-hidden">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt={`${name || 'Level'} preview`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center"
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
                  <h3 className="text-sm sm:text-base font-bold text-white font-heading truncate">
                    {name.trim() || 'Untitled Level'}
                  </h3>
                  <span
                    className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-800 shrink-0 ${getDifficultyColor(
                      difficulty || 'Entry Kaizo'
                    )}`}
                  >
                    {difficulty || 'Entry Kaizo'}
                  </span>
                  {!verified && (
                    <span className="text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 shrink-0">
                      Unv.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
                  <span className="truncate">
                    By <strong className="text-slate-200 font-medium">{creator.trim() || 'Unknown'}</strong>
                  </span>
                  <span aria-hidden="true" className="text-slate-600 shrink-0">·</span>
                  {verified ? (
                    <span className="truncate">
                      Ver. <strong className="text-slate-200 font-medium">{verifier.trim()}</strong>
                    </span>
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
                type="button"
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
                type="button"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 rounded-lg shadow whitespace-nowrap pointer-events-none"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
