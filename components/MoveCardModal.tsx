
import React, { useState } from 'react';
import { Folder } from '../types';
import { X, Folder as FolderIcon, Check } from 'lucide-react';

interface MoveCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (folderId: string | undefined) => void;
  folders: Folder[];
  currentFolderId?: string;
}

export const MoveCardModal: React.FC<MoveCardModalProps> = ({
  isOpen,
  onClose,
  onMove,
  folders,
  currentFolderId
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>(currentFolderId || '');

  if (!isOpen) return null;

  const handleSave = () => {
    onMove(selectedFolderId || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Move Card</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-1">
            <button
              onClick={() => setSelectedFolderId('')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                selectedFolderId === '' ? 'bg-blue-50 text-[#007AFF] font-medium' : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedFolderId === '' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <FolderIcon size={20} className={selectedFolderId === '' ? 'text-[#007AFF]' : 'text-gray-400'} />
              </div>
              <span className="flex-1 text-left">General (No Folder)</span>
              {selectedFolderId === '' && <Check size={18} />}
            </button>

            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolderId(folder.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  selectedFolderId === folder.id ? 'bg-blue-50 text-[#007AFF] font-medium' : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedFolderId === folder.id ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <FolderIcon size={20} className={selectedFolderId === folder.id ? 'text-[#007AFF]' : 'text-gray-400'} />
                </div>
                <span className="flex-1 text-left truncate">{folder.name}</span>
                {selectedFolderId === folder.id && <Check size={18} />}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={handleSave}
            className="w-full py-3 bg-[#007AFF] hover:bg-[#006ee6] text-white rounded-xl font-semibold shadow-sm active:scale-[0.98] transition-all"
          >
            Move Here
          </button>
        </div>
      </div>
    </div>
  );
};
