
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, Folder } from '../types';
import { Plus, Trash2, Settings, Folder as FolderIcon, X, Layers, Download } from 'lucide-react';
import { CardListItem } from './CardListItem';
import { ReviewModal } from './ReviewModal';
import { NebulaButton } from './NebulaButton';

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
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
}

const ITEMS_PER_PAGE = 20;

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
  selectedFolderId,
  onSelectFolder
}) => {
  const [viewingCard, setViewingCard] = useState<Card | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset selectedFolderId if the current folder is deleted
  useEffect(() => {
    if (selectedFolderId && !folders.some(f => f.id === selectedFolderId)) {
      onSelectFolder(null);
    }
  }, [folders, selectedFolderId, onSelectFolder]);

  // Filter cards based on library status AND selected folder
  const libraryCards = useMemo(() => {
    let filtered = cards.filter(c => c.status === 'library');
    if (selectedFolderId) {
      filtered = filtered.filter(c => c.folderId === selectedFolderId);
    }
    return filtered;
  }, [cards, selectedFolderId]);

  useEffect(() => {
    if (!isSelectionMode) {
      setSelectedCardIds(new Set());
    }
  }, [isSelectionMode]);

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
  };

  const handleCardClick = useCallback((card: Card) => {
    if (isSelectionMode) {
      setSelectedCardIds(prev => {
        const newSelected = new Set(prev);
        if (newSelected.has(card.id)) {
          newSelected.delete(card.id);
        } else {
          newSelected.add(card.id);
        }
        return newSelected;
      });
    } else {
      setViewingCard(card);
    }
  }, [isSelectionMode]);

  const handleBulkDeleteAction = () => {
    onBulkDelete(Array.from(selectedCardIds));
    setIsSelectionMode(false);
    setSelectedCardIds(new Set());
  };

  const handleExportTxt = () => {
    if (libraryCards.length === 0) return;
    const arabicWords = libraryCards.map(card => {
      // Strip out anything in parentheses (e.g., "(Sayyāra)") and any leftover Latin characters
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

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      if (scrollHeight - scrollTop - clientHeight < 500) {
        if (visibleCount < libraryCards.length) {
          setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, libraryCards.length));
        }
      }
    }
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setIsCreatingFolder(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-transparent relative">
      <div className="px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-0 bg-[#F9F9F9] z-10 sticky top-0 transition-all duration-300">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-3xl font-bold text-black tracking-tight">
            Library
          </h2>
          <div className="flex items-center gap-3">
            {!isSelectionMode && (
              <button
                onClick={onOpenSettings}
                className="p-2 text-gray-400 hover:text-gray-600 active:scale-90 transition-transform"
              >
                <Settings size={22} />
              </button>
            )}

            {libraryCards.length > 0 && (
              <button
                onClick={toggleSelectionMode}
                className="text-[17px] text-[#007AFF] font-normal active:opacity-50 transition-opacity"
              >
                {isSelectionMode ? 'Done' : 'Select'}
              </button>
            )}

            <div className={`flex items-center gap-2 transition-all duration-300 transform ${isSelectionMode ? 'opacity-0 scale-50 w-0' : 'opacity-100 scale-100 w-auto'}`}>
              <button
                onClick={handleExportTxt}
                disabled={isSelectionMode || libraryCards.length === 0}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full p-2 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hidden sm:block"
                title="Export to TXT"
              >
                <Download size={20} strokeWidth={2.5} />
              </button>

              <button
                onClick={onOpenBulk}
                disabled={isSelectionMode}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full p-2 shadow-sm transition-all active:scale-95"
                title="Bulk Add"
              >
                <Layers size={20} strokeWidth={2.5} />
              </button>

              <button
                onClick={onAddCard}
                disabled={isSelectionMode}
                className="bg-[#007AFF] hover:bg-[#006ee6] text-white rounded-full p-2 shadow-sm transition-all active:scale-95"
              >
                <Plus size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Folder Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar -mx-5 px-5">
          <button
            onClick={() => onSelectFolder(null)}
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
              onClick={() => onSelectFolder(folder.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all whitespace-nowrap flex items-center gap-2 ${selectedFolderId === folder.id
                ? 'bg-[#007AFF] text-white pr-1.5'
                : 'bg-white border border-gray-200 text-gray-600'
                }`}
            >
              {folder.name}
              {selectedFolderId === folder.id && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFolder(folder.id);
                  }}
                  className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 active:scale-90 transition-all"
                >
                  <X size={12} strokeWidth={2.5} />
                </span>
              )}
            </button>
          ))}
          <button
            onClick={() => setIsCreatingFolder(true)}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-gray-200 hover:text-gray-600 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Folder Creation Input */}
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
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-grow overflow-y-auto p-4 flex flex-col gap-4 content-start pb-24 min-h-0"
      >
        {libraryCards.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center text-gray-400 py-24">
            <div className="bg-gray-100 p-6 rounded-full mb-4">
              <Plus size={48} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Cards Here</h3>
            <p className="text-center text-gray-500 max-w-xs leading-relaxed text-sm">
              {selectedFolderId
                ? "This folder is empty. Add cards to it!"
                : "Tap the + button to create your first mnemonic flashcard."}
            </p>
            {!selectedFolderId && (
              <div className="mt-8 flex flex-col gap-3">
                <NebulaButton onClick={onAddCard} size="sm">Create Card</NebulaButton>
                <button onClick={onOpenBulk} className="text-blue-500 text-sm font-medium hover:underline">Or Bulk Import</button>
              </div>
            )}
          </div>
        ) : (
          <>
            {libraryCards.slice(0, visibleCount).map(card => (
              <CardListItem
                key={card.id}
                card={card}
                variant="library"
                onClick={handleCardClick}
                onAction={onActivateCard}
                isSelectionMode={isSelectionMode}
                isSelected={selectedCardIds.has(card.id)}
              />
            ))}
            {visibleCount < libraryCards.length && (
              <div className="h-10 flex items-center justify-center opacity-50">
                Loading...
              </div>
            )}
          </>
        )}
      </div>

      <div
        className={`absolute bottom-0 left-0 right-0 bg-[#F9F9F9] border-t border-gray-300 p-4 pb-8 z-30 transition-transform duration-300 ease-in-out ${isSelectionMode ? 'translate-y-0' : 'translate-y-full'
          }`}
      >
        <div className="flex justify-between items-center max-w-md mx-auto">
          <span className="text-gray-500 text-[15px] font-medium">
            {selectedCardIds.size} selected
          </span>
          <button
            onClick={handleBulkDeleteAction}
            disabled={selectedCardIds.size === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${selectedCardIds.size > 0
              ? 'text-red-500 hover:bg-red-50'
              : 'text-gray-300 cursor-not-allowed'
              }`}
          >
            <Trash2 size={20} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {viewingCard && (
        <ReviewModal
          card={viewingCard}
          onClose={() => setViewingCard(null)}
          onDelete={onDeleteCard}
        />
      )}
    </div>
  );
};
