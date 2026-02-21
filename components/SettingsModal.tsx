
import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Volume2, Globe, Cpu, Image as ImageIcon } from 'lucide-react';
import { getAvailableArabicVoices, playCardAudio } from '../utils/audio';
import { TEXT_MODELS, IMAGE_MODELS } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoiceURI: string;
  onVoiceSelect: (uri: string) => void;
  textModel: string;
  imageModel: string;
  onTextModelSelect: (id: string) => void;
  onImageModelSelect: (id: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  selectedVoiceURI,
  onVoiceSelect,
  textModel,
  imageModel,
  onTextModelSelect,
  onImageModelSelect
}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [playingVoiceURI, setPlayingVoiceURI] = useState<string | null>(null);
  const playingVoiceRef = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState<'voice' | 'ai'>('ai');

  // To prevent rapid-fire updates
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    let mounted = true;

    const updateVoices = () => {
      if (!mounted) return;

      const now = Date.now();
      // Simple throttle: only update max once per 500ms
      if (now - lastUpdateRef.current < 500) return;
      lastUpdateRef.current = now;

      const available = getAvailableArabicVoices();

      setVoices(prev => {
        if (prev.length === available.length && prev.length > 0) return prev;
        return available;
      });
    };

    updateVoices();
    const pollInterval = setInterval(updateVoices, 2000);
    const timeout = setTimeout(() => clearInterval(pollInterval), 10000);

    if (window.speechSynthesis) {
      const handleVoicesChanged = () => updateVoices();
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      return () => {
        mounted = false;
        clearInterval(pollInterval);
        clearTimeout(timeout);
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      };
    } else {
      return () => {
        mounted = false;
        clearInterval(pollInterval);
        clearTimeout(timeout);
      };
    }
  }, []);

  if (!isOpen) return null;

  const handleTestVoice = (voice: SpeechSynthesisVoice) => {
    if (playingVoiceRef.current === voice.voiceURI) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setPlayingVoiceURI(null);
      playingVoiceRef.current = null;
      return;
    }

    setPlayingVoiceURI(voice.voiceURI);
    playingVoiceRef.current = voice.voiceURI;

    playCardAudio(
      null,
      "مرحباً بك في تعليم اللغة العربية",
      voice.voiceURI,
      undefined,
      () => {
        if (playingVoiceRef.current === voice.voiceURI) {
          setPlayingVoiceURI(null);
          playingVoiceRef.current = null;
        }
      }
    );
  };

  const getRegionName = (lang: string) => {
    const normalizedLang = lang.replace('_', '-');
    const parts = normalizedLang.split('-');
    const code = parts.length > 1 ? parts[1] : null;
    if (!code) return 'General';
    const regions: Record<string, string> = {
      'SA': 'Saudi Arabia', 'EG': 'Egypt', 'AE': 'UAE', 'QA': 'Qatar',
      'JO': 'Jordan', 'LB': 'Lebanon', 'KW': 'Kuwait', 'MA': 'Morocco',
      'DZ': 'Algeria', 'TN': 'Tunisia', 'OM': 'Oman', 'IQ': 'Iraq',
      'BH': 'Bahrain', 'LY': 'Libya', 'SY': 'Syria', 'YE': 'Yemen',
    };
    return regions[code.toUpperCase()] || code.toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm rounded-[24px] shadow-2xl flex flex-col max-h-[75vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900">Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 active:scale-90 transition-transform">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-4">
          <div className="flex bg-gray-100/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'ai' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
            >
              <Cpu size={16} /> AI Models
            </button>
            <button
              onClick={() => setActiveTab('voice')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'voice' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
            >
              <Volume2 size={16} /> Voices
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-4">

          {activeTab === 'ai' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">

              {/* Text Model Selection */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-2">
                  <Cpu size={16} className="text-gray-400" />
                  <label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Text Generation</label>
                </div>
                <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
                  {TEXT_MODELS.map(model => (
                    <button
                      key={model.id}
                      onClick={() => onTextModelSelect(model.id)}
                      className={`w-full flex items-center justify-between p-4 transition-colors ${textModel === model.id ? 'bg-blue-50/50' : 'hover:bg-white'}`}
                    >
                      <span className={`text-[15px] font-semibold ${textModel === model.id ? 'text-[#007AFF]' : 'text-gray-800'}`}>
                        {model.name}
                      </span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${textModel === model.id ? 'bg-[#007AFF] border-[#007AFF]' : 'border-gray-200'}`}>
                        {textModel === model.id && <Check size={12} className="text-white" strokeWidth={3} />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Model Selection */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-2">
                  <ImageIcon size={16} className="text-gray-400" />
                  <label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Image Generation</label>
                </div>
                <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
                  {IMAGE_MODELS.map(model => (
                    <button
                      key={model.id}
                      onClick={() => onImageModelSelect(model.id)}
                      className={`w-full flex items-center justify-between p-4 transition-colors ${imageModel === model.id ? 'bg-blue-50/50' : 'hover:bg-white'}`}
                    >
                      <span className={`text-[15px] font-semibold ${imageModel === model.id ? 'text-[#007AFF]' : 'text-gray-800'}`}>
                        {model.name}
                      </span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${imageModel === model.id ? 'bg-[#007AFF] border-[#007AFF]' : 'border-gray-200'}`}>
                        {imageModel === model.id && <Check size={12} className="text-white" strokeWidth={3} />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {activeTab === 'voice' && (
            <div className="space-y-1 animate-in slide-in-from-right-4 duration-300">
              <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">Voice Model</p>
              {voices.length === 0 ? (
                <div className="text-center py-8 flex flex-col items-center justify-center text-gray-400 italic text-sm border-2 border-dashed border-gray-100 rounded-2xl">
                  <Globe size={24} className="mb-2 opacity-50" />
                  No Arabic voices found.
                  <span className="text-[10px] mt-1 text-gray-300">Check device settings</span>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                  {voices.map(voice => {
                    const isSelected = selectedVoiceURI === voice.voiceURI;
                    const isPlaying = playingVoiceURI === voice.voiceURI;
                    return (
                      <div
                        key={voice.voiceURI}
                        className={`flex items-center justify-between p-4 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/50' : 'hover:bg-white'}`}
                        onClick={() => onVoiceSelect(voice.voiceURI)}
                      >
                        <div className="flex-grow min-w-0 pr-4">
                          <p className={`text-[15px] font-semibold truncate ${isSelected ? 'text-[#007AFF]' : 'text-gray-800'}`}>
                            {voice.name.replace('Arabic', '').replace('Google', '').trim() || voice.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-gray-400 uppercase bg-gray-200/50 px-1.5 py-0.5 rounded">
                              {getRegionName(voice.lang)}
                            </span>
                            {voice.localService && <span className="text-[11px] text-green-600/70 uppercase bg-green-50 px-1.5 py-0.5 rounded">Offline</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleTestVoice(voice); }}
                            className={`p-2 rounded-full active:scale-90 transition-all ${isPlaying ? 'bg-[#007AFF] text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:text-[#007AFF] hover:bg-blue-50'}`}
                          >
                            <Volume2 size={16} className={isPlaying ? 'animate-pulse' : ''} />
                          </button>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#007AFF] border-[#007AFF] scale-110' : 'border-gray-200'}`}>
                            {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <p className="text-[13px] text-blue-800 leading-relaxed">
                  <strong>Tip:</strong> You can download high-quality voices in your device settings under <em>Accessibility</em> or <em>Text-to-speech</em>.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50/50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 bg-white border border-gray-200 text-gray-900 rounded-xl font-bold active:scale-[0.98] transition-all shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
