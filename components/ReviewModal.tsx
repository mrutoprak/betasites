
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../types';
import { X, Trash2, Volume2, Sparkles, Check, Clock } from 'lucide-react';
import { playCardAudio } from '../utils/audio';

interface ReviewModalProps {
  card: Card;
  onClose: () => void;
  onDelete: (id: string) => void;
  isReviewMode?: boolean;
  onNextReview?: () => void;
  timeLeft?: string | null;
  actionLabel?: string;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  card,
  onClose,
  onDelete,
  isReviewMode = false,
  onNextReview,
  timeLeft,
  actionLabel
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Reset flip when card changes
    setIsFlipped(false);
    return () => {
      if (audioCleanupRef.current) audioCleanupRef.current();
    };
  }, [card.id]);

  const handlePlayAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      if (audioCleanupRef.current) audioCleanupRef.current();
      setIsPlaying(false);
      return;
    }

    const settingsRaw = localStorage.getItem('arabic-mnemonic-settings');
    const settings = settingsRaw ? JSON.parse(settingsRaw) : { selectedVoiceURI: '' };

    audioCleanupRef.current = playCardAudio(
      card.turkishMeaning,
      card.arabicWord,
      settings.selectedVoiceURI,
      () => setIsPlaying(true),
      () => setIsPlaying(false)
    );
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete this card permanently?")) {
      onDelete(card.id);
      onClose();
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNextReview) onNextReview();
  };

  const handleFlip = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsFlipped(prev => !prev);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ perspective: '1000px' }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Main Card Container */}
      <div className="relative w-full max-w-[340px] aspect-[3/4] max-h-[85vh]">

        {/* Floating Controls above card */}
        <div className="absolute -top-14 left-0 right-0 flex justify-between items-center z-50 px-2">
          <div />
          <div className="flex gap-3">
            {!isReviewMode && (
              <button
                onClick={handleDelete}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-red-500/50 flex items-center justify-center text-white transition-all active:scale-95"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 3D Flip Wrapper */}
        <div
          className="relative w-full h-full cursor-pointer"
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.55s ease-in-out',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            willChange: 'transform',
          }}
          onClick={handleFlip}
        >

          {/* ===================== FRONT FACE ===================== */}
          <div
            className="absolute inset-0 bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            {/* Image Area — 80% of card height */}
            <div className="relative h-[80%] w-full bg-gray-100 flex-shrink-0">
              {card.imageUrl ? (
                <img
                  src={card.imageUrl}
                  alt="Mnemonic"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center opacity-40">
                  <Sparkles className="mb-3 text-gray-400" size={36} strokeWidth={1} />
                  <p className="text-xs font-light text-gray-400 px-6 text-center italic leading-relaxed">
                    {card.imagePrompt || 'No image available'}
                  </p>
                </div>
              )}

              {/* Audio Button — absolute top-right on the image */}
              <button
                onClick={handlePlayAudio}
                className={`absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-90 z-10 ${isPlaying
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white'
                  }`}
                title="Play pronunciation"
              >
                <Volume2 size={18} className={isPlaying ? 'animate-pulse' : ''} />
              </button>
            </div>

            {/* Turkish Meaning Area — 20% of card height */}
            <div className="h-[20%] flex items-center justify-center px-4">
              <h2 className="text-xl font-semibold text-gray-900 text-center leading-snug break-words">
                {card.turkishMeaning}
              </h2>
            </div>

            {/* SRS Footer (Review Mode) */}
            {isReviewMode && onNextReview && (
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-100">
                <button
                  onClick={(e) => { e.stopPropagation(); handleNext(e); }}
                  disabled={!!timeLeft}
                  className={`w-full py-3 rounded-2xl text-[15px] font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${timeLeft
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-black text-white hover:bg-gray-900 shadow-md'
                    }`}
                >
                  {timeLeft ? (
                    <><Clock size={16} /><span>Wait {timeLeft}</span></>
                  ) : (
                    <><span>{actionLabel || 'Next Review'}</span><Check size={18} /></>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* ===================== BACK FACE ===================== */}
          <div
            className="absolute inset-0 bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col items-center justify-center px-6 py-8"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            {/* Keyword Badge */}
            <div className="inline-block px-4 py-1.5 bg-orange-50 text-orange-600 text-xs font-bold uppercase tracking-widest rounded-full mb-5 shadow-sm border border-orange-100">
              {card.keyword}
            </div>

            {/* Mnemonic Story */}
            <p className="text-[16px] text-gray-700 font-medium leading-relaxed text-center whitespace-pre-line break-words">
              {card.story}
            </p>

            {/* SRS Footer (Review Mode) */}
            {isReviewMode && onNextReview && (
              <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-100 bg-white">
                <button
                  onClick={(e) => { e.stopPropagation(); handleNext(e); }}
                  disabled={!!timeLeft}
                  className={`w-full py-3 rounded-2xl text-[15px] font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${timeLeft
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-black text-white hover:bg-gray-900 shadow-md'
                    }`}
                >
                  {timeLeft ? (
                    <><Clock size={16} /><span>Wait {timeLeft}</span></>
                  ) : (
                    <><span>{actionLabel || 'Next Review'}</span><Check size={18} /></>
                  )}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
