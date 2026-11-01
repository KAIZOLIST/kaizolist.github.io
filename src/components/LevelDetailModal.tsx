import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Copy,
  Check,
  ExternalLink,
  Trophy,
  Video,
  PlusCircle,
  Maximize2
} from 'lucide-react';
import { KaizoLevel } from '../types/kaizo';
import { getPointsForRank, sortVictors, getVictorName, isLevelVerified, getLevelIdFromLink } from '../utils/kaizoUtils';
import { fetchLevelThumbnail } from '../lib/firebase';

interface LevelDetailModalProps {
  level: KaizoLevel | null;
  displayRank?: number;
  pointsAwarded?: number;
  onClose: () => void;
  onSubmitProofForLevel: (level: KaizoLevel) => void;
  onSelectPlayer?: (playerName: string) => void;
}

export const LevelDetailModal: React.FC<LevelDetailModalProps> = ({
  level,
  displayRank,
  pointsAwarded,
  onClose,
  onSubmitProofForLevel,
  onSelectPlayer
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [isZoomedImage, setIsZoomedImage] = useState(false);
  const [isAutofit, setIsAutofit] = useState(level?.imageFit !== 'cover');
  const [thumbnail, setThumbnail] = useState<string | null>(level?.thumbnailUrl || null);

  useEffect(() => {
    if (!level) return;
    if (level.thumbnailUrl) {
      setThumbnail(level.thumbnailUrl);
      return;
    }
    let isMounted = true;
    fetchLevelThumbnail(level.id, level.rank, level.imageChunkId).then((thumb) => {
      if (isMounted && thumb) {
        setThumbnail(thumb);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [level?.id, level?.rank, level?.imageChunkId, level?.thumbnailUrl]);

  if (!level) return null;

  const verified = isLevelVerified(level);
  const effectiveRank = displayRank ?? level.rank ?? 999;
  const points = pointsAwarded !== undefined ? pointsAwarded : (verified ? getPointsForRank(effectiveRank) : 0);
  const calculatedLevelId = getLevelIdFromLink(level.directPlayUrl);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(calculatedLevelId !== 'N/A' ? calculatedLevelId : level.directPlayUrl || '');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
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
        return 'text-slate-100 bg-slate-900 border-slate-700 shadow-[0_0_10px_rgba(255,255,255,0.1)]';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#0d131f]">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold font-heading border tabular-nums ${getRankBadgeStyle(
                effectiveRank
              )}`}
            >
              #{effectiveRank}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white font-heading">
                  {level.name}
                </h2>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getDifficultyColor(
                    level.difficulty
                  )}`}
                >
                  {level.difficulty}
                </span>
                {!verified && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full border font-semibold text-amber-300 bg-amber-500/10 border-amber-500/30">
                    Unverified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Created by <strong className="text-slate-200">{level.creator}</strong>
                {verified ? (
                  <> · Verified by{' '}
                    <button
                      type="button"
                      onClick={() => onSelectPlayer?.(level.verifier)}
                      className="text-slate-200 font-bold hover:text-amber-400 hover:underline transition-colors"
                      title={`View ${level.verifier}'s profile`}
                    >
                      {level.verifier}
                    </button>
                  </>
                ) : (
                  <> · <strong className="text-amber-400">Unverified</strong></>
                )}
                {level.worldRecord && level.worldRecord !== '-' && (
                  <>
                    {' '}· World Record: <strong className="text-cyan-300">{level.worldRecord}</strong>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Level Preview Image & Direct Play Action Area */}
          <div className="space-y-4">
            <div className="relative w-full aspect-video sm:aspect-21/9 max-h-[400px] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner group flex items-center justify-center">
              {thumbnail ? (
                <>
                  {isAutofit ? (
                    <>
                      <img
                        src={thumbnail}
                        alt=""
                        aria-hidden="true"
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover filter blur-md opacity-25 scale-110"
                      />
                      <div className="absolute inset-0 bg-black/25 pointer-events-none" />
                      <img
                        src={thumbnail}
                        alt={`${level.name} full preview`}
                        referrerPolicy="no-referrer"
                        className="relative z-10 max-w-[96%] max-h-[96%] object-contain object-center drop-shadow-xl"
                      />
                    </>
                  ) : (
                    <img
                      src={thumbnail}
                      alt={`${level.name} full preview`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center"
                    />
                  )}

                  {/* Top-right overlay buttons */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                    <button
                      onClick={() => setIsAutofit(!isAutofit)}
                      className="p-1.5 px-2.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-colors text-xs font-medium border border-white/10"
                      title={isAutofit ? 'Switch to Fill (Crop)' : 'Switch to Autofit (Show Entire Map)'}
                    >
                      {isAutofit ? 'Autofit: ON' : 'Autofit: OFF'}
                    </button>
                    <button
                      onClick={() => setIsZoomedImage(true)}
                      className="p-1.5 px-2.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-colors flex items-center gap-1.5 text-xs font-medium border border-white/10"
                      title="View enlarged image"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Zoom</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-radial from-slate-800 to-slate-950">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                    <Video className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-semibold text-slate-300">
                    No Creator Preview Image Uploaded
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    No screenshot preview is specified for this level in kaizoLevels.json.
                  </p>
                </div>
              )}
            </div>

            {/* Direct Play & Quick Actions Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-[#111927] border border-slate-800 rounded-xl">
              <div className="flex items-center gap-4 flex-wrap text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Level ID:</span>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700/80 rounded-md font-mono text-amber-300 border border-slate-700 transition-colors"
                    title="Click to copy Level ID"
                  >
                    <span>{calculatedLevelId}</span>
                    {copiedCode ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Points Awarded:</span>
                  <span className={`font-semibold tabular-nums ${verified ? 'text-amber-400' : 'text-slate-400'}`}>
                    {points} pts {!verified && '(Unverified)'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Est. Duration:</span>
                  <span className="font-medium text-slate-200 tabular-nums">{level.length}</span>
                </div>
              </div>

              {/* Direct Play Button */}
              <div className="flex items-center gap-2">
                <a
                  href={level.directPlayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all rounded-lg shadow-sm"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play Level</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
              </div>
            </div>
          </div>

          {/* List of Victors Below Description (Chronological Order) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>List of Victors ({level.victors.length})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Verified records ordered chronologically
                </p>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onSubmitProofForLevel(level);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 rounded-lg transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Submit Your Record</span>
              </button>
            </div>

            {level.victors.length === 0 ? (
              <div className="p-6 text-center bg-[#111927] border border-slate-800 rounded-xl">
                <p className="text-sm text-slate-400">
                  No victors recorded yet! Be the first to beat this Kaizo challenge and submit your video proof.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-[#111927]">
                {level.victors.map((victor, idx) => {
                  const placeNumber = idx + 1;
                  const vName = getVictorName(victor);
                  const vNameLower = vName.toLowerCase().trim();
                  const isVerifier =
                    Boolean(victor.isVerifier) ||
                    (level.verifier && level.verifier.toLowerCase().trim().includes(vNameLower));
                  const isWR =
                    Boolean(victor.isWorldRecord) ||
                    (level.worldRecord && level.worldRecord.toLowerCase().trim().includes(vNameLower));

                  return (
                    <div
                      key={victor.id}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-[#141e30] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Order / Index */}
                        <div
                          className={`w-7 h-7 shrink-0 rounded flex items-center justify-center text-xs font-bold font-mono tabular-nums ${
                            placeNumber === 1
                              ? 'bg-amber-400 text-slate-950 font-bold'
                              : placeNumber === 2
                              ? 'bg-slate-300 text-slate-950'
                              : placeNumber === 3
                              ? 'bg-amber-700 text-amber-100'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          #{placeNumber}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => onSelectPlayer?.(vName)}
                              className="text-sm font-bold text-white hover:text-amber-400 hover:underline transition-colors text-left cursor-pointer"
                              title={`View ${vName}'s full player profile`}
                            >
                              {vName}
                            </button>
                            {isVerifier && (
                              <span className="text-[11px] px-2 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium">
                                Verifier (+10%)
                              </span>
                            )}
                            {isWR && (
                              <span className="text-[11px] px-2 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-medium">
                                World Record (+15%)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Video Proof Link */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        {victor.videoProofUrl && (
                          <a
                            href={victor.videoProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700/80 rounded-lg transition-colors"
                          >
                            <Video className="w-3.5 h-3.5 text-rose-400" />
                            <span>Watch Proof</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-slate-800/80 bg-[#0d131f] flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Official Goober Dash Kaizo Record #{effectiveRank}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Lightbox / Zoomed Image Modal */}
      {isZoomedImage && thumbnail && (
        <div
          className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsZoomedImage(false)}
        >
          <button
            onClick={() => setIsZoomedImage(false)}
            className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={thumbnail}
            alt={`${level.name} full view`}
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          />
          <div className="mt-3 text-sm text-slate-300 font-medium">
            {level.name} - Level Preview
          </div>
        </div>
      )}
    </div>
  );
};
