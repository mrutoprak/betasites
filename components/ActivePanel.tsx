
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, Folder, SRS_INTERVALS, SRS_LABELS } from '../types';
import { CardListItem } from './CardListItem';
import { ReviewModal } from './ReviewModal';
import { Clock, CheckCircle2 } from 'lucide-react';
import { startAlarm, stopAlarm } from '../utils/audio';

interface ActivePanelProps {
  cards: Card[];
  folders: Folder[];
  onUpdateCard: (card: Card) => void;
  onDeleteCard: (id: string) => void;
  onDeactivateCard: (id: string) => void;
}

export const ActivePanel: React.FC<ActivePanelProps> = ({ cards, folders, onUpdateCard, onDeleteCard, onDeactivateCard }) => {
  const [now, setNow] = useState(Date.now());
  const [reviewingCard, setReviewingCard] = useState<Card | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAlarmActiveRef = useRef<boolean>(false);

  // Memoize active cards list with folder filter
  const activeCards = useMemo(() => {
    let filtered = cards.filter(c => c.status === 'active');
    if (selectedFolderId) {
      filtered = filtered.filter(c => c.folderId === selectedFolderId);
    }
    return filtered;
  }, [cards, selectedFolderId]);

  // ── Smart Timer ───────────────────────────────────────────────────────────
  // Fires exactly when the nearest not-yet-due card becomes due.
  // No per-second polling — UI only updates when something actually changes.
  const scheduleSmartTimer = useCallback((cardList: Card[]) => {
    // Clear any pending timer
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const currentTime = Date.now();

    // Find the soonest future due time among cards that are not yet due
    const futureTimes = cardList
      .map(c => c.nextReviewTime)
      .filter(t => t > currentTime);

    if (futureTimes.length === 0) return; // All cards are already due — nothing to schedule

    const nearestDue = Math.min(...futureTimes);
    const delay = nearestDue - currentTime;

    timerRef.current = setTimeout(() => {
      const wakeTime = Date.now();
      setNow(wakeTime); // Trigger a re-render exactly when first card becomes due

      // Fire alarm
      if (!isAlarmActiveRef.current) {
        startAlarm();
        isAlarmActiveRef.current = true;
      }

      // Fire notification if tab is hidden
      if ('Notification' in window && Notification.permission === 'granted') {
        if (document.visibilityState === 'hidden') {
          new Notification('Review Time!', {
            body: 'A memory card is ready for review.',
            icon: '/favicon.ico',
          });
        }
      }

      // Re-arm for the next card that will become due
      scheduleSmartTimer(cardList);
    }, Math.max(delay, 0));
  }, []); // stable — uses only refs and local params

  // Re-schedule whenever the set of active cards changes
  useEffect(() => {
    scheduleSmartTimer(activeCards);
    // Also refresh `now` immediately so the UI reflects the current state
    setNow(Date.now());
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [activeCards, scheduleSmartTimer]);

  // ── One-time setup ────────────────────────────────────────────────────────
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    return () => stopAlarm();
  }, []);

  // Refresh when the user comes back to the tab (no interval needed)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setNow(Date.now());
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Stop alarm on any user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      if (isAlarmActiveRef.current) {
        stopAlarm();
        isAlarmActiveRef.current = false;
      }
    };
    window.addEventListener('click', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);
    window.addEventListener('touchstart', handleUserInteraction);
    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────
  const readyCount = activeCards.filter(c => now >= c.nextReviewTime).length;

  const sortedCards = useMemo(() => {
    return [...activeCards].sort((a, b) => {
      const aReady = now >= a.nextReviewTime;
      const bReady = now >= b.nextReviewTime;
      if (aReady && !bReady) return -1;
      if (!aReady && bReady) return 1;
      return a.nextReviewTime - b.nextReviewTime;
    });
  }, [activeCards, now]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleReviewAction = (card: Card) => {
    stopAlarm();
    isAlarmActiveRef.current = false;

    const nextIndex = Math.min(card.intervalIndex + 1, SRS_INTERVALS.length - 1);
    const nextInterval = SRS_INTERVALS[nextIndex];

    const updatedCard: Card = {
      ...card,
      intervalIndex: nextIndex,
      nextReviewTime: Date.now() + nextInterval,
    };
    onUpdateCard(updatedCard);
    setReviewingCard(null);
  };

  const handleCardClick = useCallback((card: Card) => {
    setReviewingCard(card);
  }, []);

  const formatTimeLeft = (targetTime: number) => {
    const diff = targetTime - now;
    if (diff <= 0) return null;

    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pMin = minutes.toString().padStart(2, '0');
    const pSec = seconds.toString().padStart(2, '0');

    if (hours > 0) return `${hours}h ${pMin}m`;
    if (minutes > 0) return `${minutes}m ${pSec}s`;
    return `${seconds}s`;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-transparent relative">
      <div className="px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-0 bg-[#F9F9F9] border-b border-gray-200 shadow-sm z-10 sticky top-0">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-3xl font-bold text-black tracking-tight">
            Active
          </h2>
          {activeCards.length > 0 && (
            <div className={`text-xs font-semibold px-3 py-1.5 rounded-full ${readyCount > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
              {readyCount} Due
            </div>
          )}
        </div>

        {/* Folder Chips */}
        {folders.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar -mx-5 px-5">
            <button
              onClick={() => setSelectedFolderId(null)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${selectedFolderId === null
                  ? 'bg-black text-white'
                  : 'bg-white border border-gray-200 text-gray-600'
                }`}
            >
              All
            </button>
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolderId(folder.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap ${selectedFolderId === folder.id
                    ? 'bg-[#007AFF] text-white'
                    : 'bg-white border border-gray-200 text-gray-600'
                  }`}
              >
                {folder.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-grow overflow-y-auto p-4 space-y-3">
        {sortedCards.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 pb-20">
            <div className="bg-gray-100 p-6 rounded-full mb-4">
              <CheckCircle2 size={48} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up</h3>
            <p className="text-center text-sm text-gray-500 px-8">
              {selectedFolderId
                ? 'No active cards in this folder.'
                : 'Move cards from your Library to start practicing.'}
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto w-full space-y-3">
            {sortedCards.map(card => {
              const timeLeft = formatTimeLeft(card.nextReviewTime);
              return (
                <CardListItem
                  key={card.id}
                  card={card}
                  variant="active"
                  timeLeft={timeLeft}
                  onClick={handleCardClick}
                  onAction={handleCardClick}
                  onRemove={onDeactivateCard}
                />
              );
            })}
          </div>
        )}
      </div>

      {reviewingCard && (
        <ReviewModal
          card={reviewingCard}
          onClose={() => setReviewingCard(null)}
          onDelete={onDeleteCard}
          isReviewMode={true}
          onNextReview={() => handleReviewAction(reviewingCard)}
          timeLeft={formatTimeLeft(reviewingCard.nextReviewTime)}
          actionLabel={`Next (${SRS_LABELS[Math.min(reviewingCard.intervalIndex + 1, SRS_INTERVALS.length - 1)]})`}
        />
      )}
    </div>
  );
};
