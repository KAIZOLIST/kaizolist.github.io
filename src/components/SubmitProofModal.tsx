import React, { useState, useEffect } from 'react';
import { X, Send, Video, AlertCircle, CheckCircle2, User, ExternalLink, Upload, Image as ImageIcon, Clipboard, ShieldAlert, Search, ChevronDown } from 'lucide-react';
import { KaizoLevel, ProofSubmission } from '../types/kaizo';
import { getPointsForRank } from '../utils/kaizoUtils';
import { addSubmissionToFirestore } from '../lib/firebase';

interface SubmitProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  levels: KaizoLevel[];
  preselectedLevelId?: string;
  onSubmitSuccess: (newSubmission: ProofSubmission) => void;
}

const DiscordIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const SUBMISSION_HOURLY_LIMIT = 10;
const ONE_HOUR_MS = 60 * 60 * 1000;

function checkHourlySubmissionLimit(playerName: string): { allowed: boolean; count: number } {
  try {
    const raw = localStorage.getItem('gdkl_user_submissions');
    const records: { player: string; timestamp: number }[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const oneHourAgo = now - ONE_HOUR_MS;
    const pKey = playerName.trim().toLowerCase();

    const recent = records.filter((r) => r.timestamp > oneHourAgo && (r.player === pKey || !r.player));
    return {
      allowed: recent.length < SUBMISSION_HOURLY_LIMIT,
      count: recent.length
    };
  } catch {
    return { allowed: true, count: 0 };
  }
}

function recordSubmissionTimestamp(playerName: string) {
  try {
    const raw = localStorage.getItem('gdkl_user_submissions');
    const records: { player: string; timestamp: number }[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const oneHourAgo = now - ONE_HOUR_MS;
    const pKey = playerName.trim().toLowerCase();

    const updated = records.filter((r) => r.timestamp > oneHourAgo);
    updated.push({ player: pKey, timestamp: now });
    localStorage.setItem('gdkl_user_submissions', JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to record submission limit timestamp:', e);
  }
}

export const SubmitProofModal: React.FC<SubmitProofModalProps> = ({
  isOpen,
  onClose,
  levels,
  preselectedLevelId,
  onSubmitSuccess
}) => {
  const [levelId, setLevelId] = useState(preselectedLevelId || (levels[0]?.id ?? ''));
  const [levelSearchTerm, setLevelSearchTerm] = useState('');
  const [isLevelDropdownOpen, setIsLevelDropdownOpen] = useState(false);
  const [player, setPlayer] = useState('');
  const [proofType, setProofType] = useState<'screenshot' | 'url'>('screenshot');
  const [proofUrl, setProofUrl] = useState('');
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  useEffect(() => {
    if (preselectedLevelId) {
      setLevelId(preselectedLevelId);
      const preLvl = levels.find(l => l.id === preselectedLevelId);
      if (preLvl) setLevelSearchTerm(`#${preLvl.rank} - ${preLvl.name}`);
    } else if (levels.length > 0 && !levelId) {
      setLevelId(levels[0].id);
      setLevelSearchTerm(`#${levels[0].rank} - ${levels[0].name}`);
    } else if (levelId) {
      const currentLvl = levels.find(l => l.id === levelId);
      if (currentLvl) setLevelSearchTerm(`#${currentLvl.rank} - ${currentLvl.name}`);
    }
  }, [preselectedLevelId, levels, levelId]);

  const filteredLevels = levels.filter(lvl => {
    const search = levelSearchTerm.toLowerCase();
    // If the search matches the current selection format exactly, we show all levels or just the selection?
    // Let's make it match rank or name.
    return lvl.name.toLowerCase().includes(search) || 
           lvl.rank.toString().includes(search) ||
           `#${lvl.rank} - ${lvl.name}`.toLowerCase().includes(search);
  });

  const selectedLevel = levels.find((l) => l.id === levelId) || levels[0];

  const handleProcessScreenshotFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select or paste a valid image file (PNG, JPG, WEBP).');
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
          const maxDim = 900;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          setScreenshotDataUrl(dataUrl);
          setError('');
        };
      }
    };
    reader.readAsDataURL(file);
  };

  const handleScreenshotPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleProcessScreenshotFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!player.trim()) {
      setError('Please provide your Goober Dash username.');
      return;
    }

    // Rate Limiting Enforcement (10 submissions per hour per person)
    const rateCheck = checkHourlySubmissionLimit(player);
    if (!rateCheck.allowed) {
      setError(`Submission limit reached: You have submitted ${rateCheck.count} records in the last hour. Limit is 10 submissions per hour per person.`);
      return;
    }

    if (!selectedLevel) {
      setError('Please choose a valid level.');
      return;
    }

    let finalVideoUrl = '';
    let finalScreenshotUrl: string | undefined = undefined;

    if (proofType === 'screenshot') {
      if (!screenshotDataUrl) {
        setError('Please upload or paste a screenshot of your completion.');
        return;
      }
      finalScreenshotUrl = screenshotDataUrl;
      finalVideoUrl = screenshotDataUrl;
    } else {
      if (!proofUrl.trim()) {
        setError('Please provide a valid URL to your proof (screenshot link or video URL).');
        return;
      }
      try {
        new URL(proofUrl.trim());
      } catch {
        setError('Please enter a valid URL beginning with https:// or http://');
        return;
      }
      finalVideoUrl = proofUrl.trim();
    }

    setIsSubmitting(true);
    const newSub: ProofSubmission = {
      id: `sub-${Date.now()}`,
      levelId: selectedLevel.id,
      levelName: selectedLevel.name,
      player: player.trim(),
      videoUrl: finalVideoUrl,
      screenshotUrl: finalScreenshotUrl,
      proofType: proofType === 'screenshot' ? 'screenshot' : 'video',
      status: 'pending',
      submittedAt: new Date().toISOString()
    };

    try {
      await addSubmissionToFirestore(newSub);
      recordSubmissionTimestamp(player);
    } catch (err) {
      console.warn('Failed to save submission to Firestore, saving locally:', err);
    } finally {
      setIsSubmitting(false);
    }

    onSubmitSuccess(newSub);
    setIsSuccess(true);
  };

  const getVictorJsonSnippet = () => {
    return JSON.stringify(
      {
        id: `vic-${Date.now()}`,
        name: player.trim() || 'PlayerName',
        videoProofUrl: proofUrl.trim() || screenshotDataUrl ? 'Screenshot Uploaded' : 'https://...',
        verifiedByCreator: true
      },
      null,
      2
    );
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(getVictorJsonSnippet());
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        className="relative w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onPaste={handleScreenshotPaste}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#0d131f]">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white font-heading">
              Submit Completion Record
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        {isSuccess ? (
          <div className="p-6 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <div>
              <h4 className="text-xl font-bold text-white font-heading">
                Record Submitted!
              </h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto mt-1">
                Completion proof for{' '}
                <span className="text-amber-400 font-semibold">
                  {selectedLevel?.name}
                </span>{' '}
                has been logged in the pending submissions queue.
              </p>
            </div>

            <div className="text-left bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">
                  Victor JSON snippet:
                </span>
                <button
                  type="button"
                  onClick={handleCopySnippet}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
                >
                  {copiedSnippet ? 'Copied!' : 'Copy snippet'}
                </button>
              </div>
              <pre className="text-[11px] font-mono text-amber-300/90 overflow-x-auto max-h-32">
                {getVictorJsonSnippet()}
              </pre>
            </div>

            <div className="p-3 bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-xl flex items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-2">
                <DiscordIcon className="w-4 h-4 text-[#8ea1e1] shrink-0" />
                <span className="text-xs text-slate-300">
                  Want updates or chat with the verifiers?
                </span>
              </div>
              <a
                href="https://discord.gg/NSnCcsJNnm"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold text-xs shrink-0 transition-colors"
              >
                <span>Join Discord</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <button
              onClick={() => {
                setIsSuccess(false);
                setScreenshotDataUrl(null);
                setProofUrl('');
                onClose();
              }}
              className="px-5 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          /* STANDARD DIRECT WEB FORM */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 bg-[#5865F2]/20 rounded-lg text-[#8ea1e1] shrink-0">
                  <DiscordIcon className="w-4 h-4 fill-current" />
                </div>
                <span className="text-slate-300 text-xs">
                  Prefer Discord? You can submit via our Discord server instead!
                </span>
              </div>
              <a
                href="https://discord.gg/NSnCcsJNnm"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-lg text-xs shrink-0 transition-colors shadow-sm whitespace-nowrap"
              >
                <span>Join Discord</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Searchable Level selection */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Select Ranked Level
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search level by name or rank..."
                  value={levelSearchTerm}
                  onFocus={() => setIsLevelDropdownOpen(true)}
                  onChange={(e) => {
                    setLevelSearchTerm(e.target.value);
                    setIsLevelDropdownOpen(true);
                  }}
                  className="w-full pl-9 pr-10 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setIsLevelDropdownOpen(!isLevelDropdownOpen)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${isLevelDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {isLevelDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-[#0d131f] border border-slate-700 rounded-lg shadow-2xl animate-in zoom-in-95">
                  {filteredLevels.length > 0 ? (
                    filteredLevels.map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => {
                          setLevelId(lvl.id);
                          setLevelSearchTerm(`#${lvl.rank} - ${lvl.name}`);
                          setIsLevelDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-amber-400/10 transition-colors flex items-center justify-between group ${
                          levelId === lvl.id ? 'bg-amber-400/20' : ''
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className={`font-bold ${levelId === lvl.id ? 'text-amber-400' : 'text-white'}`}>
                            #{lvl.rank} - {lvl.name}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-tighter">
                            {lvl.difficulty} • {getPointsForRank(lvl.rank)} pts
                          </span>
                        </div>
                        {levelId === lvl.id && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs text-slate-500 italic text-center">
                      No levels matching "{levelSearchTerm}"
                    </div>
                  )}
                </div>
              )}
              {/* Overlay to close dropdown when clicking outside */}
              {isLevelDropdownOpen && (
                <div 
                  className="fixed inset-0 z-40 bg-transparent" 
                  onClick={() => setIsLevelDropdownOpen(false)}
                />
              )}
            </div>

            {/* Player Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Player / Goober Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. SpeedJelly, DashTitan"
                  value={player}
                  onChange={(e) => setPlayer(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400 placeholder-slate-500"
                  required
                />
              </div>
            </div>

            {/* Proof Selection Mode */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Proof Type
                </label>
                <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setProofType('screenshot')}
                    className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors flex items-center gap-1 ${
                      proofType === 'screenshot' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload/Paste Screenshot</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProofType('url')}
                    className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors flex items-center gap-1 ${
                      proofType === 'url' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Video className="w-3 h-3" />
                    <span>Proof Link / URL</span>
                  </button>
                </div>
              </div>

              {proofType === 'screenshot' ? (
                <div className="space-y-2">
                  <label
                    onPaste={handleScreenshotPaste}
                    className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-700 hover:border-amber-400/80 focus-within:border-amber-400 rounded-xl bg-slate-900/60 cursor-pointer text-center group transition-colors"
                  >
                    <Upload className="w-6 h-6 text-amber-400 mb-1.5 group-hover:scale-110 transition-transform" />
                    <span className="text-xs text-white font-bold block">
                      Click to upload screenshot file
                    </span>
                    <span className="text-[11px] text-amber-400/90 font-medium block mt-0.5">
                      or press <kbd className="px-1.5 py-0.5 bg-slate-950 rounded border border-slate-700 font-mono text-[10px]">Ctrl+V</kbd> (<kbd className="px-1 py-0.5 bg-slate-950 rounded border border-slate-700 font-mono text-[10px]">Cmd+V</kbd>) to paste image directly
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProcessScreenshotFile(file);
                      }}
                      className="hidden"
                    />
                  </label>

                  {screenshotDataUrl && (
                    <div className="relative w-full h-36 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden group">
                      <img src={screenshotDataUrl} alt="Uploaded screenshot" className="w-full h-full object-contain bg-black/50" />
                      <button
                        type="button"
                        onClick={() => setScreenshotDataUrl(null)}
                        className="absolute top-2 right-2 bg-slate-950/80 hover:bg-rose-500 text-white p-1 rounded-lg text-xs transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="url"
                    placeholder="https://imgur.com/..., https://youtu.be/..., etc."
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400 placeholder-slate-500"
                  />
                </div>
              )}

              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
                <span>Victory screenshot is sufficient for most levels. Top 1 requires video.</span>
                <span className="text-amber-400 font-mono font-medium">Max 10/hr</span>
              </p>
            </div>

            {/* Submit & Secondary Actions */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-95 disabled:opacity-50 transition-all rounded-lg shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Record'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
