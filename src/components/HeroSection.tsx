import React from 'react';
import { Search, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { KaizoLevel } from '../types/kaizo';
import { isLevelVerified } from '../utils/kaizoUtils';

interface HeroSectionProps {
  levels: KaizoLevel[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedDifficulty: string;
  setSelectedDifficulty: (d: string) => void;
  sortBy: 'rank' | 'easiest' | 'victors';
  setSortBy: (s: 'rank' | 'easiest' | 'victors') => void;
  verificationFilter: 'Verified' | 'Unverified' | 'All';
  setVerificationFilter: (val: 'Verified' | 'Unverified' | 'All') => void;
  onOpenSubmitModal: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  levels,
  searchQuery,
  setSearchQuery,
  selectedDifficulty,
  setSelectedDifficulty,
  sortBy,
  setSortBy,
  verificationFilter,
  setVerificationFilter
}) => {
  const safeLevels = Array.isArray(levels) ? levels : [];

  const totalVictors = safeLevels.reduce((acc, lvl) => {
    if (!lvl || !Array.isArray(lvl.victors)) return acc;
    return acc + lvl.victors.length;
  }, 0);

  const creatorMap = new Map<string, { name: string; count: number }>();
  safeLevels.forEach((lvl) => {
    if (!lvl || !lvl.creator || typeof lvl.creator !== 'string') return;
    const rawCreators = lvl.creator.split(',');
    rawCreators.forEach((rawC) => {
      const c = rawC.trim();
      if (!c) return;
      let lower = c.toLowerCase();
      if (lower === 'sigmundfreud' || lower === 'toj sigmundfreud') {
        lower = 'toj sigmundfreud';
      }
      const existing = creatorMap.get(lower);
      if (existing) {
        existing.count += 1;
        if (c.includes('ToJ SigmundFreud') || (c !== existing.name && c.length >= existing.name.length)) {
          existing.name = c;
        }
      } else {
        const canonicalName = lower === 'toj sigmundfreud' ? 'ToJ SigmundFreud' : c;
        creatorMap.set(lower, { name: canonicalName, count: 1 });
      }
    });
  });
  const uniqueCreators = Array.from(creatorMap.values()).sort((a, b) => b.count - a.count);

  // Top Demon: highest-ranked verified level
  const topVerifiedDemon = safeLevels
    .filter((lvl) => isLevelVerified(lvl))
    .sort((a, b) => a.rank - b.rank)[0];

  const topDemonName = topVerifiedDemon?.name || (safeLevels.length > 0 && safeLevels[0]?.name ? safeLevels[0].name : 'Inferno Core');

  return (
    <section className="relative border-b border-slate-800/80 bg-[#0d131f] overflow-hidden">
      {/* Visual background banner with dark scrim */}
      <div className="relative w-full h-56 sm:h-72 lg:h-80 overflow-hidden">
        <img
          src="/assets/aistudio/image_d2fafbfa.png"
          alt="New Goober Dash Kaizo List Banner"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center filter brightness-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f17] via-[#0b0f17]/70 to-transparent" />
        
        {/* Banner Content Overlay */}
        <div className="absolute inset-0 max-w-7xl mx-auto px-4 sm:px-6 flex flex-col justify-end items-center pb-8 text-center overflow-visible">
          <div className="max-w-3xl flex flex-col items-center overflow-visible">
            <h1 className="flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-2.5 gap-y-2 text-4xl sm:text-6xl font-black tracking-tighter py-3 px-6 select-none font-heading overflow-visible">
              <span className="inline-block bg-gradient-to-b from-blue-300 to-blue-600 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(96,165,250,0.25)] pr-3">Goober</span>
              <span className="inline-block bg-gradient-to-b from-pink-300 to-pink-600 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(244,114,182,0.25)] pr-3">Dash</span>
              <span className="inline-block bg-gradient-to-b from-white via-slate-100 to-slate-300 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(255,255,255,0.45)] pr-3">Kaizo</span>
              <span className="inline-block bg-gradient-to-b from-white via-slate-100 to-slate-300 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(255,255,255,0.45)] pr-3">List</span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed text-center">
              The official list of the hardest levels beaten in Goober Dash. Check out the levels and submit your completions to our list team!
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#111927]/90 border border-slate-800 rounded-xl p-3">
            <span className="text-xs text-slate-400 block font-medium">Ranked Levels</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-white tabular-nums">{safeLevels.length}</span>
              <span className="text-xs text-slate-500 font-mono">active kaizos</span>
            </div>
          </div>

          <div className="bg-[#111927]/90 border border-slate-800 rounded-xl p-3">
            <span className="text-xs text-slate-400 block font-medium">Verified Victors</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-emerald-400 tabular-nums">{totalVictors}</span>
              <span className="text-xs text-slate-500 font-mono">completions</span>
            </div>
          </div>

          <div className="bg-[#111927]/90 border border-slate-800 rounded-xl p-3 relative group cursor-pointer">
            <span className="text-xs text-slate-400 block font-medium">Individual Creators</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-amber-400 tabular-nums">{uniqueCreators.length}</span>
              <span className="text-xs text-slate-500 font-mono">unique creators</span>
            </div>
            {/* Hover dropdown list of creators */}
            <div className="absolute left-0 right-0 top-full mt-1 bg-[#111927] border border-slate-700 rounded-xl p-3 shadow-2xl z-50 hidden group-hover:block max-h-60 overflow-y-auto">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                All Individual Creators ({uniqueCreators.length}):
              </span>
              <div className="space-y-1">
                {uniqueCreators.map(({ name: creatorName, count }) => (
                  <div key={creatorName} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-slate-800/85">
                    <span className="text-slate-200 font-medium truncate pr-2">{creatorName}</span>
                    <span className="text-amber-400 font-mono shrink-0">{count} {count === 1 ? 'level' : 'levels'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#111927]/90 border border-slate-800 rounded-xl p-3">
            <span className="text-xs text-slate-400 block font-medium">Top Demon</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-base font-bold text-rose-400 truncate">
                {topDemonName}
              </span>
              <span className="text-xs text-slate-500 font-mono">#1</span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-6 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-[#111927]/60 p-3 rounded-xl border border-slate-800">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search level name, creator, verifier, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900/90 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/80 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Difficulty Filter Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="All">All Difficulties</option>
              <option value="Impossible Kaizo">Impossible Kaizo</option>
              <option value="Silent Kaizo">Silent Kaizo</option>
              <option value="Extreme Kaizo">Extreme Kaizo</option>
              <option value="Insane Kaizo">Insane Kaizo</option>
              <option value="High Kaizo">High Kaizo</option>
              <option value="Mid Kaizo">Mid Kaizo</option>
              <option value="Entry Kaizo">Entry Kaizo</option>
            </select>
          </div>

          {/* Sorting and Verification Status filter */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-800 rounded-lg p-1">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400 ml-1 mr-0.5 hidden sm:inline" />
              {(['Verified', 'Unverified', 'All'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setVerificationFilter(status)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    verificationFilter === status
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-800 rounded-lg px-2 py-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'rank' | 'easiest' | 'victors')}
                className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer pr-1"
              >
                <option value="rank" className="bg-slate-900 text-slate-200">Sort: Difficulty</option>
                <option value="easiest" className="bg-slate-900 text-slate-200">Sort: Easiest</option>
                <option value="victors" className="bg-slate-900 text-slate-200">Sort: Most Victors</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
