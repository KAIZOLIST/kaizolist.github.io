import React from 'react';
import { ProofSubmission, KaizoLevel, Victor, ListHelper, ChangeDetail } from '../types/kaizo';
import { Check, X, Video } from 'lucide-react';
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

  const handleApprove = async (sub: ProofSubmission) => {
    const level = levels.find((l) => l.id === sub.levelId);
    if (!level) {
      onToast('Level not found!');
      return;
    }

    const newVictor: Victor = {
      id: `vic-${Date.now()}-${sub.player.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      name: sub.player,
      videoProofUrl: sub.videoUrl,
    };

    const updatedVictors = [...(level.victors || []), newVictor];

    try {
      const approveChanges: ChangeDetail[] = [
        {
          field: 'status',
          label: 'Submission Status',
          oldValue: 'Pending',
          newValue: 'Approved',
          description: `Completion approved for ${sub.player}`,
          type: 'modified'
        },
        {
          field: 'level',
          label: 'Level',
          newValue: level.name,
          description: `Level: "${level.name}" (Rank #${level.rank})`,
          type: 'added'
        },
        {
          field: 'player',
          label: 'Player Added',
          newValue: sub.player,
          description: `Added to victors roster: ${sub.player}`,
          type: 'added'
        },
        {
          field: 'proof',
          label: 'Video Proof',
          newValue: sub.videoUrl,
          description: `Verified footage: ${sub.videoUrl}`,
          type: 'added'
        }
      ];

      await updateLevelData(level.id, { victors: updatedVictors });
      await deleteDoc(doc(db, 'submissions', sub.id));
      await addChangelogItem(
        'Approve Submission',
        `Approved completion for ${sub.player} on level "${level.name}"`,
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
          label: 'Submission Status',
          oldValue: 'Pending',
          newValue: 'Rejected',
          description: `Submission denied for ${sub?.player || 'player'} on "${sub?.levelName || 'level'}"`,
          type: 'removed'
        },
        {
          field: 'proof',
          label: 'Submitted Video Proof',
          oldValue: sub?.videoUrl || 'None',
          description: `Submitted proof link: ${sub?.videoUrl || 'None'}`,
          type: 'removed'
        }
      ];

      await deleteDoc(doc(db, 'submissions', subId));
      await addChangelogItem(
        'Reject Submission',
        `Rejected completion submission for ${sub?.player || 'player'} on "${sub?.levelName || 'level'}"`,
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
        pending.map((sub) => (
          <div key={sub.id} className="bg-[#111927] border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <h4 className="text-white font-bold">{sub.levelName}</h4>
              <p className="text-sm text-slate-400">Player: {sub.player}</p>
              <a href={sub.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-400 flex items-center gap-1 mt-1">
                <Video className="w-3 h-3" /> View Proof
              </a>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(sub)}
                className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleReject(sub.id)}
                className="p-2 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
