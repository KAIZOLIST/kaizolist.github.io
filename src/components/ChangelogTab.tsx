import React, { useState, useEffect, useMemo } from 'react';
import { ChangelogItem, ChangeDetail } from '../types/kaizo';
import { subscribeToChangelog } from '../lib/firebase';
import {
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Layers,
  ArrowRight,
  ExternalLink,
  Sparkles,
  PlusCircle,
  Pencil,
  Trash2,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  UserPlus,
  UserMinus,
  Info,
  Award,
  Video
} from 'lucide-react';

export const ChangelogTab: React.FC = () => {
  const [changelog, setChangelog] = useState<ChangelogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = subscribeToChangelog((items) => {
      setChangelog(items);
      // Auto-expand the very latest entry if user hasn't toggled yet
      if (items.length > 0) {
        setExpandedItemIds(new Set([items[0].id]));
      }
    });
    return () => unsubscribe();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedItemIds(new Set(changelog.map((c) => c.id)));
  };

  const handleCollapseAll = () => {
    setExpandedItemIds(new Set());
  };

  // Filter and search changelog entries
  const filteredChangelog = useMemo(() => {
    return changelog.filter((item) => {
      // Action filter
      if (selectedFilter !== 'All') {
        const act = item.action.toLowerCase();
        if (selectedFilter === 'Completions' && !act.includes('completion') && !act.includes('proof')) return false;
        if (selectedFilter === 'Moves' && !act.includes('move') && !act.includes('reorder') && !act.includes('swap')) return false;
        if (selectedFilter === 'Updates' && !act.includes('update') && !act.includes('renamed') && !act.includes('details') && !act.includes('difficulty') && !act.includes('verifier') && !act.includes('creator')) return false;
        if (selectedFilter === 'Additions' && !act.includes('add') && !act.includes('register')) return false;
        if (selectedFilter === 'Deletions' && !act.includes('delete') && !act.includes('remove')) return false;
        if (selectedFilter === 'Submissions' && !act.includes('submission')) return false;
      }

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesAction = item.action.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesAuthor = (item.author || '').toLowerCase().includes(q);
        const matchesLevelName = (item.levelName || '').toLowerCase().includes(q);
        const matchesChanges = item.changes?.some(
          (c) =>
            (c.label || '').toLowerCase().includes(q) ||
            (c.description || '').toLowerCase().includes(q) ||
            String(c.oldValue || '').toLowerCase().includes(q) ||
            String(c.newValue || '').toLowerCase().includes(q)
        );

        if (!matchesAction && !matchesDesc && !matchesAuthor && !matchesLevelName && !matchesChanges) {
          return false;
        }
      }

      return true;
    });
  }, [changelog, selectedFilter, searchQuery]);

  // Action badge styling and icon mapping
  const getActionMeta = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('completion added')) {
      return {
        icon: <Award className="w-3.5 h-3.5 text-emerald-400" />,
        badgeBg: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30'
      };
    }
    if (act.includes('completion removed')) {
      return {
        icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />,
        badgeBg: 'bg-rose-400/10 text-rose-400 border-rose-400/30'
      };
    }
    if (act.includes('proof updated')) {
      return {
        icon: <Video className="w-3.5 h-3.5 text-cyan-400" />,
        badgeBg: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/30'
      };
    }
    if (act.includes('move') || act.includes('reorder') || act.includes('swapped')) {
      return {
        icon: <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />,
        badgeBg: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/30'
      };
    }
    if (act.includes('level added') || act.includes('add level')) {
      return {
        icon: <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />,
        badgeBg: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30'
      };
    }
    if (act.includes('level deleted') || act.includes('delete level')) {
      return {
        icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />,
        badgeBg: 'bg-rose-400/10 text-rose-400 border-rose-400/30'
      };
    }
    if (act.includes('difficulty')) {
      return {
        icon: <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />,
        badgeBg: 'bg-fuchsia-400/10 text-fuchsia-400 border-fuchsia-400/30'
      };
    }
    if (act.includes('renamed') || act.includes('verifier') || act.includes('creator') || act.includes('details') || act.includes('thumbnail') || act.includes('update')) {
      return {
        icon: <Pencil className="w-3.5 h-3.5 text-amber-400" />,
        badgeBg: 'bg-amber-400/10 text-amber-400 border-amber-400/30'
      };
    }
    if (act.includes('approve')) {
      return {
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
        badgeBg: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30'
      };
    }
    if (act.includes('reject')) {
      return {
        icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />,
        badgeBg: 'bg-rose-400/10 text-rose-400 border-rose-400/30'
      };
    }
    if (act.includes('player added') || act.includes('add player') || act.includes('player registered')) {
      return {
        icon: <UserPlus className="w-3.5 h-3.5 text-indigo-400" />,
        badgeBg: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/30'
      };
    }
    if (act.includes('player removed') || act.includes('delete player')) {
      return {
        icon: <UserMinus className="w-3.5 h-3.5 text-rose-400" />,
        badgeBg: 'bg-rose-400/10 text-rose-400 border-rose-400/30'
      };
    }
    if (act.includes('helper')) {
      return {
        icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />,
        badgeBg: 'bg-purple-400/10 text-purple-400 border-purple-400/30'
      };
    }
    return {
      icon: <Clock className="w-3.5 h-3.5 text-slate-400" />,
      badgeBg: 'bg-slate-800 text-slate-300 border-slate-700'
    };
  };

  const renderValueDisplay = (val: string | number | boolean | null | undefined) => {
    if (val === undefined || val === null) {
      return <span className="text-slate-500 italic text-xs">none</span>;
    }
    const str = String(val);
    if (str.startsWith('http://') || str.startsWith('https://')) {
      return (
        <a
          href={str}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 underline font-mono break-all"
        >
          <span>{str.length > 40 ? `${str.slice(0, 37)}...` : str}</span>
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      );
    }
    return <span className="font-mono text-xs break-all">{str}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="bg-[#111927] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search changelog by level, author (e.g. Everblaze), field modified, or action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExpandAll}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700/80 transition-colors"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700/80 transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {['All', 'Completions', 'Moves', 'Updates', 'Additions', 'Deletions', 'Submissions'].map((filterKey) => (
            <button
              key={filterKey}
              type="button"
              onClick={() => setSelectedFilter(filterKey)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                selectedFilter === filterKey
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {filterKey === 'All' ? 'All Entries' : filterKey}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-500 font-mono">
            Showing {filteredChangelog.length} of {changelog.length} entries
          </span>
        </div>
      </div>

      {/* Changelog Entries List */}
      <div className="space-y-3">
        {filteredChangelog.length === 0 ? (
          <div className="p-12 text-center bg-[#111927] border border-slate-800 rounded-2xl text-slate-400 space-y-2">
            <p className="text-sm">No changelog entries match your criteria.</p>
            {(searchQuery || selectedFilter !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedFilter('All');
                }}
                className="text-xs text-amber-400 hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          filteredChangelog.map((item) => {
            const isExpanded = expandedItemIds.has(item.id);
            const { icon, badgeBg } = getActionMeta(item.action);
            const changesCount = item.changes?.length || 0;

            return (
              <div
                key={item.id}
                className={`bg-[#111927] border rounded-2xl transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? 'border-amber-400/50 shadow-xl shadow-amber-400/5 bg-[#121c2d]'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header Row - Clickable to expand/collapse */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpand(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleExpand(item.id);
                    }
                  }}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="mt-0.5 p-2 bg-slate-900 border border-slate-800 rounded-xl shrink-0">
                      {icon}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Action Badge */}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${badgeBg}`}>
                          {item.action}
                        </span>

                        {/* Level Name Tag */}
                        {item.levelName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-900 text-slate-200 border border-slate-700">
                            <Layers className="w-3 h-3 text-amber-400" />
                            <span>{item.levelName}</span>
                          </span>
                        )}

                        {/* Author Attribution */}
                        {item.author && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/25">
                            <ShieldCheck className="w-3 h-3 text-amber-400" />
                            <span>By {item.author}</span>
                          </span>
                        )}

                        {/* Changes Count Pill */}
                        {changesCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                            <span>{changesCount} {changesCount === 1 ? 'change' : 'changes'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400">
                            Summary log
                          </span>
                        )}
                      </div>

                      {/* Main summary description */}
                      <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                        {item.description}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                        <span>{new Date(item.timestamp).toLocaleString()}</span>
                        <span>·</span>
                        <span className="text-amber-400/80 hover:text-amber-300 transition-colors">
                          {isExpanded ? 'Click to hide details' : 'Click to inspect exact changes'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      aria-label={isExpanded ? 'Collapse changes' : 'Expand changes'}
                      className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Granular Changes Breakdown */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-slate-800/80 bg-slate-950/40 animate-in fade-in duration-200">
                    <div className="pt-2 pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Exact Modifications Breakdown
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Log ID: {item.id}
                      </span>
                    </div>

                    {item.changes && item.changes.length > 0 ? (
                      <div className="space-y-2.5">
                        {item.changes.map((change, idx) => {
                          const isModified = change.type === 'modified' || (!change.type && change.oldValue !== undefined && change.newValue !== undefined);
                          const isAdded = change.type === 'added' || (!change.type && change.oldValue === undefined && change.newValue !== undefined);
                          const isRemoved = change.type === 'removed' || (!change.type && change.oldValue !== undefined && change.newValue === undefined);

                          return (
                            <div
                              key={idx}
                              className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-3.5 space-y-2 hover:border-slate-700/80 transition-colors"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Field label badge */}
                                  <span className="text-xs font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                                    {change.label}
                                  </span>

                                  {/* Type pill */}
                                  {isAdded && (
                                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                                      + Added
                                    </span>
                                  )}
                                  {isRemoved && (
                                    <span className="text-[10px] font-bold text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded border border-rose-500/30">
                                      - Removed
                                    </span>
                                  )}
                                  {isModified && (
                                    <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded border border-cyan-500/30">
                                      ~ Modified
                                    </span>
                                  )}
                                </div>

                                {change.field && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    field: {change.field}
                                  </span>
                                )}
                              </div>

                              {/* Descriptive sentence */}
                              {change.description && (
                                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                                  {change.description}
                                </p>
                              )}

                              {/* Before -> After Diff Box */}
                              {(change.oldValue !== undefined || change.newValue !== undefined) && (
                                <div className="bg-slate-950/80 rounded-lg p-2.5 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs">
                                  {change.oldValue !== undefined && (
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Previous:</span>
                                      <div className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/25 text-rose-300 line-through truncate max-w-xs sm:max-w-md">
                                        {renderValueDisplay(change.oldValue)}
                                      </div>
                                    </div>
                                  )}

                                  {change.oldValue !== undefined && change.newValue !== undefined && (
                                    <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0 hidden sm:block" />
                                  )}

                                  {change.newValue !== undefined && (
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">New:</span>
                                      <div className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-semibold truncate max-w-xs sm:max-w-md">
                                        {renderValueDisplay(change.newValue)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Fallback view for legacy or single-description changelog entries */
                      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-300 font-semibold">
                          <Info className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Detailed Summary Recorded:</span>
                        </div>
                        <p className="text-slate-300 pl-6 leading-relaxed font-sans">
                          {item.description}
                        </p>
                        <p className="text-[11px] text-slate-500 pl-6 italic">
                          (Note: This is an earlier log entry logged prior to field-by-field diff tracking.)
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
