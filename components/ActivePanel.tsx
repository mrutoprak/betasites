
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, Folder, SRS_INTERVALS, SRS_LABELS } from '../types';
import { CardListItem } from './CardListItem';
import { ReviewModal } from './ReviewModal';
import { Clock, CheckCircle2, ChevronDown, AlignJustify, Layers } from 'lucide-react';
import { startAlarm, stopAlarm } from '../utils/audio';

interface ActivePanelProps {
  cards: Card[];
  folders: Folder[];
  onUpdateCard: (card: Card) => void;
  onDeleteCard: (id: string) => void;
  onDeactivateCard: (id: string) => void;
}

const FolderGroup: React.FC<{
  title: string;
  cards: Card[];
  isInitiallyCollapsed?: boolean;
  onCardClick: (card: Card) => void;
  onDeactivateCard: (id: string) => void;
  formatTimeLeft: (time: number) => string | null;
}> = ({ title, cards, isInitiallyCollapsed = false, onCardClick, onDeactivateCard, formatTimeLeft }) => {
  const [isCollapsed, setIsCollapsed] = useState(isInitiallyCollapsed);

  if (cards.length === 0) return null;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-200/50 shadow-sm transition-all duration-300">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex justify-between items-center p-3 font-semibold text-gray-800 text-left"
      >
        <span>{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {cards.length}
          </span>
          <ChevronDown
            size={20}
            className={`transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''}`}
          />
        </div>
      </button>
      {!isCollapsed && (
        <div className="px-3 pb-3 space-y-3">
          {cards.map(card => (
            <CardListItem
              key={card.id}
              card={card}
              variant="active"
              timeLeft={formatTimeLeft(card.nextReviewTime)}
              onClick={onCardClick}
              onAction={onCardClick}
              onRemove={onDeactivateCard}
            />
          ))}
        </div>
      )}
    </div>
  );
};


export const ActivePanel: React.FC<ActivePanelProps> = ({ cards, folders, onUpdateCard, onDeleteCard, onDeactivateCard }) => {
  const [now, setNow] = useState(Date.now());
  const [reviewingCard, setReviewingCard] = useState<Card | null>(null);
  const [viewMode, setViewMode] = useState<'folders' | 'list'>('folders');

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAlarmActiveRef = useRef<boolean>(false);

  const activeCards = useMemo(() => cards.filter(c => c.status === 'active'), [cards]);
  
  const scheduleSmartTimer = useCallback((cardList: Card[]) => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    const currentTime = Date.now();
    const futureTimes = cardList.map(c => c.nextReviewTime).filter(t => t > currentTime);
    if (futureTimes.length === 0) return;

    const nearestDue = Math.min(...futureTimes);
    const delay = nearestDue - currentTime;

    timerRef.current = setTimeout(() => {
      const wakeTime = Date.now();
      setNow(wakeTime);
      if (!isAlarmActiveRef.current) {
        startAlarm();
        isAlarmActiveRef.current = true;
      }
      if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState === 'hidden') {
        new Notification('Review Time!', { body: 'A memory card is ready for review.', icon: '/favicon.ico' });
      }
      scheduleSmartTimer(cardList);
    }, Math.max(delay, 0));
  }, []);

  useEffect(() => {
    scheduleSmartTimer(activeCards);
    setNow(Date.now());
    return () => { if (timerRef.current !== null) clearTimeout(timerRef.current); };
  }, [activeCards, scheduleSmartTimer]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    return () => stopAlarm();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => { if (document.visibilityState === 'visible') setNow(Date.now()); };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    const handleUserInteraction = () => {
      if (isAlarmActiveRef.current) {
        stopAlarm();
        isAlarmActiveRef.current = false;
      }
    };
    window.addEventListener('click', handleUserInteraction, { once: true, capture: true });
    window.addEventListener('keydown', handleUserInteraction, { once: true, capture: true });
    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
    };
  }, [isAlarmActiveRef.current]);

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

  const { uncategorizedCards, categorizedCards } = useMemo(() => {
    const uncategorized: Card[] = [];
    const categorized: Record<string, Card[]> = {};
    sortedCards.forEach(card => {
      if (card.folderId && folders.find(f => f.id === card.folderId)) {
        if (!categorized[card.folderId]) categorized[card.folderId] = [];
        categorized[card.folderId].push(card);
      } else {
        uncategorized.push(card);
      }
    });
    return { uncategorizedCards: uncategorized, categorizedCards: categorized };
  }, [sortedCards, folders]);

  const folderOrder = useMemo(() => {
    return folders.map(f => f.id).filter(id => categorizedCards[id] && categorizedCards[id].length > 0);
}, [folders, categorizedCards]);

  const handleReviewAction = (card: Card) => {
    stopAlarm();
    isAlarmActiveRef.current = false;
    const nextIndex = Math.min(card.intervalIndex + 1, SRS_INTERVALS.length - 1);
    onUpdateCard({ ...card, intervalIndex: nextIndex, nextReviewTime: Date.now() + SRS_INTERVALS[nextIndex] });
    setReviewingCard(null);
  };

  const handleCardClick = useCallback((card: Card) => setReviewingCard(card), []);

  const formatTimeLeft = (targetTime: number) => {
    const diff = targetTime - now;
    if (diff <= 0) return null;
    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    if (minutes > 0) return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    return `${seconds}s`;
  };

  return (
    <div className="h-full flex flex-col bg-transparent relative">
      <div className="px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-3 bg-[#F9F9F9] border-b border-gray-200 shadow-sm z-10 sticky top-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold text-black tracking-tight">Active</h2>
            <div className="flex bg-gray-200/50 rounded-lg p-0.5 ml-2">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="List View"
              >
                <AlignJustify size={16} />
              </button>
              <button
                onClick={() => setViewMode('folders')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'folders' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="Folder View"
              >
                <Layers size={16} />
              </button>
            </div>
          </div>
          {activeCards.length > 0 && (
            <div className={`text-xs font-semibold px-3 py-1.5 rounded-full ${readyCount > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
              {readyCount} Due
            </div>
          )}
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {sortedCards.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 pb-20">
            <div className="bg-gray-100 p-6 rounded-full mb-4"><CheckCircle2 size={48} className="text-gray-300" /></div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up</h3>
            <p className="text-center text-sm text-gray-500 px-8">Move cards from your Library to start practicing.</p>
          </div>
        ) : (
          viewMode === 'list' ? (
              /* LIST VIEW */
              <div className="max-w-2xl mx-auto w-full space-y-3">
                 {sortedCards.map(card => (
                    <CardListItem
                      key={card.id}
                      card={card}
                      variant="active"
                      timeLeft={formatTimeLeft(card.nextReviewTime)}
                      onClick={handleCardClick}
                      onAction={handleCardClick}
                      onRemove={onDeactivateCard}
                    />
                 ))}
              </div>
          ) : (
              /* FOLDER VIEW */
              <div className="max-w-2xl mx-auto w-full space-y-4">
                {folderOrder.map(folderId => (
                  <FolderGroup
                    key={folderId}
                    title={folders.find(f => f.id === folderId)?.name || 'Folder'}
                    cards={categorizedCards[folderId]}
                    onCardClick={handleCardClick}
                    onDeactivateCard={onDeactivateCard}
                    formatTimeLeft={formatTimeLeft}
                  />
                ))}
                <FolderGroup
                  title="General"
                  cards={uncategorizedCards}
                  onCardClick={handleCardClick}
                  onDeactivateCard={onDeactivateCard}
                  formatTimeLeft={formatTimeLeft}
                />
              </div>
          )
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
