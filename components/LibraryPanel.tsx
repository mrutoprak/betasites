
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, Folder } from '../types';
import { Plus, Trash2, Settings, Folder as FolderIcon, X, Layers, Download, ChevronDown, AlignJustify, Grip, PlayCircle } from 'lucide-react';
import { CardListItem } from './CardListItem';
import { ReviewModal } from './ReviewModal';
import { NebulaButton } from './NebulaButton';
import { MoveCardModal } from './MoveCardModal';

interface LibraryPanelProps {
  cards: Card[];
  folders: Folder[];
  onAddCard: () => void;
  onOpenBulk: () => void;
  onOpenSettings: () => void;
  onActivateCard: (card: Card) => void;
  onDeleteCard: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  onEditCard?: (card: Card) => void;
  onActivateFolder: (id: string) => void;
  onMoveCard: (card: Card, newFolderId: string | undefined) => void;
  selectedFolderId?: string | null; 
  onSelectFolder?: (id: string | null) => void;
}

const ITEMS_PER_PAGE = 20;

const FolderGroup: React.FC<{
  title: string;
  count: number;
  isOpen?: boolean;
  children: React.ReactNode;
  onDelete?: () => void;
  onActivate?: () => void;
  isActivated?: boolean;
}> = ({ title, count, isOpen = false, children, onDelete, onActivate, isActivated }) => {
  const [expanded, setExpanded] = useState(isOpen);
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm transition-all duration-300">
        <div 
          onClick={() => setExpanded(!expanded)} 
          className="w-full flex justify-between items-center p-3 bg-white hover:bg-gray-50 transition-colors cursor-pointer select-none"
        >
            <span className="font-semibold text-gray-800 flex items-center gap-2 text-[15px]">
                <FolderIcon size={18} className="text-[#007AFF]" />
                {title}
            </span>
            <div className="flex items-center gap-3">
                {isActivated && (
                    <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full uppercase tracking-wide">Active</span>
                )}
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
                
                {onActivate && !isActivated && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onActivate(); }}
                        className="p-1 text-[#007AFF] hover:bg-blue-50 rounded-full transition-colors"
                        title="Add Folder to Active Queue"
                    >
                        <PlayCircle size={18} />
                    </button>
                )}

                {onDelete && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${expanded ? '-rotate-180' : ''}`} />
            </div>
        </div>
        {expanded && (
          <div className="px-3 pb-3 space-y-3 border-t border-gray-100/50 pt-2 bg-gray-50/30">
            {children}
          </div>
        )}
    </div>
  )
}

export const LibraryPanel: React.FC<LibraryPanelProps> = ({
  cards,
  folders,
  onAddCard,
  onOpenBulk,
  onOpenSettings,
  onActivateCard,
  onDeleteCard,
  onBulkDelete,
  onCreateFolder,
  onDeleteFolder,
  onEditCard,
  onActivateFolder,
  onMoveCard,
  selectedFolderId,
  onSelectFolder
}) => {
  const [viewingCard, setViewingCard] = useState<Card | null>(null);
  const [movingCard, setMovingCard] = useState<Card | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false); 
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  
  // Group all library cards by folder (for Tree mode)
  const { categorizedCards, uncategorizedCards } = useMemo(() => {
    const allLib = cards.filter(c => c.status === 'library');
    const categorized: Record<string, Card[]> = {};
    const uncategorized: Card[] = [];
    
    allLib.forEach(c => {
      if (c.folderId && folders.some(f => f.id === c.folderId)) {
        if (!categorized[c.folderId]) categorized[c.folderId] = [];
        categorized[c.folderId].push(c);
      } else {
        uncategorized.push(c);
      }
    });
    
    return { categorizedCards: categorized, uncategorizedCards: uncategorized };
  }, [cards, folders]);

  useEffect(() => {
    if (!isSelectionMode) {
      setSelectedCardIds(new Set());
    }
  }, [isSelectionMode]);

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
  };

  const handleCardClick = useCallback((card: Card) => {
    setViewingCard(card);
  }, []);

  const handleLongPress = useCallback((card: Card) => {
    setMovingCard(card);
  }, []);

  const handleExportTxt = () => {
    const cardsToExport = cards.filter(c => c.status === 'library');
    
    if (cardsToExport.length === 0) return;
    const arabicWords = cardsToExport.map(card => {
      let cleanWord = card.arabicWord.replace(/\s*\(.*?\)\s*/g, '');
      return cleanWord.replace(/[a-zA-Zā-žĀ-Ž0-9]/g, '').trim();
    }).filter(Boolean).join('\n');
    const blob = new Blob([arabicWords], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'arabic_words.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setIsCreatingFolder(false);
    }
  };

  const handleEditFromModal = (card: Card) => {
      setViewingCard(null);
      if (onEditCard) {
          onEditCard(card);
      }
  };

  const handleMoveConfirm = (newFolderId: string | undefined) => {
      if (movingCard) {
          onMoveCard(movingCard, newFolderId);
          setMovingCard(null);
      }
  };

  const handleDeleteFolderWithConfirm = (folderId: string) => {
    if(window.confirm("Delete this folder? Cards inside will act as General/Uncategorized.")) {
      onDeleteFolder(folderId);
    }
  }

  return (
    <div className="h-full flex flex-col bg-transparent relative">
      <div className="px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-0 bg-[#F9F9F9] z-10 sticky top-0 transition-all duration-300">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold text-black tracking-tight">
              Library
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <button
                onClick={onOpenSettings}
                className="p-2 text-gray-400 hover:text-gray-600 active:scale-90 transition-transform"
            >
                <Settings size={22} />
            </button>

            <div className={`flex items-center gap-2`}>
              <button
                onClick={handleExportTxt}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full p-2 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hidden sm:block"
                title="Export to TXT"
              >
                <Download size={20} strokeWidth={2.5} />
              </button>

              <button
                onClick={onOpenBulk}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full p-2 shadow-sm transition-all active:scale-95"
                title="Bulk Add"
              >
                <Layers size={20} strokeWidth={2.5} />
              </button>

              <button
                onClick={onAddCard}
                className="bg-[#007AFF] hover:bg-[#006ee6] text-white rounded-full p-2 shadow-sm transition-all active:scale-95"
              >
                <Plus size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="pb-3 flex justify-end">
            <button
                onClick={() => setIsCreatingFolder(true)}
                className="text-[13px] font-medium text-[#007AFF] flex items-center gap-1 hover:bg-blue-50 px-3 py-1 rounded-full transition-colors"
            >
                <Plus size={14} /> New Folder
            </button>
        </div>
      </div>

      {isCreatingFolder && (
        <div className="px-5 pb-4 bg-[#F9F9F9] border-b border-gray-100 animate-in slide-in-from-top-2">
          <form onSubmit={handleCreateFolderSubmit} className="flex gap-2">
            <div className="relative flex-grow">
              <FolderIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="New Folder Name"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-gray-200 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={!newFolderName.trim()}
              className="bg-black text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingFolder(false)}
              className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl"
            >
              <X size={20} />
            </button>
          </form>
        </div>
      )}

      <div className="w-full h-px bg-gray-200/70"></div>

      <div
        className="flex-grow overflow-y-auto p-4 flex flex-col gap-4 content-start pb-24 min-h-0"
      >
            <div className="space-y-4">
                {folders.map(folder => {
                    const folderCards = categorizedCards[folder.id] || [];
                    return (
                        <FolderGroup
                            key={folder.id}
                            title={folder.name}
                            count={folderCards.length}
                            onDelete={() => handleDeleteFolderWithConfirm(folder.id)}
                            onActivate={() => onActivateFolder(folder.id)}
                            isActivated={folder.status === 'active'}
                        >
                            {folderCards.length > 0 ? folderCards.map(card => (
                                <CardListItem
                                    key={card.id}
                                    card={card}
                                    variant="library"
                                    onClick={handleCardClick}
                                    onLongPress={handleLongPress}
                                    onAction={() => {}} 
                                    isSelectionMode={false} 
                                    isSelected={false}
                                />
                            )) : (
                                <div className="text-center text-gray-400 py-4 text-sm italic">Empty Folder</div>
                            )}
                        </FolderGroup>
                    );
                })}
                
                <FolderGroup
                    title="General"
                    count={uncategorizedCards.length}
                    isOpen={true}
                >
                    {uncategorizedCards.length > 0 ? uncategorizedCards.map(card => (
                        <CardListItem
                            key={card.id}
                            card={card}
                            variant="library"
                            onClick={handleCardClick}
                            onLongPress={handleLongPress}
                            onAction={onActivateCard}
                            isSelectionMode={false}
                            isSelected={false}
                        />
                    )) : (
                        <div className="text-center text-gray-400 py-4 text-sm italic">No general cards</div>
                    )}
                </FolderGroup>
            </div>
      </div>

      {viewingCard && (
        <ReviewModal
          card={viewingCard}
          onClose={() => setViewingCard(null)}
          onDelete={onDeleteCard}
          onEdit={() => handleEditFromModal(viewingCard)} 
        />
      )}

      {movingCard && (
          <MoveCardModal
              isOpen={true}
              onClose={() => setMovingCard(null)}
              onMove={handleMoveConfirm}
              folders={folders}
              currentFolderId={movingCard.folderId}
          />
      )}
    </div>
  );
};
