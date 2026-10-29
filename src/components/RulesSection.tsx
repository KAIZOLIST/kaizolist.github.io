import React from 'react';
import { ShieldCheck, CheckCircle2, AlertOctagon, HelpCircle, FileText, Send } from 'lucide-react';

interface RulesSectionProps {
  onOpenSubmitModal: () => void;
}

export const RulesSection: React.FC<RulesSectionProps> = ({ onOpenSubmitModal }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-amber-400 mb-1">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>Goober Dash Kaizo Standards</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
          Submission Rules & Verification Guidelines
        </h2>
        <p className="mt-1 text-sm text-slate-400 leading-relaxed">
          To preserve competitive integrity and prevent illegitimate records, all completions submitted to the Goober Dash Kaizo List must meet the following verification criteria.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Requirement 1: Video Proof */}
        <div className="p-5 bg-[#111927] border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white font-heading">
              1. Completion Proof
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            For most completions, a simple screenshot of the end screen showing your victory is sufficient. Video proof is highly recommended for hard levels. For Top 1 completions, a continuous, uncut video recording along with raw footage is strictly required to verify the record.
          </p>
        </div>

        {/* Requirement 2: End Screen & Level Code */}
        <div className="p-5 bg-[#111927] border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white font-heading">
              2. End Screen
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The final victory screen displaying the completion time should be clearly visible in your submitted screenshot or video.
          </p>
        </div>

        {/* Prohibited: Cheats & Hacks */}
        <div className="p-5 bg-[#111927] border border-rose-900/30 rounded-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white font-heading">
              3. Strictly Prohibited
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Any modification that alters gameplay physics or gives artificial advantage is forbidden.
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
            <li>Speedhacks, cheat engines, or tick rate manipulation.</li>
            <li>Hitbox visualizers or collision-mask indicators.</li>
            <li>Macro-assisted runs or automated key injection scripts.</li>
            <li>Savestates or checkpoint restores during the run.</li>
          </ul>
        </div>

        {/* Bonus Points */}
        <div className="p-5 bg-[#111927] border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white font-heading">
              4. Bonus Points
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Points are calculated based on a level's rank on the verified list. Earn significant bonus points by verifying levels and setting new world records:
          </p>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside mt-2">
            <li><strong>Base Points:</strong> Calibrated dynamically based on verified rank placement.</li>
            <li><strong>Verifier Bonus:</strong> +10% bonus on base points.</li>
            <li><strong>World Record Bonus:</strong> +15% bonus on base points.</li>
          </ul>
        </div>
      </div>

      {/* Action banner */}
      <div className="p-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-base font-bold text-white font-heading">
            Conquered a ranked Kaizo level?
          </h4>
          <p className="text-xs text-slate-300 mt-0.5">
            Submit your YouTube or Twitch proof link to claim your spot in the Hall of Fame!
          </p>
        </div>
        <button
          onClick={onOpenSubmitModal}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all rounded-lg shrink-0 shadow-sm"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Submit Completion</span>
        </button>
      </div>
    </div>
  );
};
