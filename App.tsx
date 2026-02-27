
import React, { useState, useEffect, useCallback } from 'react';
import { LibraryPanel } from './components/LibraryPanel';
import { ActivePanel } from './components/ActivePanel';
import { CreateModal } from './components/CreateModal';
import { BulkCreateModal } from './components/BulkCreateModal';
import { SettingsModal } from './components/SettingsModal';
import { SimpleSplash } from './components/SimpleSplash';
import { IOSBackground } from './components/IOSBackground';
import { Card, Folder, SRS_INTERVALS } from './types';
import { BookOpen, Clock } from 'lucide-react';
import { get, set } from 'idb-keyval';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_TEXT_MODEL, DEFAULT_IMAGE_MODEL } from './constants';

interface AppSettings {
  selectedVoiceURI: string;
  textModel: string;
  imageModel: string;
}

export default function App() {
  // Initialize with empty array, data will be loaded async
  const [cards, setCards] = useState<Card[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  
  // Track selected folder in library (lifted state) - kept for CreateModal but mostly null now
  const [currentLibraryFolderId, setCurrentLibraryFolderId] = useState<string | null>(null);
  
  // View Modes (Persisted) - Only activeViewMode needed now
  const [activeViewMode, setActiveViewMode] = useState<'folders' | 'list'>(() => 
    (localStorage.getItem('active-view-mode') as 'folders' | 'list') || 'folders'
  );

  useEffect(() => {
    localStorage.setItem('active-view-mode', activeViewMode);
  }, [activeViewMode]);

  // Settings state
  const [settings, setSettings] = useState<AppSettings>({ 
    selectedVoiceURI: '',
    textModel: DEFAULT_TEXT_MODEL,
    imageModel: DEFAULT_IMAGE_MODEL
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'library' | 'active'>('library');
  const [showSplash, setShowSplash] = useState(true);
  
  // Track if initial load is complete to prevent overwriting DB with empty state
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // New state for editing
  const [cardToEdit, setCardToEdit] = useState<Card | null>(null);

  // Load Data Effect
  useEffect(() => {
    const loadData = async () => {
      try {
        let loadedCards = await get<Card[]>('arabic-mnemonic-cards');
        if (!loadedCards) {
          try {
            const localCards = localStorage.getItem('arabic-mnemonic-cards');
            if (localCards) {
              loadedCards = JSON.parse(localCards);
              if (loadedCards) await set('arabic-mnemonic-cards', loadedCards);
            }
          } catch (e) {
            console.error("Migration error (Cards):", e);
          }
        }
        if (loadedCards) setCards(loadedCards);

        let loadedFolders = await get<Folder[]>('arabic-mnemonic-folders');
        if (loadedFolders) setFolders(loadedFolders);

        let loadedSettings = await get('arabic-mnemonic-settings');
        if (!loadedSettings) {
           try {
             const localSettings = localStorage.getItem('arabic-mnemonic-settings');
             if (localSettings) {
               loadedSettings = JSON.parse(localSettings);
               if (loadedSettings) await set('arabic-mnemonic-settings', loadedSettings);
             }
           } catch (e) {
             console.error("Migration error (Settings):", e);
           }
        }
        if (loadedSettings) {
           setSettings(prev => ({ ...prev, ...loadedSettings }));
        }
      } catch (err) {
        console.error("Critical error loading data:", err);
      } finally {
        setIsDataLoaded(true);
      }
    };
    loadData();
  }, []);

  // Save Effects
  useEffect(() => {
    if (!isDataLoaded) return;
    const timeoutId = setTimeout(() => {
      set('arabic-mnemonic-cards', cards).catch(err => console.error("Failed to save cards to IDB:", err));
    }, 1000); 
    return () => clearTimeout(timeoutId);
  }, [cards, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return;
    set('arabic-mnemonic-folders', folders).catch(err => console.error("Failed to save folders to IDB:", err));
  }, [folders, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return;
    set('arabic-mnemonic-settings', settings).catch(err => console.error("Failed to save settings to IDB:", err));
    localStorage.setItem('arabic-mnemonic-settings', JSON.stringify(settings));
  }, [settings, isDataLoaded]);

  useEffect(() => {
    if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
    }
  }, []);

  const handleSaveCard = useCallback((newCard: Card) => {
    setCards(prev => {
        const exists = prev.some(c => c.id === newCard.id);
        if (exists) {
            return prev.map(c => c.id === newCard.id ? newCard : c);
        }
        return [newCard, ...prev];
    });
    setActiveTab('library');
  }, []);

  const handleCreateFolder = useCallback((name: string) => {
    const newFolder: Folder = { id: uuidv4(), name, createdAt: Date.now() };
    setFolders(prev => [...prev, newFolder]);
  }, []);

  const handleDeleteFolder = useCallback((folderId: string) => {
    if (window.confirm("Delete this folder? Cards inside will remain but become uncategorized.")) {
        setFolders(prev => prev.filter(f => f.id !== folderId));
        if (currentLibraryFolderId === folderId) {
            setCurrentLibraryFolderId(null);
        }
    }
  }, [currentLibraryFolderId]);

  const handleActivateFolder = useCallback((folderId: string) => {
    setFolders(prev => prev.map(f => {
        if (f.id === folderId) {
            return {
                ...f,
                status: 'active',
                intervalIndex: 0,
                nextReviewTime: Date.now() + SRS_INTERVALS[0]
            };
        }
        return f;
    }));
    setActiveTab('active');
  }, []);

  const handleUpdateFolder = useCallback((updatedFolder: Folder) => {
    setFolders(prev => prev.map(f => f.id === updatedFolder.id ? updatedFolder : f));
  }, []);

  const handleDeactivateFolder = useCallback((folderId: string) => {
    setFolders(prev => prev.map(f => {
        if (f.id === folderId) {
            const { status, intervalIndex, nextReviewTime, ...rest } = f;
            return rest as Folder;
        }
        return f;
    }));
  }, []);

  const handleActivateCard = useCallback((card: Card) => {
    setCards(prev => prev.map(c => {
      if (c.id === card.id) {
        return {
          ...c,
          status: 'active' as const,
          intervalIndex: 0,
          nextReviewTime: Date.now() + SRS_INTERVALS[0]
        };
      }
      return c;
    }));
    setActiveTab('active');
  }, []);

  const handleDeactivateCard = useCallback((cardId: string) => {
    setCards(prev => prev.map(c => {
      if (c.id === cardId) {
        return { ...c, status: 'library' };
      }
      return c;
    }));
  }, []);

  const handleUpdateCard = useCallback((updatedCard: Card) => {
    setCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
  }, []);

  const handleMoveCard = useCallback((card: Card, newFolderId: string | undefined) => {
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, folderId: newFolderId } : c));
  }, []);

  const handleDeleteCard = useCallback((cardId: string) => {
    setCards(prev => prev.filter(c => c.id !== cardId));
  }, []);

  const handleBulkDelete = useCallback((cardIds: string[]) => {
    if (cardIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${cardIds.length} cards?`)) {
      setCards(prev => prev.filter(c => !cardIds.includes(c.id)));
    }
  }, []);

  const handleEditCard = useCallback((card: Card) => {
      setCardToEdit(card);
      setIsModalOpen(true);
  }, []);

  const handleCloseModal = () => {
      setIsModalOpen(false);
      setCardToEdit(null); 
  }

  const activeCount = cards.filter(c => c.status === 'active').length + folders.filter(f => f.status === 'active').length;

  return (
    <>
      {showSplash && <SimpleSplash onFinish={() => setShowSplash(false)} />}
      <IOSBackground />

      <div className="flex flex-col h-full w-full overflow-hidden relative text-gray-900">
        <div className="flex-grow overflow-hidden relative">
          {activeTab === 'library' && (
            <LibraryPanel 
              cards={cards}
              folders={folders}
              onAddCard={() => { setCardToEdit(null); setIsModalOpen(true); }}
              onOpenBulk={() => setIsBulkModalOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onActivateCard={handleActivateCard}
              onDeleteCard={handleDeleteCard}
              onBulkDelete={handleBulkDelete}
              onCreateFolder={handleCreateFolder}
              onDeleteFolder={handleDeleteFolder}
              // selectedFolderId and onSelectFolder are mostly unused in tree view but needed if we want to add selection logic later
              selectedFolderId={currentLibraryFolderId}
              onSelectFolder={setCurrentLibraryFolderId}
              onEditCard={handleEditCard}
              onActivateFolder={handleActivateFolder}
              onMoveCard={handleMoveCard}
            />
          )}
          {activeTab === 'active' && (
            <ActivePanel 
              cards={cards}
              folders={folders}
              onUpdateCard={handleUpdateCard}
              onDeleteCard={handleDeleteCard}
              onDeactivateCard={handleDeactivateCard}
              // Active panel logic simplified to one view
              onUpdateFolder={handleUpdateFolder}
              onDeactivateFolder={handleDeactivateFolder}
            />
          )}
        </div>

        <nav className="bg-[#F9F9F9] border-t border-gray-200 pb-[calc(16px+env(safe-area-inset-bottom))] pt-2 flex-none flex items-stretch z-20 shadow-[0_-1px_0_rgba(0,0,0,0.05)] h-auto min-h-[80px]">
          <button 
            onClick={() => setActiveTab('library')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors duration-200 py-1 ${
              activeTab === 'library' ? 'text-[#007AFF]' : 'text-gray-400'
            }`}
          >
            <BookOpen size={24} strokeWidth={activeTab === 'library' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Library</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('active')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors duration-200 relative py-1 ${
              activeTab === 'active' ? 'text-[#007AFF]' : 'text-gray-400'
            }`}
          >
            <div className="relative">
              <Clock size={24} strokeWidth={activeTab === 'active' ? 2.5 : 2} />
              {activeCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-[#F9F9F9]" />
              )}
            </div>
            <span className="text-[10px] font-medium">Active Queue</span>
          </button>
        </nav>

        <CreateModal 
          isOpen={isModalOpen} 
          onClose={handleCloseModal}
          onSave={handleSaveCard}
          selectedVoiceURI={settings.selectedVoiceURI}
          folders={folders}
          textModel={settings.textModel}
          imageModel={settings.imageModel}
          initialFolderId={currentLibraryFolderId || ''}
          editCard={cardToEdit}
        />

        <BulkCreateModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          onSave={handleSaveCard}
          folders={folders}
          textModel={settings.textModel}
          imageModel={settings.imageModel}
          initialFolderId={currentLibraryFolderId || ''}
        />

        {isSettingsOpen && (
          <SettingsModal 
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            selectedVoiceURI={settings.selectedVoiceURI}
            onVoiceSelect={(uri) => setSettings(prev => ({ ...prev, selectedVoiceURI: uri }))}
            textModel={settings.textModel}
            imageModel={settings.imageModel}
            onTextModelSelect={(id) => setSettings(prev => ({ ...prev, textModel: id }))}
            onImageModelSelect={(id) => setSettings(prev => ({ ...prev, imageModel: id }))}
          />
        )}
      </div>
    </>
  );
}
