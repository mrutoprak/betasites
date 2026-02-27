
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, Folder, SRS_INTERVALS, SRS_LABELS } from '../types';
import { CardListItem } from './CardListItem';
import { ReviewModal } from './ReviewModal';
import { FolderReviewModal } from './FolderReviewModal';
import { Clock, CheckCircle2, ChevronDown, AlignJustify, Layers, Folder as FolderIcon, Trash2, PlayCircle, MinusCircle } from 'lucide-react';
import { startAlarm, stopAlarm } from '../utils/audio';

interface ActivePanelProps {
  cards: Card[];
  folders: Folder[];
  onUpdateCard: (card: Card) => void;
  onDeleteCard: (id: string) => void;
  onDeactivateCard: (id: string) => void;
  onUpdateFolder: (folder: Folder) => void;
  onDeactivateFolder: (id: string) => void;
}

const ActiveFolderItem: React.FC<{
    folder: Folder;
    folderCards: Card[];
    timeLeft: string | null;
    onReview: () => void;
    onRemove: () => void;
    onCardClick: (card: Card) => void;
}> = ({ folder, folderCards, timeLeft, onReview, onRemove, onCardClick }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div 
            className="group relative bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-300 border border-gray-100 overflow-hidden w-full flex-shrink-0"
        >
            <div 
                onClick={() => setExpanded(!expanded)}
                className="flex items-center p-4 cursor-pointer select-none"
            >
                <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mr-4">
                    <FolderIcon className="text-blue-500" size={24} />
                </div>
                <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-gray-900 text-[17px] truncate pr-2 flex items-center gap-2">
                            {folder.name}
                            <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${expanded ? '-rotate-180' : ''}`} />
                        </h3>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRemove(); }}
                            className="text-gray-300 hover:text-red-500 transition-colors p-1 -mr-2"
                            title="Remove from Active Queue"
                        >
                            <MinusCircle size={18} strokeWidth={2} />
                        </button>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {folderCards.length} cards
                        </span>
                        <div className="flex items-center gap-2">
                             <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                timeLeft ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                             }`}>
                                {timeLeft ? timeLeft : 'Review Now'}
                             </span>
                             <button 
                                onClick={(e) => { e.stopPropagation(); onReview(); }}
                                className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                                    timeLeft ? 'bg-gray-50 text-gray-400' : 'bg-blue-600 text-white shadow-md shadow-blue-500/20 hover:bg-blue-700'
                                }`}
                                title="Start Review"
                             >
                                {timeLeft ? <Clock size={14} /> : <PlayCircle size={14} fill="currentColor" />}
                             </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expanded Cards List */}
            {expanded && (
                <div className="px-3 pb-3 space-y-2 border-t border-gray-100 bg-gray-50/50 pt-2">
                    {folderCards.length > 0 ? (
                        folderCards.map(card => (
                            <CardListItem
                                key={card.id}
                                card={card}
                                variant="library" // Using library variant for read-only feel
                                onAction={() => {}} // No action for cards inside active folder
                                isSelectionMode={false}
                                isSelected={false}
                                onClick={() => onCardClick(card)}
                                hideDetails={true}
                            />
                        ))
                    ) : (
                        <p className="text-center text-gray-400 text-xs py-2 italic">No cards in this folder</p>
                    )}
                </div>
            )}
        </div>
    );
}

export const ActivePanel: React.FC<ActivePanelProps> = ({ 
  cards, 
  folders, 
  onUpdateCard, 
  onDeleteCard, 
  onDeactivateCard, 
  onUpdateFolder, 
  onDeactivateFolder
}) => {
  const [now, setNow] = useState(Date.now());
  const [reviewingCard, setReviewingCard] = useState<Card | null>(null);
  const [reviewingFolder, setReviewingFolder] = useState<Folder | null>(null);
  const [viewingDetailsCard, setViewingDetailsCard] = useState<Card | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAlarmActiveRef = useRef<boolean>(false);

  // Identify Active Items
  // 1. Active Folders
  const activeFolders = useMemo(() => folders.filter(f => f.status === 'active'), [folders]);
  // 2. Active Loose Cards (not in any folder)
  const activeLooseCards = useMemo(() => cards.filter(c => c.status === 'active' && !c.folderId), [cards]);

  // Combine for Timer Logic
  const allActiveItems = useMemo(() => {
      return [
          ...activeFolders.map(f => ({ type: 'folder' as const, nextReviewTime: f.nextReviewTime || 0 })),
          ...activeLooseCards.map(c => ({ type: 'card' as const, nextReviewTime: c.nextReviewTime }))
      ];
  }, [activeFolders, activeLooseCards]);
  
  const scheduleSmartTimer = useCallback((items: { nextReviewTime: number }[]) => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    const currentTime = Date.now();
    const futureTimes = items.map(i => i.nextReviewTime).filter(t => t > currentTime);
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
        new Notification('Review Time!', { body: 'A memory card or folder is ready for review.', icon: '/favicon.ico' });
      }
      scheduleSmartTimer(items); 
    }, Math.max(delay, 0));
  }, []);

  useEffect(() => {
    scheduleSmartTimer(allActiveItems);
    setNow(Date.now());
    return () => { if (timerRef.current !== null) clearTimeout(timerRef.current); };
  }, [allActiveItems, scheduleSmartTimer]);

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

  const readyCount = allActiveItems.filter(i => now >= i.nextReviewTime).length;

  // Sorted List for Rendering
  const sortedItems = useMemo(() => {
      const items = [
          ...activeFolders.map(f => ({ type: 'folder' as const, data: f, nextReviewTime: f.nextReviewTime || 0 })),
          ...activeLooseCards.map(c => ({ type: 'card' as const, data: c, nextReviewTime: c.nextReviewTime }))
      ];
      
      return items.sort((a, b) => {
          const aReady = now >= a.nextReviewTime;
          const bReady = now >= b.nextReviewTime;
          if (aReady && !bReady) return -1;
          if (!aReady && bReady) return 1;
          return a.nextReviewTime - b.nextReviewTime;
      });
  }, [activeFolders, activeLooseCards, now]);


  const handleReviewAction = (card: Card) => {
    stopAlarm();
    isAlarmActiveRef.current = false;
    const nextIndex = Math.min(card.intervalIndex + 1, SRS_INTERVALS.length - 1);
    onUpdateCard({ ...card, intervalIndex: nextIndex, nextReviewTime: Date.now() + SRS_INTERVALS[nextIndex] });
    setReviewingCard(null);
  };
  
  const handleUpdateFolderWrapper = (folder: Folder) => {
      stopAlarm();
      isAlarmActiveRef.current = false;
      onUpdateFolder(folder);
      setReviewingFolder(null);
  }

  const handleCardClick = useCallback((card: Card) => setReviewingCard(card), []);
  const handleFolderClick = useCallback((folder: Folder) => setReviewingFolder(folder), []);

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

  // Cards for the reviewing folder
  const reviewingFolderCards = useMemo(() => {
      if (!reviewingFolder) return [];
      return cards.filter(c => c.folderId === reviewingFolder.id);
  }, [cards, reviewingFolder]);

  return (
    <div className="h-full flex flex-col bg-transparent relative">
      <div className="px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-3 bg-[#F9F9F9] border-b border-gray-200 shadow-sm z-10 sticky top-0">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-black tracking-tight">Active</h2>
          {sortedItems.length > 0 && (
            <div className={`text-xs font-semibold px-3 py-1.5 rounded-full ${readyCount > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
              {readyCount} Due
            </div>
          )}
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {sortedItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 pb-20">
            <div className="bg-gray-100 p-6 rounded-full mb-4"><CheckCircle2 size={48} className="text-gray-300" /></div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up</h3>
            <p className="text-center text-sm text-gray-500 px-8">Move cards from your Library to start practicing.</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto w-full space-y-3">
             {sortedItems.map((item, idx) => {
                 if (item.type === 'folder') {
                     const folder = item.data as Folder;
                     const folderCards = cards.filter(c => c.folderId === folder.id);
                     return (
                         <ActiveFolderItem 
                             key={`folder-${folder.id}`}
                             folder={folder}
                             folderCards={folderCards}
                             timeLeft={formatTimeLeft(folder.nextReviewTime || 0)}
                             onReview={() => handleFolderClick(folder)}
                             onRemove={() => onDeactivateFolder(folder.id)}
                             onCardClick={(card) => setViewingDetailsCard(card)}
                         />
                     );
                 } else {
                     const card = item.data as Card;
                     return (
                        <CardListItem
                          key={`card-${card.id}`}
                          card={card}
                          variant="active"
                          timeLeft={formatTimeLeft(card.nextReviewTime)}
                          onClick={handleCardClick}
                          onAction={handleCardClick}
                          onRemove={onDeactivateCard}
                        />
                     );
                 }
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

      {reviewingFolder && (
          <FolderReviewModal
              folder={reviewingFolder}
              cards={reviewingFolderCards}
              onClose={() => setReviewingFolder(null)}
              onUpdateFolder={handleUpdateFolderWrapper}
          />
      )}

      {viewingDetailsCard && (
          <ReviewModal
              card={viewingDetailsCard}
              onClose={() => setViewingDetailsCard(null)}
              onDelete={onDeleteCard}
              isReviewMode={false} // View only
          />
      )}
    </div>
  );
};
