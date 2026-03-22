
import React, { useState } from 'react';
import { Card, Folder, SRS_INTERVALS, SRS_LABELS } from '../types';
import { ReviewModal } from './ReviewModal';
import { CheckCircle } from 'lucide-react';

interface FolderReviewModalProps {
    folder: Folder;
    cards: Card[];
    onClose: () => void;
    onUpdateFolder: (folder: Folder) => void;
}

export const FolderReviewModal: React.FC<FolderReviewModalProps> = ({ folder, cards, onClose, onUpdateFolder }) => {
    const [index, setIndex] = useState(0);

    const handleFinish = () => {
        // Update folder SRS
        const nextIndex = Math.min((folder.intervalIndex || 0) + 1, SRS_INTERVALS.length - 1);
        const nextReviewTime = Date.now() + SRS_INTERVALS[nextIndex];
        
        onUpdateFolder({
            ...folder,
            intervalIndex: nextIndex,
            nextReviewTime: nextReviewTime
        });
        onClose();
    };

    if (cards.length === 0) {
         // Should not happen usually
         return null;
    }

    if (index < cards.length) {
        return (
            <ReviewModal 
                card={cards[index]}
                onClose={onClose}
                onDelete={() => {}} // Disable delete in review
                isReviewMode={true}
                onNextReview={() => setIndex(prev => prev + 1)}
                actionLabel={index === cards.length - 1 ? "Finish Folder" : "Next Card"}
                // We pass undefined timeLeft so buttons are enabled
            />
        );
    }

    // Finished Screen
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl transform transition-all scale-100">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle size={40} strokeWidth={3} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Folder Complete!</h2>
                  <p className="text-gray-500 mb-8">
                      You've reviewed all cards in <strong>{folder.name}</strong>.
                      <br/>
                      Next review in <strong>{SRS_LABELS[Math.min((folder.intervalIndex || 0) + 1, SRS_INTERVALS.length - 1)]}</strong>.
                  </p>
                  <button 
                      onClick={handleFinish}
                      className="w-full py-4 bg-black text-white rounded-2xl font-bold text-lg active:scale-95 transition-transform shadow-lg"
                  >
                      Done
                  </button>
             </div>
        </div>
    );
};
