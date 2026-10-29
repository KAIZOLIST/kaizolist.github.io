import React from 'react';
import { Plus, Edit3 } from 'lucide-react';

interface NavbarProps {
  activeTab: 'rankings' | 'victors' | 'rules' | 'edit-list';
  setActiveTab: (tab: 'rankings' | 'victors' | 'rules' | 'edit-list') => void;
  onOpenSubmitModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSubmitModal
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0b0f17]/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => setActiveTab('rankings')}
          className="group relative flex items-center transition-all duration-300 hover:scale-105 active:scale-95 py-1"
        >
          <div className="flex items-baseline text-6xl font-black italic tracking-tighter leading-none select-none py-1">
            <span className="relative z-30 bg-gradient-to-b from-blue-300 to-blue-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(96,165,250,0.4)] pr-2 -mr-2">G</span>
            <span className="relative z-20 bg-gradient-to-b from-pink-300 to-pink-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(244,114,182,0.4)] pr-2 -mr-2">D</span>
            <span className="relative z-20 bg-gradient-to-b from-red-400 to-red-800 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(239,68,68,0.6)] pr-4 -mr-4">K</span>
            <span className="relative z-10 bg-gradient-to-b from-red-400 to-red-800 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(239,68,68,0.6)] ml-[3px]">L</span>
          </div>

          {/* Dynamic Background Aura - more subtle without card */}
          <div className="absolute -inset-x-4 -inset-y-2 bg-gradient-to-r from-blue-500/0 via-pink-500/0 to-red-500/0 blur-2xl opacity-0 group-hover:opacity-20 group-hover:from-blue-600/30 group-hover:via-pink-600/30 group-hover:to-red-700/30 transition-all duration-700 rounded-full" />
        </button>

        {/* Zone 2: Concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => setActiveTab('rankings')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-1 border-b-2 ${
              activeTab === 'rankings'
                ? 'text-white border-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-100'
            }`}
          >
            The List
          </button>
          <button
            onClick={() => setActiveTab('victors')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-1 border-b-2 ${
              activeTab === 'victors'
                ? 'text-white border-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-100'
            }`}
          >
            Victors Hall
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-1 border-b-2 ${
              activeTab === 'rules'
                ? 'text-white border-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-100'
            }`}
          >
            Submission Rules
          </button>
          <button
            onClick={() => setActiveTab('edit-list')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-1 border-b-2 flex items-center gap-1.5 ${
              activeTab === 'edit-list'
                ? 'text-amber-400 border-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-100'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit List</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenSubmitModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all rounded-lg shadow-sm whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Completion</span>
          </button>
        </div>
      </div>

      {/* Mobile nav subbar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800/60 px-2 py-2 bg-[#0d131f] text-xs">
        <button
          onClick={() => setActiveTab('rankings')}
          className={`px-2.5 py-1 rounded transition-colors ${
            activeTab === 'rankings' ? 'text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          The List
        </button>
        <button
          onClick={() => setActiveTab('victors')}
          className={`px-2.5 py-1 rounded transition-colors ${
            activeTab === 'victors' ? 'text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          Victors
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-2.5 py-1 rounded transition-colors ${
            activeTab === 'rules' ? 'text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          Rules
        </button>
        <button
          onClick={() => setActiveTab('edit-list')}
          className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
            activeTab === 'edit-list' ? 'text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Edit3 className="w-3 h-3" />
          <span>Edit List</span>
        </button>
      </div>
    </header>
  );
};

