import React, { useState } from 'react';
import { ProofSubmission, KaizoLevel, Victor, ChangeDetail } from '../types/kaizo';
import { Check, X, Video, Image as ImageIcon, ExternalLink, Eye } from 'lucide-react';
import { updateLevelData, addChangelogItem, db } from '../lib/firebase';
import { deleteDoc, doc } from 'firebase/firestore';

interface PendingSubmissionsProps {
  submissions: ProofSubmission[];
  levels: KaizoLevel[];
  onToast: (msg: string) => void;
  playerName: string;
}

export const PendingSubmissions: React.FC<PendingSubmissionsProps> = ({
  submissions,
  levels,
  onToast,
  playerName,
}) => {
  const pending = submissions.filter((s) => s.status === 'pending');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleApprove = async (sub: ProofSubmission) => {
    const level = levels.find((l) => l.id === sub.levelId);
    if (!level) {
      onToast('Level not found!');
      return;
    }

    const proofUrl = sub.screenshotUrl || sub.videoUrl;
    const newVictor: Victor = {
      id: `vic-${Date.now()}-${sub.player.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      name: sub.player,
      videoProofUrl: proofUrl,
    };

    const updatedVictors = [...(level.victors || []), newVictor];

    try {
      const approveChanges: ChangeDetail[] = [
        {
          field: 'victor',
          label: 'Completion Added',
          newValue: `${sub.player} (Rank #${level.rank})`,
          description: `Added verified completion for ${sub.player} on level "${level.name}" (Rank #${level.rank})`,
          type: 'added'
        },
        {
          field: 'proof',
          label: sub.proofType === 'screenshot' ? 'Screenshot Proof' : 'Proof Link',
          newValue: proofUrl.startsWith('data:') ? 'Uploaded Screenshot Data' : proofUrl,
          description: `Verified completion proof`,
          type: 'added'
        },
        {
          field: 'status',
          label: 'Submission Queue',
          oldValue: 'Pending',
          newValue: 'Approved',
          description: `Submission queue item approved by ${playerName}`,
          type: 'modified'
        }
      ];

      await updateLevelData(level.id, { victors: updatedVictors });
      await deleteDoc(doc(db, 'submissions', sub.id));
      await addChangelogItem(
        'Completion Added',
        `Completion added for ${sub.player} on "${level.name}" (Rank #${level.rank})`,
        playerName,
        approveChanges,
        { levelId: level.id, levelName: level.name }
      );
      onToast(`Approved submission for ${sub.player}`);
    } catch (err) {
      console.error(err);
      onToast('Failed to approve submission.');
    }
  };

  const handleReject = async (subId: string) => {
    try {
      const sub = submissions.find((s) => s.id === subId);
      const rejectChanges: ChangeDetail[] = [
        {
          field: 'status',
          label: 'Submission Queue',
          oldValue: 'Pending',
          newValue: 'Rejected',
          description: `Submission denied for ${sub?.player || 'player'} on "${sub?.levelName || 'level'}"`,
          type: 'removed'
        }
      ];

      await deleteDoc(doc(db, 'submissions', subId));
      await addChangelogItem(
        'Submission Rejected',
        `Rejected completion submission from ${sub?.player || 'player'} on "${sub?.levelName || 'level'}"`,
        playerName,
        rejectChanges,
        { levelId: sub?.levelId, levelName: sub?.levelName }
      );
      onToast('Rejected submission.');
    } catch (err) {
      console.error(err);
      onToast('Failed to reject submission.');
    }
  };

  return (
    <div className="space-y-4">
      {pending.length === 0 ? (
        <div className="p-8 text-center bg-[#111927] border border-slate-800 rounded-xl text-slate-400">
          No pending submissions.
        </div>
      ) : (
        pending.map((sub) => {
          const isImageProof =
            sub.proofType === 'screenshot' ||
            sub.screenshotUrl ||
            (sub.videoUrl && sub.videoUrl.startsWith('data:image/'));

          const imageUrl = sub.screenshotUrl || (sub.videoUrl && sub.videoUrl.startsWith('data:image/') ? sub.videoUrl : null);

          return (
            <div key={sub.id} className="bg-[#111927] border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {isImageProof && imageUrl ? (
                  <div
                    onClick={() => setSelectedImage(imageUrl)}
                    className="relative w-16 h-16 bg-slate-950 border border-slate-700 rounded-lg overflow-hidden shrink-0 cursor-pointer group hover:border-amber-400 transition-colors"
                  >
                    <img src={imageUrl} alt="Screenshot proof" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-amber-400/10 border border-amber-400/20 rounded-lg flex items-center justify-center text-amber-400 shrink-0">
                    <Video className="w-6 h-6" />
                  </div>
                )}

                <div className="min-w-0">
                  <h4 className="text-white font-bold text-sm truncate">{sub.levelName}</h4>
                  <p className="text-xs text-slate-300">Player: <strong className="text-white">{sub.player}</strong></p>

                  <div className="flex items-center gap-2 mt-1">
                    {imageUrl ? (
                      <button
                        type="button"
                        onClick={() => setSelectedImage(imageUrl)}
                        className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>View Screenshot Proof</span>
                      </button>
                    ) : (
                      <a
                        href={sub.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View Proof Link</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => handleApprove(sub)}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(sub.id)}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* FULL SCREENSHOT MODAL */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-2">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-slate-950/80 text-white p-2 rounded-xl hover:bg-rose-500 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={selectedImage} alt="Full screenshot proof" className="w-full h-full max-h-[85vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
};
