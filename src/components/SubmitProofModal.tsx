import React, { useState, useEffect } from 'react';
import { X, Send, Video, AlertCircle, CheckCircle2, User, ExternalLink } from 'lucide-react';
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

export const SubmitProofModal: React.FC<SubmitProofModalProps> = ({
  isOpen,
  onClose,
  levels,
  preselectedLevelId,
  onSubmitSuccess
}) => {
  const [levelId, setLevelId] = useState(preselectedLevelId || (levels[0]?.id ?? ''));
  const [player, setPlayer] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  useEffect(() => {
    if (preselectedLevelId) {
      setLevelId(preselectedLevelId);
    } else if (levels.length > 0 && !levelId) {
      setLevelId(levels[0].id);
    }
  }, [preselectedLevelId, levels]);

  const selectedLevel = levels.find((l) => l.id === levelId) || levels[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!player.trim()) {
      setError('Please provide your Goober Dash username.');
      return;
    }

    if (!proofUrl.trim()) {
      setError('Please provide a valid link to your proof (screenshot or video link).');
      return;
    }

    try {
      new URL(proofUrl.trim());
    } catch {
      setError('Please enter a valid URL beginning with https:// or http://');
      return;
    }

    if (!selectedLevel) {
      setError('Please choose a valid level.');
      return;
    }

    setIsSubmitting(true);
    const newSub: ProofSubmission = {
      id: `sub-${Date.now()}`,
      levelId: selectedLevel.id,
      levelName: selectedLevel.name,
      player: player.trim(),
      videoUrl: proofUrl.trim(),
      status: 'pending',
      submittedAt: new Date().toISOString()
    };

    try {
      await addSubmissionToFirestore(newSub);
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
        videoProofUrl: proofUrl.trim() || 'https://...',
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
                  Victor JSON snippet (for kaizoLevels.json):
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

            {/* Also join Discord banner after submit */}
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
            {/* Discord alternate option banner */}
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

            {/* Level selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Select Ranked Level
              </label>
              <select
                value={levelId}
                onChange={(e) => setLevelId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
              >
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id} className="bg-slate-900">
                    #{lvl.rank} - {lvl.name} ({getPointsForRank(lvl.rank)} pts · {lvl.difficulty})
                  </option>
                ))}
              </select>
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

            {/* Proof URL */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Proof URL (Screenshot or Video Link)
              </label>
              <div className="relative">
                <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="url"
                  placeholder="https://imgur.com/..., https://youtu.be/..., etc."
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400 placeholder-slate-500"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                A clear screenshot of the victory end screen is sufficient for most completions. Video proof is recommended for hard levels, and Top 1 requires video + raw footage.
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
