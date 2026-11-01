/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { LevelCard } from './components/LevelCard';
import { LevelDetailModal } from './components/LevelDetailModal';
import { PlayerProfileModal } from './components/PlayerProfileModal';
import { SubmitProofModal } from './components/SubmitProofModal';
import { VictorsHall } from './components/VictorsHall';
import { RulesSection } from './components/RulesSection';
import { EditListTab } from './components/EditListTab';
import { ErrorBoundary } from './components/ErrorBoundary';
import { KaizoLevel, ProofSubmission, PlayerProfile } from './types/kaizo';
import initialLevelsData from './data/kaizoLevels.json';
import { getSubmissions, saveSubmissions } from './utils/storage';
import { getPointsForRank, isLevelVerified, getVerifiedPlacements, getLevelIdFromLink } from './utils/kaizoUtils';
import {
  subscribeToLevels,
  subscribeToLevelsBundle,
  subscribeToPlayers,
  subscribeToDeletedLevels,
  subscribeToDeletedPlayers,
  syncLevelsToFirestore
} from './lib/firebase';
import { Sparkles, ExternalLink } from 'lucide-react';

export default function App() {
  // Live levels and players state initialized with static kaizoLevels.json as baseline
  const [levels, setLevels] = useState<KaizoLevel[]>(initialLevelsData as KaizoLevel[]);
  const [customPlayers, setCustomPlayers] = useState<PlayerProfile[]>([]);
  const [deletedLevelIds, setDeletedLevelIds] = useState<Set<string>>(new Set());
  const [deletedPlayerIds, setDeletedPlayerIds] = useState<Set<string>>(new Set());
  const [isFirestoreLive, setIsFirestoreLive] = useState(false);
  const [submissions, setSubmissions] = useState<ProofSubmission[]>(getSubmissions);

  // Navigation and Modal states
  const [activeTab, setActiveTab] = useState<'rankings' | 'victors' | 'rules' | 'edit-list'>('rankings');
  const [selectedLevel, setSelectedLevel] = useState<KaizoLevel | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [preselectedLevelId, setPreselectedLevelId] = useState<string | undefined>(undefined);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [sortBy, setSortBy] = useState<'rank' | 'easiest' | 'victors'>('rank');
  const [verificationFilter, setVerificationFilter] = useState<'Verified' | 'Unverified' | 'All'>('Verified');
  const [visibleCount, setVisibleCount] = useState(50);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Connect to Firebase Firestore on boot
  useEffect(() => {
    let unsubscribeLevels: (() => void) | undefined;
    let unsubscribePlayers: (() => void) | undefined;
    let unsubscribeDelLevels: (() => void) | undefined;
    let unsubscribeDelPlayers: (() => void) | undefined;

    const initFirestore = async () => {
      try {
        // Subscribe to deleted registries first
        unsubscribeDelLevels = subscribeToDeletedLevels((dSet) => {
          setDeletedLevelIds(dSet);
        });

        unsubscribeDelPlayers = subscribeToDeletedPlayers((dSet) => {
          setDeletedPlayerIds(dSet);
        });

        // Subscribe to custom players
        unsubscribePlayers = subscribeToPlayers((pList) => {
          setCustomPlayers(pList);
        });

        // Subscribe to real-time consolidated level bundle (1 document read for all 250+ levels!)
        unsubscribeLevels = subscribeToLevelsBundle(
          (bundleData) => {
            if (bundleData && Array.isArray(bundleData.levels) && bundleData.levels.length > 0) {
              const sorted = [...bundleData.levels].sort((a, b) => a.rank - b.rank);
              setLevels(sorted);
              setIsFirestoreLive(true);
            }
          },
          (err) => {
            console.warn('Firestore bundle subscription notice (using fallback):', err);
          }
        );
      } catch (err) {
        console.warn('Notice connecting to Firestore:', err);
      }
    };

    initFirestore();

    return () => {
      if (unsubscribeLevels) unsubscribeLevels();
      if (unsubscribePlayers) unsubscribePlayers();
      if (unsubscribeDelLevels) unsubscribeDelLevels();
      if (unsubscribeDelPlayers) unsubscribeDelPlayers();
    };
  }, []);

  const handleNewSubmission = (sub: ProofSubmission) => {
    const updated = [sub, ...submissions];
    setSubmissions(updated);
    saveSubmissions(updated);
    showToast('Proof submitted! Record logged to database.');
  };

  // Verified placements map across all levels ordered by rank
  const verifiedPlacements = useMemo(() => getVerifiedPlacements(levels), [levels]);

  // Filtered & Sorted Levels
  const filteredLevels = useMemo(() => {
    const safeLevels = Array.isArray(levels) ? levels : [];
    return safeLevels
      .filter((lvl) => {
        if (!lvl) return false;
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            (lvl.name || '').toLowerCase().includes(q) ||
            (lvl.creator || '').toLowerCase().includes(q) ||
            (lvl.verifier || '').toLowerCase().includes(q) ||
            getLevelIdFromLink(lvl.directPlayUrl || '').toLowerCase().includes(q);
          if (!matches) return false;
        }

        // Difficulty filter
        if (selectedDifficulty !== 'All') {
          if (lvl.difficulty !== selectedDifficulty) return false;
        }

        // Verification filter (default: Verified)
        if (verificationFilter === 'Verified' && !isLevelVerified(lvl)) {
          return false;
        }
        if (verificationFilter === 'Unverified' && isLevelVerified(lvl)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aVerifiedPlacement = verifiedPlacements.get(a.id);
        const bVerifiedPlacement = verifiedPlacements.get(b.id);
        const aRank = typeof a?.rank === 'number' ? a.rank : 999;
        const bRank = typeof b?.rank === 'number' ? b.rank : 999;

        if (sortBy === 'rank') {
          if (verificationFilter === 'Verified') {
            return (aVerifiedPlacement ?? aRank) - (bVerifiedPlacement ?? bRank);
          }
          return aRank - bRank;
        }
        if (sortBy === 'easiest') {
          if (verificationFilter === 'Verified') {
            return (bVerifiedPlacement ?? bRank) - (aVerifiedPlacement ?? aRank);
          }
          return bRank - aRank;
        }
        if (sortBy === 'victors') {
          const aVicCount = Array.isArray(a?.victors) ? a.victors.length : 0;
          const bVicCount = Array.isArray(b?.victors) ? b.victors.length : 0;
          return bVicCount - aVicCount;
        }
        return 0;
      });
  }, [levels, searchQuery, selectedDifficulty, sortBy, verificationFilter, verifiedPlacements]);

  const handleQuickPlay = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenSubmitForLevel = (level: KaizoLevel) => {
    setPreselectedLevelId(level.id);
    setIsSubmitModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-60 bg-amber-400 text-slate-950 px-4 py-2.5 rounded-xl shadow-xl font-medium text-xs sm:text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <Sparkles className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSubmitModal={() => {
          setPreselectedLevelId(undefined);
          setIsSubmitModalOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'rankings' && (
          <div>
            {/* Hero Section wrapped in ErrorBoundary */}
            <ErrorBoundary fallbackTitle="Hero Banner Notice">
              <HeroSection
                levels={levels}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedDifficulty={selectedDifficulty}
                setSelectedDifficulty={setSelectedDifficulty}
                sortBy={sortBy}
                setSortBy={setSortBy}
                verificationFilter={verificationFilter}
                setVerificationFilter={setVerificationFilter}
                onOpenSubmitModal={() => {
                  setPreselectedLevelId(undefined);
                  setIsSubmitModalOpen(true);
                }}
              />
            </ErrorBoundary>

            {/* Level Rankings List Container */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
              {filteredLevels.length === 0 ? (
                <div className="p-12 text-center bg-[#111927] border border-slate-800 rounded-2xl text-slate-400 space-y-3">
                  <p className="text-sm">No levels match your search or filter criteria.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedDifficulty('All');
                      setVerificationFilter('Verified');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 rounded-lg transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <ErrorBoundary fallbackTitle="Level List Notice">
                  <div className="space-y-3">
                    {filteredLevels.slice(0, visibleCount).map((level) => {
                      const verifiedPlacement = verifiedPlacements.get(level.id);
                      return (
                        <LevelCard
                          key={level.id}
                          level={level}
                          displayRank={verificationFilter === 'Verified' ? verifiedPlacement : level.rank}
                          points={verifiedPlacement ? getPointsForRank(verifiedPlacement) : 0}
                          onSelectLevel={(lvl) => setSelectedLevel(lvl)}
                          onQuickPlay={handleQuickPlay}
                        />
                      );
                    })}
                  </div>

                  {visibleCount < filteredLevels.length && (
                    <div className="mt-8 flex items-center justify-center gap-3">
                      <button
                        onClick={() => setVisibleCount((prev) => prev + 50)}
                        className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-all active:scale-95"
                      >
                        Load Next 50 Levels ({filteredLevels.length - visibleCount} remaining)
                      </button>
                      <button
                        onClick={() => setVisibleCount(filteredLevels.length)}
                        className="px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                      >
                        Show All {filteredLevels.length} Levels
                      </button>
                    </div>
                  )}
                </ErrorBoundary>
              )}
            </div>
          </div>
        )}

        {activeTab === 'victors' && (
          <ErrorBoundary fallbackTitle="Victors Leaderboard Notice">
            <VictorsHall
              levels={levels}
              onSelectLevel={(lvl) => setSelectedLevel(lvl)}
              onSelectPlayer={(pName) => setSelectedPlayerName(pName)}
            />
          </ErrorBoundary>
        )}

        {activeTab === 'rules' && (
          <ErrorBoundary fallbackTitle="Rules Section Notice">
            <RulesSection
              onOpenSubmitModal={() => {
                setPreselectedLevelId(undefined);
                setIsSubmitModalOpen(true);
              }}
            />
          </ErrorBoundary>
        )}

        {activeTab === 'edit-list' && (
          <ErrorBoundary fallbackTitle="Edit List Database Notice">
            <EditListTab
              levels={levels}
              customPlayers={customPlayers}
              isFirestoreLive={isFirestoreLive}
              onToast={showToast}
              onSelectPlayer={(pName) => setSelectedPlayerName(pName)}
            />
          </ErrorBoundary>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0d131f] py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-slate-300">
              Goober Dash Kaizo List
            </span>
            <span aria-hidden="true">·</span>
            <span>Community platforming demonlist & record registry</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <a
              href="https://discord.gg/NSnCcsJNnm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold text-xs transition-all shadow-md shadow-[#5865F2]/20 active:scale-95 group"
            >
              <svg className="w-4 h-4 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              <span>Join the GDKL Discord</span>
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="https://winterpixel.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-200 transition-colors inline-flex items-center gap-1"
            >
              <span>Goober Dash Official</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>

      {/* Level Detail Modal */}
      <ErrorBoundary fallbackTitle="Level Detail Modal Notice">
        <LevelDetailModal
          level={selectedLevel}
          displayRank={verificationFilter === 'Verified' && selectedLevel ? verifiedPlacements.get(selectedLevel.id) : selectedLevel?.rank}
          pointsAwarded={selectedLevel && verifiedPlacements.get(selectedLevel.id) ? getPointsForRank(verifiedPlacements.get(selectedLevel.id)!) : 0}
          onClose={() => setSelectedLevel(null)}
          onSubmitProofForLevel={handleOpenSubmitForLevel}
          onSelectPlayer={(pName) => setSelectedPlayerName(pName)}
        />
      </ErrorBoundary>

      {/* Player Profile Modal */}
      {selectedPlayerName && (
        <ErrorBoundary fallbackTitle="Player Profile Modal Notice">
          <PlayerProfileModal
            playerName={selectedPlayerName}
            levels={levels}
            onClose={() => setSelectedPlayerName(null)}
            onSelectLevel={(lvl) => setSelectedLevel(lvl)}
            onQuickPlay={handleQuickPlay}
          />
        </ErrorBoundary>
      )}

      {/* Submit Proof Modal */}
      <ErrorBoundary fallbackTitle="Submit Proof Modal Notice">
        <SubmitProofModal
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          levels={levels}
          preselectedLevelId={preselectedLevelId}
          onSubmitSuccess={handleNewSubmission}
        />
      </ErrorBoundary>
    </div>
  );
}
