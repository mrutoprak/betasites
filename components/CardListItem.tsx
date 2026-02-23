
import React, { memo } from 'react';
import { Card } from '../types';
import { PlayCircle, Clock, Check, MinusCircle } from 'lucide-react';

interface CardListItemProps {
  card: Card;
  variant: 'library' | 'active';
  onAction: (card: Card) => void;
  onRemove?: (id: string) => void;
  onClick?: (card: Card) => void;
  timeLeft?: string | null;
  isSelectionMode?: boolean;
  isSelected?: boolean;
}

export const CardListItem = memo(({ 
  card, 
  variant, 
  onAction, 
  onRemove,
  onClick,
  timeLeft,
  isSelectionMode = false,
  isSelected = false
}: CardListItemProps) => {
  
  const handleMainClick = () => {
    if (onClick) onClick(card);
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAction(card);
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) onRemove(card.id);
  };

  return (
    <div 
      onClick={handleMainClick}
      className={`group relative bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-300 active:scale-[0.98] border border-gray-100 overflow-hidden w-full flex-shrink-0 ${
        isSelected ? 'bg-blue-50/50 border-blue-200' : ''
      }`}
    >
      
      <div className="flex items-center p-4">
        
        {/* Selection Indicator Area - Animates Width */}
        <div className={`flex-shrink-0 flex items-center justify-center overflow-hidden transition-all duration-300 ${
          isSelectionMode ? 'w-8 mr-3 opacity-100' : 'w-0 mr-0 opacity-0'
        }`}>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${
            isSelected 
              ? 'bg-[#007AFF] border-[#007AFF]' 
              : 'bg-transparent border-gray-300'
          }`}>
            {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
          </div>
        </div>

        {/* Main Content Container */}
        <div className="flex flex-grow items-start min-w-0">
          
          {/* Text & Actions */}
          <div className={`flex-grow min-w-0 flex flex-col justify-between py-0.5 ${variant === 'library' ? 'h-auto gap-2' : 'h-auto gap-3'}`}>
            <div className="flex justify-between items-start">
              <div>
                 <h3 className={`font-semibold text-gray-900 leading-tight truncate pr-2 ${variant === 'active' ? 'text-[19px]' : 'text-[17px]'}`}>
                   {card.turkishMeaning}
                 </h3>
                 {variant === 'library' && (
                   <p className="text-[13px] text-gray-500 mt-0.5 truncate">
                     {card.keyword}
                   </p>
                 )}
              </div>
              {variant === 'library' && (
                <span className="font-amiri text-xl text-gray-800 leading-none" dir="rtl">
                  {card.arabicWord}
                </span>
              )}
              {variant === 'active' && onRemove && (
                <button 
                  onClick={handleRemoveClick}
                  className="text-gray-300 hover:text-red-500 transition-colors p-1 -mr-2"
                  title="Remove from Active Queue"
                >
                  <MinusCircle size={18} strokeWidth={2} />
                </button>
              )}
            </div>

            <div className="flex items-end justify-between mt-auto">
               <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    variant === 'library' 
                      ? 'bg-gray-100 text-gray-500' 
                      : timeLeft 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-600'
                  }`}>
                    {variant === 'library' ? `Lvl ${card.intervalIndex + 1}` : timeLeft ? timeLeft : 'Review Now'}
                  </span>
               </div>
               
               {/* Action Button - Hides in selection mode */}
               <div className={`transition-opacity duration-200 ${isSelectionMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                 <button 
                   onClick={handleActionClick}
                   className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                     variant === 'library' 
                       ? 'bg-blue-50 text-blue-600' 
                       : timeLeft 
                         ? 'bg-gray-50 text-gray-400' 
                         : 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                   }`}
                 >
                   {variant === 'library' ? (
                     <PlayCircle size={16} strokeWidth={2.5} />
                   ) : timeLeft ? (
                     <Clock size={14} />
                   ) : (
                     <PlayCircle size={14} fill="currentColor" />
                   )}
                 </button>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
