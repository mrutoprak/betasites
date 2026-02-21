
import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Loader2, CheckCircle2, AlertCircle, Clock, Layers, Folder as FolderIcon, Square } from 'lucide-react';
import { generateMnemonicData, generateCreativePrompt, generateImage } from '../services/geminiService';
import { Card, Folder } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { NebulaButton } from './NebulaButton';

interface BulkCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (card: Card) => void;
  folders?: Folder[];
  textModel: string;
  imageModel: string;
  initialFolderId?: string;
}

type ProcessStatus = 'idle' | 'generating' | 'waiting' | 'paused' | 'done';

interface LogEntry {
  id: string;
  word: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  timestamp: number;
}

export const BulkCreateModal: React.FC<BulkCreateModalProps> = ({
  isOpen,
  onClose,
  onSave,
  folders = [],
  textModel,
  imageModel,
  initialFolderId = ''
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>(initialFolderId);
  
  // Processing State
  const [status, setStatus] = useState<ProcessStatus>('idle');
  const [queue, setQueue] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [countdown, setCountdown] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>(''); // To show "Generating text..." vs "Generating image..."

  const processingRef = useRef(false);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedFolderId(initialFolderId);
      setStatus('idle');
      setQueue([]);
      setCurrentIndex(0);
      setLogs([]);
      setInputText('');
      setCountdown(0);
      setCurrentStep('');
      processingRef.current = false;
    }
  }, [isOpen, initialFolderId]);

  // Handle Close - ensure we stop processing
  const handleClose = () => {
    setStatus('idle'); // Stop loop
    processingRef.current = false;
    onClose();
  };

  const handleStart = () => {
    const words = inputText.split('\n').map(w => w.trim()).filter(w => w.length > 0);
    if (words.length === 0) return;

    setQueue(words);
    setCurrentIndex(0);
    setLogs([]);
    setStatus('generating');
    processingRef.current = true;
  };

  const handleStop = () => {
    setStatus('paused');
    processingRef.current = false;
  };

  const addLog = (word: string, status: LogEntry['status'], message?: string) => {
    setLogs(prev => [{
      id: uuidv4(),
      word,
      status,
      message,
      timestamp: Date.now()
    }, ...prev]);
  };

  // Main Processing Loop
  useEffect(() => {
    if (!isOpen) return;

    let timer: any;

    const processCurrent = async () => {
      if (!processingRef.current) return;
      if (currentIndex >= queue.length) {
        setStatus('done');
        processingRef.current = false;
        return;
      }

      const word = queue[currentIndex];

      try {
        // 1. Generate Text
        setCurrentStep('Analyizing & Writing Story...');
        const data = await generateMnemonicData(word, textModel);
        
        // 2. Generate Image Prompt
        setCurrentStep('Designing Image Prompt...');
        const prompt = await generateCreativePrompt(data.story, data.keyword, data.turkishMeaning, textModel);

        // 3. Generate Image
        setCurrentStep('Painting Image...');
        const imageBase64 = await generateImage(prompt, imageModel);
        
        // Create Card
        const newCard: Card = {
          id: uuidv4(),
          folderId: selectedFolderId || undefined,
          turkishMeaning: data.turkishMeaning,
          arabicWord: data.arabicWord,
          keyword: data.keyword,
          story: data.story,
          imagePrompt: prompt,
          imageUrl: imageBase64,
          status: 'library',
          intervalIndex: 0,
          nextReviewTime: 0
        };

        onSave(newCard);
        addLog(word, 'success');

      } catch (err: any) {
        console.error(err);
        addLog(word, 'error', err.message || "Generation failed");
      }

      // Prepare for next
      if (currentIndex < queue.length - 1) {
        // Start waiting period (10-15s)
        const delay = Math.floor(Math.random() * (15 - 10 + 1) + 10);
        setCountdown(delay);
        setStatus('waiting');
        setCurrentStep('');
      } else {
        setStatus('done');
        processingRef.current = false;
        setCurrentStep('');
      }
    };

    if (status === 'generating') {
      processCurrent();
    } else if (status === 'waiting') {
      // Countdown Timer
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Move to next
            setCurrentIndex(c => c + 1);
            setStatus('generating');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [status, queue, currentIndex, selectedFolderId, textModel, imageModel, isOpen, onSave]);


  if (!isOpen) return null;

  const isProcessing = status === 'generating' || status === 'waiting';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={isProcessing ? undefined : handleClose} />
      
      <div className="relative bg-[#F2F2F7] w-full max-w-lg rounded-[20px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shrink-0">
           {isProcessing ? (
             <div className="w-[50px]"></div> // Spacer
           ) : (
             <button onClick={handleClose} className="text-[#007AFF] text-[17px] active:opacity-50 transition-opacity">Close</button>
           )}
           <h2 className="text-[17px] font-semibold text-black absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
             <Layers size={18} /> Bulk Create
           </h2>
           <div className="w-[50px]"></div>
        </div>

        <div className="flex-grow overflow-hidden flex flex-col">
          
          {status === 'idle' ? (
            // INPUT VIEW
            <div className="p-4 flex flex-col h-full gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200/50 flex flex-col flex-grow">
                <label className="text-sm font-semibold text-gray-500 mb-2 block">
                  Paste words (one per line)
                </label>
                <textarea 
                  className="flex-grow w-full resize-none outline-none text-[16px] text-gray-900 placeholder:text-gray-300 font-mono leading-relaxed"
                  placeholder={`Araba\nKitap\nKalem`}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  autoFocus
                />
              </div>

              {folders.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden px-3 h-12 flex items-center">
                    <label className="w-24 text-[15px] font-medium text-gray-500 shrink-0 flex items-center gap-2">
                      <FolderIcon size={16}/> Save to
                    </label>
                    <select 
                      value={selectedFolderId}
                      onChange={(e) => setSelectedFolderId(e.target.value)}
                      className="flex-1 text-[15px] outline-none bg-transparent h-full text-gray-900"
                    >
                      <option value="">General (No Folder)</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                </div>
              )}

              <NebulaButton onClick={handleStart} disabled={!inputText.trim()}>
                <Play size={18} fill="currentColor" />
                Start Processing
              </NebulaButton>
            </div>
          ) : (
            // PROGRESS VIEW
            <div className="flex flex-col h-full">
              
              {/* Status Bar */}
              <div className="bg-white p-6 border-b border-gray-100 flex flex-col items-center justify-center gap-3">
                
                {status === 'done' ? (
                   <div className="text-green-500 flex flex-col items-center animate-in zoom-in">
                      <CheckCircle2 size={48} className="mb-2" />
                      <span className="text-xl font-bold text-gray-900">Completed</span>
                   </div>
                ) : (
                  <div className="relative w-full max-w-[200px] text-center">
                    <div className="text-3xl font-bold text-gray-900 font-mono mb-1">
                      {currentIndex + 1} <span className="text-gray-300">/</span> {queue.length}
                    </div>
                    
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mt-3">
                      <div 
                        className="h-full bg-[#007AFF] transition-all duration-500"
                        style={{ width: `${((currentIndex) / queue.length) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="h-8 flex items-center justify-center">
                   {status === 'generating' && (
                     <span className="flex items-center gap-2 text-[#007AFF] font-medium animate-pulse">
                       <Loader2 size={16} className="animate-spin" />
                       {currentStep || 'Generating...'}
                     </span>
                   )}
                   {status === 'waiting' && (
                     <span className="flex items-center gap-2 text-orange-500 font-medium">
                       <Clock size={16} />
                       Cooling down... {countdown}s
                     </span>
                   )}
                   {status === 'done' && (
                     <span className="text-gray-500 text-sm">All words processed.</span>
                   )}
                   {status === 'paused' && (
                     <span className="text-red-500 font-medium">Paused</span>
                   )}
                </div>
              </div>

              {/* Log Console */}
              <div className="flex-grow overflow-y-auto p-4 bg-gray-50 space-y-2 font-mono text-sm">
                 {logs.length === 0 && <div className="text-gray-400 text-center mt-10">Logs will appear here...</div>}
                 
                 {logs.map(log => (
                   <div key={log.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-start gap-3 animate-in slide-in-from-top-1">
                      <div className="mt-0.5">
                        {log.status === 'success' && <CheckCircle2 size={16} className="text-green-500" />}
                        {log.status === 'error' && <AlertCircle size={16} className="text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="flex justify-between items-center mb-0.5">
                            <span className="font-bold text-gray-900 truncate">{log.word}</span>
                            <span className="text-[10px] text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                         </div>
                         {log.status === 'error' ? (
                           <p className="text-red-600 text-xs">{log.message}</p>
                         ) : (
                           <p className="text-green-600 text-xs">Card & Image created</p>
                         )}
                      </div>
                   </div>
                 ))}
              </div>

              {/* Controls */}
              <div className="p-4 bg-white border-t border-gray-200">
                 {status === 'done' ? (
                   <NebulaButton onClick={handleClose}>
                     Done
                   </NebulaButton>
                 ) : status === 'paused' ? (
                   <NebulaButton onClick={() => { setStatus('generating'); processingRef.current = true; }}>
                     <Play size={18} fill="currentColor"/> Resume
                   </NebulaButton>
                 ) : (
                   <NebulaButton onClick={handleStop} className="!bg-red-50 !text-red-600 hover:!bg-red-100">
                     <Square size={16} fill="currentColor" /> Stop
                   </NebulaButton>
                 )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
