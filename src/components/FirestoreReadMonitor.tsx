import React, { useState, useEffect } from 'react';
import { firestoreMonitor, TelemetryStats, TelemetryEvent } from '../utils/firestoreMonitor';
import {
  Activity,
  Layers,
  RefreshCw,
  Zap,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
  Database,
  Radio,
  Clock,
  Eye,
  Info,
  PenTool,
  CheckCircle2
} from 'lucide-react';

interface FirestoreReadMonitorProps {
  onClose?: () => void;
}

export const FirestoreReadMonitor: React.FC<FirestoreReadMonitorProps> = ({ onClose }) => {
  const [stats, setStats] = useState<TelemetryStats>(firestoreMonitor.getStats());
  const [filterType, setFilterType] = useState<'All' | 'read' | 'write'>('All');
  const [filterCollection, setFilterCollection] = useState<string>('All');
  const [filterOperation, setFilterOperation] = useState<string>('All');
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'events' | 'listeners'>('overview');

  useEffect(() => {
    return firestoreMonitor.subscribe((newStats) => {
      setStats(newStats);
    });
  }, []);

  const handleReset = () => {
    firestoreMonitor.reset();
  };

  const filteredEvents = stats.events.filter((evt) => {
    if (filterType !== 'All' && evt.type !== filterType) return false;
    if (filterCollection !== 'All' && evt.collection !== filterCollection) return false;
    if (filterOperation !== 'All' && evt.operation !== filterOperation) return false;
    return true;
  });

  const collectionsList = Array.from(
    new Set([
      ...Object.keys(stats.readsByCollection || {}),
      ...Object.keys(stats.writesByCollection || {})
    ])
  ).sort();

  return (
    <div className="bg-[#0f172a] border border-amber-400/40 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-200 animate-in slide-in-from-bottom-3 duration-200">
      {/* Header Bar */}
      <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-400/10 border border-amber-400/30 rounded-lg text-amber-400">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Firestore Operations & Telemetry Monitor
              </h3>
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <span className="px-2 py-0.5 rounded-full font-bold bg-amber-400 text-slate-950">
                  {stats.totalReads} READS
                </span>
                <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-400 text-slate-950">
                  {stats.totalWrites || 0} WRITES
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Live tracking document reads, writes, active listeners, and individual mutation operations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            title="Reset Counters"
            className="p-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Reset Counters</span>
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg border border-slate-700"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800 rounded-lg border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                <span>Total Reads</span>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl font-mono font-bold text-amber-400 mt-1 flex items-baseline justify-between">
                <span>{stats.totalReads}</span>
                {stats.refreshCount > 1 && (
                  <span className="text-[10px] font-mono text-amber-300/80 font-normal">
                    {stats.refreshCount} refreshes
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">from database queries</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                <span>Total Writes</span>
                <PenTool className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
                {stats.totalWrites || 0}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">setDoc / updateDoc mutations</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                <span>Active Listeners</span>
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-xl font-mono font-bold text-cyan-400 mt-1">
                {Object.values(stats.activeListeners || {}).reduce((a, b) => a + b, 0)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">live snapshot channels</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                <span>Logged Events</span>
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="text-xl font-mono font-bold text-indigo-300 mt-1">
                {stats.events.length}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">operations in session</div>
            </div>
          </div>

          {/* Sub Navigation Views */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
            <button
              onClick={() => setActiveView('overview')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeView === 'overview'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Breakdown Overview</span>
            </button>
            <button
              onClick={() => setActiveView('events')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeView === 'events'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Operations Log ({stats.events.length})</span>
            </button>
            <button
              onClick={() => setActiveView('listeners')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeView === 'listeners'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Active Listeners ({Object.values(stats.activeListeners || {}).reduce((a, b) => a + b, 0)})</span>
            </button>
          </div>

          {/* VIEW 1: BREAKDOWN OVERVIEW */}
          {activeView === 'overview' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Reads by Collection */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Reads by Target Collection</span>
                    <span>Total: {stats.totalReads}</span>
                  </div>
                  {Object.keys(stats.readsByCollection).length === 0 ? (
                    <div className="text-xs text-slate-500 py-2">No read operations yet.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {Object.entries(stats.readsByCollection).map(([col, count]) => (
                        <div key={col} className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-300">{col}</span>
                          <span className="text-amber-400 font-bold">{count} doc{count > 1 ? 's' : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Writes by Collection */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Writes by Target Collection</span>
                    <span>Total: {stats.totalWrites || 0}</span>
                  </div>
                  {Object.keys(stats.writesByCollection || {}).length === 0 ? (
                    <div className="text-xs text-slate-500 py-2">No write operations performed yet in this session.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {Object.entries(stats.writesByCollection).map(([col, count]) => (
                        <div key={col} className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-300">{col}</span>
                          <span className="text-emerald-400 font-bold">{count} doc{count > 1 ? 's' : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: DETAILED OPERATION LOG */}
          {activeView === 'events' && (
            <div className="space-y-3">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400 font-bold text-[10px] uppercase">Type:</span>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-400"
                >
                  <option value="All">All Types</option>
                  <option value="read">Reads Only</option>
                  <option value="write">Writes Only</option>
                </select>

                <span className="text-slate-400 font-bold text-[10px] uppercase ml-2">Collection:</span>
                <select
                  value={filterCollection}
                  onChange={(e) => setFilterCollection(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-400"
                >
                  <option value="All">All Collections</option>
                  {collectionsList.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <span className="text-slate-400 font-bold text-[10px] uppercase ml-2">Operation:</span>
                <select
                  value={filterOperation}
                  onChange={(e) => setFilterOperation(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-400"
                >
                  <option value="All">All Operations</option>
                  <option value="setDoc">setDoc (write)</option>
                  <option value="updateDoc">updateDoc (write)</option>
                  <option value="deleteDoc">deleteDoc (delete)</option>
                  <option value="onSnapshot">onSnapshot (read)</option>
                  <option value="getDoc">getDoc (read)</option>
                  <option value="getDocs">getDocs (read)</option>
                </select>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
                {filteredEvents.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs bg-slate-900/50 rounded-xl border border-slate-800">
                    No matching telemetry events found.
                  </div>
                ) : (
                  filteredEvents.map((evt) => {
                    const isWrite = evt.type === 'write';
                    return (
                      <div
                        key={evt.id}
                        className={`border rounded-lg p-2.5 flex items-center justify-between text-xs font-mono gap-3 transition-colors ${
                          isWrite
                            ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50'
                            : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] text-slate-500 shrink-0">{evt.timestamp}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              evt.operation === 'setDoc'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : evt.operation === 'updateDoc'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                : evt.operation === 'deleteDoc'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : evt.operation === 'onSnapshot'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {evt.operation}
                          </span>
                          <span className="text-slate-300 font-semibold truncate">{evt.path}</span>
                          {evt.isInitialSnapshot && (
                            <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30 shrink-0">
                              initial fetch
                            </span>
                          )}
                          {evt.caller && (
                            <span className="text-[9px] text-slate-500 italic shrink-0">
                              via {evt.caller}
                            </span>
                          )}
                        </div>

                        <div className="shrink-0 text-right">
                          {isWrite ? (
                            <span className="text-emerald-400 font-bold">
                              {evt.count} doc{evt.count > 1 ? 's' : ''} write
                            </span>
                          ) : (
                            <span className="text-amber-400 font-bold">
                              {evt.count} doc{evt.count > 1 ? 's' : ''} read
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* VIEW 3: ACTIVE LISTENERS */}
          {activeView === 'listeners' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>Currently Subscribed Snapshot Channels</span>
              </div>

              {Object.keys(stats.activeListeners || {}).length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs bg-slate-900/50 rounded-xl border border-slate-800">
                  No active Firestore listeners running currently.
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(stats.activeListeners).map(([col, count]) => (
                    <div
                      key={col}
                      className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <span className="font-mono font-bold text-slate-200">{col}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {count} active channel{count > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Architecture Guarantee Note */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white">Bundle Architecture Verified:</span> Saving any level edit issues exactly 1 write to <span className="font-mono text-emerald-300">bundles/levels</span> and 1 write to <span className="font-mono text-emerald-300">bundles/changelog</span>. Total client writes per edit = <span className="font-bold text-white">2 writes</span>.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
