import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CreateModal } from './components/CreateModal';
import { BulkCreateModal } from './components/BulkCreateModal';
import { SettingsModal } from './components/SettingsModal';
import { SimpleSplash } from './components/SimpleSplash';
import { IOSBackground } from './components/IOSBackground';
import { MoveCardModal } from './components/MoveCardModal';
import { FolderReviewModal } from './components/FolderReviewModal';
import { Card, Folder, SRS_INTERVALS } from './types';
import { Compass, Clock3, Plus, User, Volume2, CheckCircle2, Folder as FolderIcon, PlayCircle, Settings, Download, Trash2, Pencil, Move, PlusCircle } from 'lucide-react';
import { get, set } from 'idb-keyval';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_TEXT_MODEL, DEFAULT_IMAGE_MODEL } from './constants';
import { playCardAudio } from './utils/audio';

interface AppSettings {
  selectedVoiceURI: string;
  textModel: string;
  imageModel: string;
}

type UITab = 'library' | 'active' | 'profile';
type QueueItem = { type: 'card' | 'folder'; id: string };

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

  const [uiTab, setUiTab] = useState<UITab>('library');
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [storyFolderIndex, setStoryFolderIndex] = useState(0);
  const [storyCardIndex, setStoryCardIndex] = useState(0);
  const [expandedStoryCardId, setExpandedStoryCardId] = useState<string | null>(null);
  const [actionSheetCard, setActionSheetCard] = useState<Card | null>(null);
  const [movingCard, setMovingCard] = useState<Card | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [trainingQueue, setTrainingQueue] = useState<QueueItem[]>([]);
  const [reviewingFolder, setReviewingFolder] = useState<Folder | null>(null);

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartXRef = useRef<number | null>(null);

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
    if (window.confirm("Delete this folder and all cards inside it? This cannot be undone.")) {
        setFolders(prev => prev.filter(f => f.id !== folderId));
        setCards(prev => prev.filter(c => c.folderId !== folderId));
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
  const dueCount = cards.filter(c => c.status === 'active' && c.nextReviewTime <= Date.now()).length + folders.filter(f => f.status === 'active' && (f.nextReviewTime || 0) <= Date.now()).length;

  const libraryCards = useMemo(() => cards.filter(c => c.status === 'library'), [cards]);

  const storyFolders = useMemo(() => {
    const grouped = folders.map(folder => ({
      id: folder.id,
      name: folder.name,
      cards: libraryCards.filter(c => c.folderId === folder.id)
    })).filter(item => item.cards.length > 0);

    return [
      { id: 'all', name: 'Tümü', cards: libraryCards },
      ...grouped
    ];
  }, [folders, libraryCards]);

  const activeStoryFolder = storyFolders[Math.min(storyFolderIndex, Math.max(storyFolders.length - 1, 0))];
  const activeStoryCard = activeStoryFolder?.cards[Math.min(storyCardIndex, Math.max((activeStoryFolder?.cards.length || 1) - 1, 0))];

  useEffect(() => {
    if (storyFolderIndex > storyFolders.length - 1) {
      setStoryFolderIndex(0);
      setStoryCardIndex(0);
    }
  }, [storyFolderIndex, storyFolders.length]);

  useEffect(() => {
    setUiTab(activeTab);
  }, [activeTab]);

  const dueQueueItems = useMemo<QueueItem[]>(() => {
    const now = Date.now();
    const dueFolders = folders
      .filter(f => f.status === 'active' && (f.nextReviewTime || 0) <= now)
      .sort((a, b) => (a.nextReviewTime || 0) - (b.nextReviewTime || 0))
      .map(f => ({ type: 'folder' as const, id: f.id }));

    const dueCards = cards
      .filter(c => c.status === 'active' && c.nextReviewTime <= now)
      .sort((a, b) => a.nextReviewTime - b.nextReviewTime)
      .map(c => ({ type: 'card' as const, id: c.id }));

    return [...dueFolders, ...dueCards];
  }, [cards, folders]);

  useEffect(() => {
    if (uiTab !== 'active') return;
    setTrainingQueue(dueQueueItems);
  }, [dueQueueItems, uiTab]);

  const queueCurrent = trainingQueue[0];
  const queueCard = queueCurrent?.type === 'card' ? cards.find(c => c.id === queueCurrent.id) || null : null;
  const queueFolder = queueCurrent?.type === 'folder' ? folders.find(f => f.id === queueCurrent.id) || null : null;

  const goToNextStoryCard = () => {
    if (!activeStoryFolder || activeStoryFolder.cards.length === 0) return;
    setExpandedStoryCardId(null);
    setStoryCardIndex(prev => Math.min(prev + 1, activeStoryFolder.cards.length - 1));
  };

  const goToPreviousStoryCard = () => {
    if (!activeStoryFolder || activeStoryFolder.cards.length === 0) return;
    setExpandedStoryCardId(null);
    setStoryCardIndex(prev => Math.max(prev - 1, 0));
  };

  const moveStoryFolder = (direction: 1 | -1) => {
    if (storyFolders.length <= 1) return;
    setExpandedStoryCardId(null);
    setStoryFolderIndex(prev => {
      const next = prev + direction;
      if (next < 0 || next >= storyFolders.length) return prev;
      return next;
    });
    setStoryCardIndex(0);
  };

  const handleStoryTouchStart = (clientX: number) => {
    touchStartXRef.current = clientX;
  };

  const handleStoryTouchEnd = (clientX: number) => {
    if (touchStartXRef.current === null) return;
    const delta = clientX - touchStartXRef.current;
    if (delta > 50) moveStoryFolder(-1);
    if (delta < -50) moveStoryFolder(1);
    touchStartXRef.current = null;
  };

  const triggerLongPress = () => {
    if (!activeStoryCard) return;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setActionSheetCard(activeStoryCard);
    }, 450);
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleExportTxt = () => {
    const cardsToExport = cards.filter(c => c.status === 'library');
    if (cardsToExport.length === 0) return;

    const arabicWords = cardsToExport
      .map(card => {
        const cleanWord = card.arabicWord.replace(/\s*\(.*?\)\s*/g, '');
        return cleanWord.replace(/[a-zA-Zā-žĀ-Ž0-9]/g, '').trim();
      })
      .filter(Boolean)
      .join('\n');

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

  const handleTrainingRepeat = () => {
    setTrainingQueue(prev => (prev.length > 1 ? [...prev.slice(1), prev[0]] : prev));
  };

  const handleTrainingKnow = () => {
    if (!queueCurrent) return;

    if (queueCurrent.type === 'card' && queueCard) {
      const nextIndex = Math.min(queueCard.intervalIndex + 1, SRS_INTERVALS.length - 1);
      handleUpdateCard({ ...queueCard, intervalIndex: nextIndex, nextReviewTime: Date.now() + SRS_INTERVALS[nextIndex] });
      setTrainingQueue(prev => prev.slice(1));
      return;
    }

    if (queueCurrent.type === 'folder' && queueFolder) {
      setReviewingFolder(queueFolder);
    }
  };

  const createFolderFromProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    handleCreateFolder(trimmed);
    setNewFolderName('');
  };

  return (
    <>
      {showSplash && <SimpleSplash onFinish={() => setShowSplash(false)} />}
      <IOSBackground />

      <div className="h-full w-full overflow-hidden relative text-white">
        <div className="absolute inset-0 pb-[calc(90px+env(safe-area-inset-bottom))]">
          {uiTab === 'library' && (
            <div
              className="relative h-full w-full bg-black"
              onTouchStart={(e) => {
                handleStoryTouchStart(e.touches[0].clientX);
                triggerLongPress();
              }}
              onTouchEnd={(e) => {
                handleStoryTouchEnd(e.changedTouches[0].clientX);
                clearLongPress();
              }}
              onMouseDown={triggerLongPress}
              onMouseUp={clearLongPress}
              onMouseLeave={clearLongPress}
            >
              {activeStoryCard ? (
                <>
                  <img
                    key={activeStoryCard.id}
                    src={activeStoryCard.imageUrl}
                    alt={activeStoryCard.arabicWord}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />

                  <div className="absolute top-0 left-0 right-0 pt-[calc(env(safe-area-inset-top)+12px)] px-4 z-20">
                    <div className="flex gap-1.5 mb-3">
                      {activeStoryFolder.cards.map((card, index) => (
                        <div key={card.id} className="h-1 flex-1 rounded-full bg-white/30 overflow-hidden">
                          <div
                            className={`h-full bg-white transition-all duration-300 ${index <= storyCardIndex ? 'w-full' : 'w-0'}`}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-center relative">
                      <h2 className="text-sm font-semibold tracking-wide">{activeStoryFolder.name}</h2>
                      <button
                        onClick={() => playCardAudio(null, activeStoryCard.arabicWord, settings.selectedVoiceURI)}
                        className="absolute right-0 p-2 rounded-full bg-black/40 backdrop-blur"
                      >
                        <Volume2 size={18} />
                      </button>
                    </div>
                  </div>

                  <button onClick={goToPreviousStoryCard} className="absolute left-0 top-0 bottom-0 w-1/2 z-10" aria-label="Önceki kart" />
                  <button onClick={goToNextStoryCard} className="absolute right-0 top-0 bottom-0 w-1/2 z-10" aria-label="Sonraki kart" />

                  <div className="absolute bottom-0 left-0 right-0 px-5 pb-[calc(20px+env(safe-area-inset-bottom)+70px)] z-20">
                    <h3 className="font-amiri text-[32px] leading-tight">{activeStoryCard.arabicWord}</h3>
                    <p className="text-lg font-semibold text-white/90">{activeStoryCard.turkishMeaning}</p>
                    <p className={`mt-2 text-white/90 text-sm leading-relaxed ${expandedStoryCardId === activeStoryCard.id ? '' : 'line-clamp-2'}`}>
                      <span className="font-semibold">{activeStoryCard.keyword}</span> — {activeStoryCard.story}
                    </p>
                    {expandedStoryCardId !== activeStoryCard.id && (
                      <button className="text-xs text-white/80 mt-1" onClick={() => setExpandedStoryCardId(activeStoryCard.id)}>
                        ...daha fazla
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-white/80">Keşfette kart yok.</div>
              )}
            </div>
          )}

          {uiTab === 'active' && (
            <div className="relative h-full bg-black overflow-hidden">
              {queueCurrent ? (
                <>
                  {queueCard && (
                    <>
                      <img src={queueCard.imageUrl} alt={queueCard.arabicWord} className="absolute inset-0 h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />
                      <div className="absolute top-0 left-0 right-0 pt-[calc(env(safe-area-inset-top)+20px)] px-4 flex justify-end">
                        <button
                          onClick={() => playCardAudio(null, queueCard.arabicWord, settings.selectedVoiceURI)}
                          className="p-2 rounded-full bg-black/40 backdrop-blur"
                        >
                          <Volume2 size={18} />
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 px-5 pb-[calc(24px+env(safe-area-inset-bottom)+70px)]">
                        <h3 className="font-amiri text-[32px] leading-tight">{queueCard.arabicWord}</h3>
                        <p className="text-lg font-semibold text-white/90">{queueCard.turkishMeaning}</p>
                        <p className="mt-2 text-sm text-white/90"><span className="font-semibold">{queueCard.keyword}</span> — {queueCard.story}</p>
                      </div>
                    </>
                  )}

                  {queueFolder && (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 px-6">
                      <div className="text-center">
                        <FolderIcon size={44} className="mx-auto mb-4" />
                        <p className="text-xs uppercase text-white/70 tracking-[0.2em]">Aktif Klasör</p>
                        <h3 className="text-3xl font-bold mt-1">{queueFolder.name}</h3>
                        <p className="text-white/80 mt-3">Biliyorum ile klasör tekrarını başlat.</p>
                      </div>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 px-4 pb-[calc(20px+env(safe-area-inset-bottom)+70px)] flex gap-3">
                    <button onClick={handleTrainingRepeat} className="flex-1 py-3 rounded-2xl bg-gray-600/80 backdrop-blur font-semibold">↩ Tekrar</button>
                    <button onClick={handleTrainingKnow} className="flex-1 py-3 rounded-2xl bg-green-600/90 backdrop-blur font-semibold">✓ Biliyorum</button>
                  </div>
                </>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-center px-6">
                  <CheckCircle2 size={56} className="text-green-400 mb-4" />
                  <p className="text-2xl font-semibold">Tüm kartlar tamam ✓</p>
                </div>
              )}
            </div>
          )}

          {uiTab === 'profile' && (
            <div className="h-full overflow-y-auto px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(100px+env(safe-area-inset-bottom))] text-gray-900">
              <h1 className="text-3xl font-bold text-white mb-5">Profil</h1>

              <section className="bg-white/85 backdrop-blur rounded-2xl p-4 mb-4">
                <h2 className="font-semibold mb-3">İstatistikler</h2>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-2xl font-bold">{cards.length}</p><p className="text-xs text-gray-600">Toplam Kart</p></div>
                  <div><p className="text-2xl font-bold">{cards.filter(c => c.status === 'active').length}</p><p className="text-xs text-gray-600">Aktif Kart</p></div>
                  <div><p className="text-2xl font-bold">{folders.length}</p><p className="text-xs text-gray-600">Klasör</p></div>
                </div>
              </section>

              <section className="bg-white/85 backdrop-blur rounded-2xl p-4 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-semibold">Klasörler</h2>
                  <PlusCircle size={18} className="text-blue-600" />
                </div>
                <form onSubmit={createFolderFromProfile} className="flex gap-2 mb-3">
                  <input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Yeni Klasör" className="flex-1 border rounded-xl px-3 py-2 text-sm" />
                  <button className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm">Yeni Klasör</button>
                </form>
                <div className="space-y-2">
                  {folders.map(folder => {
                    const count = cards.filter(c => c.folderId === folder.id).length;
                    return (
                      <div key={folder.id} className="border rounded-xl px-3 py-2 bg-white flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{folder.name}</p>
                          <p className="text-xs text-gray-500">{count} kart</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleActivateFolder(folder.id)} className="p-2 rounded-lg bg-green-100 text-green-700"><PlayCircle size={16} /></button>
                          <button onClick={() => handleDeleteFolder(folder.id)} className="p-2 rounded-lg bg-red-100 text-red-700"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="bg-white/85 backdrop-blur rounded-2xl p-4">
                <h2 className="font-semibold mb-3">Araçlar</h2>
                <div className="space-y-2">
                  <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center gap-2 rounded-xl border px-3 py-3 bg-white text-left"><Settings size={16} /> Ayarlar</button>
                  <button onClick={handleExportTxt} className="w-full flex items-center gap-2 rounded-xl border px-3 py-3 bg-white text-left"><Download size={16} /> Kelimeleri Dışa Aktar</button>
                </div>
              </section>
            </div>
          )}
        </div>

        <nav className="fixed left-0 right-0 bottom-0 z-30 px-4 pt-2 pb-[calc(10px+env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-md bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl shadow-xl h-16 flex items-center justify-around text-gray-500">
            <button onClick={() => { setActiveTab('library'); setUiTab('library'); }} className={`flex flex-col items-center text-[10px] ${uiTab === 'library' ? 'text-blue-600' : ''}`}>
              <Compass size={20} />
              Keşfet
            </button>
            <button onClick={() => { setActiveTab('active'); setUiTab('active'); }} className={`relative flex flex-col items-center text-[10px] ${uiTab === 'active' ? 'text-blue-600' : ''}`}>
              <Clock3 size={20} />
              Antrenman
              {dueCount > 0 && <span className="absolute -top-1 right-0 h-2.5 w-2.5 rounded-full bg-red-500" />}
            </button>
            <button onClick={() => setIsQuickCreateOpen(true)} className="-mt-8 w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 border-4 border-white/90">
              <Plus size={26} />
            </button>
            <button onClick={() => setUiTab('profile')} className={`flex flex-col items-center text-[10px] ${uiTab === 'profile' ? 'text-blue-600' : ''}`}>
              <User size={20} />
              Profil
            </button>
          </div>
        </nav>

        {isQuickCreateOpen && (
          <div className="fixed inset-0 z-40">
            <button className="absolute inset-0 bg-black/40" onClick={() => setIsQuickCreateOpen(false)} />
            <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white p-5 pb-[calc(20px+env(safe-area-inset-bottom))] text-gray-900">
              <h3 className="font-semibold mb-4">Oluştur</h3>
              <div className="space-y-2">
                <button onClick={() => { setCardToEdit(null); setIsModalOpen(true); setIsQuickCreateOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl bg-gray-100">Tek Kart Oluştur</button>
                <button onClick={() => { setIsBulkModalOpen(true); setIsQuickCreateOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl bg-gray-100">Toplu Oluştur</button>
              </div>
            </div>
          </div>
        )}

        {actionSheetCard && (
          <div className="fixed inset-0 z-40">
            <button className="absolute inset-0 bg-black/40" onClick={() => setActionSheetCard(null)} />
            <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white p-4 pb-[calc(16px+env(safe-area-inset-bottom))] text-gray-900">
              <button onClick={() => { handleEditCard(actionSheetCard); setActionSheetCard(null); }} className="w-full py-3 text-left">Düzenle</button>
              <button onClick={() => { if (window.confirm('Kart silinsin mi?')) handleDeleteCard(actionSheetCard.id); setActionSheetCard(null); }} className="w-full py-3 text-left">Sil</button>
              <button onClick={() => { setMovingCard(actionSheetCard); setActionSheetCard(null); }} className="w-full py-3 text-left">Taşı</button>
              <button onClick={() => { handleActivateCard(actionSheetCard); setActionSheetCard(null); }} className="w-full py-3 text-left">Aktif Kuyruğa Ekle</button>
            </div>
          </div>
        )}

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

        <MoveCardModal
          isOpen={!!movingCard}
          onClose={() => setMovingCard(null)}
          onMove={(newFolderId) => {
            if (movingCard) handleMoveCard(movingCard, newFolderId);
          }}
          folders={folders}
          currentFolderId={movingCard?.folderId}
        />

        {reviewingFolder && (
          <FolderReviewModal
            folder={reviewingFolder}
            cards={cards.filter(c => c.folderId === reviewingFolder.id)}
            onClose={() => {
              setTrainingQueue(prev => prev.slice(1));
              setReviewingFolder(null);
            }}
            onUpdateFolder={handleUpdateFolder}
          />
        )}
      </div>
    </>
  );
}
