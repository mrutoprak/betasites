
import React, { useState, useEffect } from 'react';
import { X, Sparkles, Copy, Image as ImageIcon, Loader2, Volume2, Wand2, Check, Folder as FolderIcon, RefreshCw } from 'lucide-react';
import { generateMnemonicData, generateImage, generateCreativePrompt } from '../services/geminiService';
import { Card, Folder } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { playCardAudio } from '../utils/audio';
import { NebulaButton } from './NebulaButton';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (card: Card) => void;
  selectedVoiceURI?: string;
  folders?: Folder[];
  textModel: string;
  imageModel: string;
  initialFolderId?: string;
}

export const CreateModal: React.FC<CreateModalProps> = ({
  isOpen,
  onClose,
  onSave,
  selectedVoiceURI,
  folders = [],
  textModel,
  imageModel,
  initialFolderId = ''
}) => {
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [inputWord, setInputWord] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const loadingMessages = [
    "Consulting the linguist...",
    "Analyzing Arabic phonetics...",
    "Finding the perfect sound-alike...",
    "Crafting a surreal story..."
  ];

  const [turkishMeaning, setTurkishMeaning] = useState('');
  const [arabicWord, setArabicWord] = useState('');
  const [keyword, setKeyword] = useState('');
  const [story, setStory] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>(initialFolderId);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  useEffect(() => {
    if (step !== 'preview') return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onloadend = () => setImageUrl(reader.result as string);
            reader.readAsDataURL(blob);
          }
          return;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [step]);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      setLoadingMsgIndex(0);
      interval = setInterval(() => {
        setLoadingMsgIndex(prev => (prev + 1) % loadingMessages.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Sync selected folder with prop when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedFolderId(initialFolderId);
    }
  }, [isOpen, initialFolderId]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!inputWord.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await generateMnemonicData(inputWord, textModel);
      setTurkishMeaning(data.turkishMeaning);
      setArabicWord(data.arabicWord);
      setKeyword(data.keyword);
      setStory(data.story);
      setImagePrompt(data.imagePrompt);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || "Failed to generate content. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!story.trim()) return;
    setIsGeneratingImage(true);
    try {
      let promptToUse = imagePrompt;
      // 1. If no prompt exists, generate it first in the background
      if (!promptToUse.trim()) {
        try {
          promptToUse = await generateCreativePrompt(story, keyword, turkishMeaning, textModel);
          setImagePrompt(promptToUse);
        } catch (e) {
          console.error("Prompt gen error", e);
          promptToUse = story; // Fallback
        }
      }

      // 2. Generate Image
      const base64Image = await generateImage(promptToUse, imageModel);
      setImageUrl(base64Image);
    } catch (err: any) {
      alert("Failed to generate image. Please check your connection.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSave = () => {
    const newCard: Card = {
      id: uuidv4(),
      folderId: selectedFolderId || undefined,
      turkishMeaning,
      arabicWord,
      keyword,
      story,
      imagePrompt,
      imageUrl: imageUrl || undefined,
      status: 'library',
      intervalIndex: 0,
      nextReviewTime: 0
    };
    onSave(newCard);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setStep('input');
    setInputWord('');
    setTurkishMeaning('');
    setArabicWord('');
    setKeyword('');
    setStory('');
    setImagePrompt('');
    setImageUrl('');
    setSelectedFolderId(initialFolderId); // Reset to initial
    setError(null);
    setShowSavedFeedback(false);
    setIsGeneratingImage(false);
  };

  const handleTestAudio = () => playCardAudio(null, arabicWord, selectedVoiceURI);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Performance Fix: Replaced backdrop-blur with simple opacity */}
      <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={onClose} />
      <div className="relative bg-[#F2F2F7] w-full max-w-lg rounded-[20px] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <button onClick={() => { resetForm(); onClose(); }} className="text-[#007AFF] text-[17px] active:opacity-50 transition-opacity">Cancel</button>
          <h2 className="text-[17px] font-semibold text-black absolute left-1/2 -translate-x-1/2">{step === 'input' ? 'New Card' : 'Edit Card'}</h2>
          <div className="w-[50px]"></div>
        </div>
        <div className="overflow-y-auto p-4 [&::-webkit-scrollbar]:hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping"></div>
                <div className="relative bg-white p-4 rounded-full shadow-lg">
                  <Loader2 className="w-8 h-8 text-[#007AFF] animate-spin" />
                </div>
              </div>
              <p className="text-[17px] font-semibold text-gray-900 mb-2">Creating...</p>
              <p className="text-[15px] text-gray-500 text-center h-6 animate-pulse px-4">{loadingMessages[loadingMsgIndex]}</p>
            </div>
          ) : step === 'input' ? (
            <div className="flex flex-col gap-6">
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200/50">
                <div className="p-4 flex items-center gap-3">
                  <span className="text-[17px] text-gray-900 w-16 font-normal">Word</span>
                  <input type="text" value={inputWord} onChange={(e) => setInputWord(e.target.value)} placeholder="Turkish or Arabic..." className="flex-1 text-[17px] text-gray-900 outline-none bg-transparent" onKeyDown={(e) => e.key === 'Enter' && handleGenerate()} autoFocus />
                  {inputWord.length > 0 && <button onClick={() => setInputWord('')} className="text-gray-400"><X size={18} /></button>}
                </div>
                {/* Folder Selection for Input Phase (Optional, but useful) */}
                {folders.length > 0 && (
                  <div className="px-4 pb-3 flex items-center gap-3 border-t border-gray-100 pt-3">
                    <FolderIcon size={18} className="text-gray-400" />
                    <select
                      value={selectedFolderId}
                      onChange={(e) => setSelectedFolderId(e.target.value)}
                      className="bg-transparent text-[15px] text-gray-600 outline-none w-full"
                    >
                      <option value="">No Folder (General)</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center border border-red-100">{error}</div>}
              <div className="space-y-3">
                <button onClick={handleGenerate} disabled={!inputWord.trim()} className={`w-full py-3.5 rounded-xl font-semibold text-[17px] text-white transition-all active:scale-[0.98] ${!inputWord.trim() ? 'bg-gray-300' : 'bg-[#007AFF] shadow-sm'}`}>Generate</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Folder Selection for Preview Phase */}
              {folders.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden px-3 h-11 flex items-center">
                  <label className="w-20 text-[15px] text-gray-500 shrink-0 flex items-center gap-2"><FolderIcon size={14} /> Folder</label>
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="flex-1 text-[15px] outline-none bg-transparent"
                  >
                    <option value="">General</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden divide-y divide-gray-100/80">
                <div className="flex items-center h-11 px-3">
                  <label className="w-20 text-[15px] text-gray-500 shrink-0">Meaning</label>
                  <input type="text" value={turkishMeaning} onChange={e => setTurkishMeaning(e.target.value)} className="flex-1 text-[16px] outline-none bg-transparent" />
                </div>
                <div className="flex items-center h-11 px-3">
                  <label className="w-20 text-[15px] text-gray-500 shrink-0">Arabic</label>
                  <div className="flex-1 flex gap-2 items-center">
                    <input type="text" value={arabicWord} onChange={e => setArabicWord(e.target.value)} className="flex-1 text-[20px] font-amiri outline-none bg-transparent text-left" dir="rtl" />
                    <div className="w-px h-4 bg-gray-200 mx-1"></div>
                    <button onClick={handleTestAudio} className="text-[#007AFF] hover:bg-blue-50 p-1.5 rounded-full active:scale-90 active:bg-blue-100 transition-all">
                      <Volume2 size={18} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden divide-y divide-gray-100/80">
                <div className="flex items-center h-11 px-3">
                  <label className="w-20 text-[15px] text-gray-500 shrink-0">Keyword</label>
                  <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)} className="flex-1 text-[16px] font-medium outline-none bg-transparent" />
                </div>
                <div className="p-3">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Story</label>
                  <textarea value={story} onChange={e => setStory(e.target.value)} className="w-full text-[15px] outline-none bg-transparent resize-none min-h-[60px]" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden p-1">
                <div className="relative w-full h-48 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 flex flex-col items-center justify-center text-center">
                  {isGeneratingImage ? (
                    <div className="flex flex-col items-center justify-center text-[#007AFF]">
                      <Loader2 className="animate-spin mb-2" size={32} />
                      <span className="text-[13px] font-medium animate-pulse">Painting your story...</span>
                    </div>
                  ) : imageUrl ? (
                    <>
                      <img src={imageUrl} alt="Mnemonic" className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <button
                          onClick={handleGenerateImage}
                          className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all"
                          title="Regenerate"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={() => setImageUrl('')}
                          className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all"
                          title="Remove"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-3 p-4">
                      <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 mb-1">
                        <Sparkles size={24} />
                      </div>
                      <div className="space-y-1 max-w-[200px]">
                        <button
                          onClick={handleGenerateImage}
                          disabled={!story}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-full text-[15px] font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Generate Image
                        </button>
                        <p className="text-[11px] text-gray-400">Based on your story</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-1">
                <button onClick={handleSave} className="w-full py-3 bg-[#007AFF] hover:bg-[#006ee6] text-white rounded-xl text-[17px] font-bold shadow-sm active:scale-[0.98] transition-all">Save Card</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
