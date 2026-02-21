
export const getAvailableArabicVoices = (): SpeechSynthesisVoice[] => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];

  const voices = window.speechSynthesis.getVoices();

  return voices.filter(v => {
    const lang = (v.lang || '').toLowerCase().replace('_', '-');
    const name = (v.name || '').toLowerCase();

    // 1. Check standard language codes (ar, ar-sa, ar-eg, etc.)
    if (lang.startsWith('ar')) return true;

    // 2. Fallback: Check name for "Arabic" or "Arab"
    if (name.includes('arabic') || name.includes('arab')) return true;

    // 3. Fallback: Check for Arabic characters in the name
    if (/[\u0600-\u06FF]/.test(name)) return true;

    return false;
  });
};

export const playCardAudio = (
  turkishText: string | null,
  arabicText: string,
  preferredVoiceURI?: string,
  onStart?: () => void,
  onEnd?: () => void
): () => void => {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn("Speech synthesis is not supported in this environment.");
    return () => { };
  }

  // Cancel any currently playing speech
  window.speechSynthesis.cancel();

  let timeoutId: any = null;
  let isCancelled = false;

  // Cleanup function to return
  const cancel = () => {
    isCancelled = true;
    if (timeoutId) clearTimeout(timeoutId);
    window.speechSynthesis.cancel();
    if (onEnd) onEnd(); // Ensure UI resets if cancelled
  };

  // Strip pronunciation in parentheses (e.g., "كتاب (Kitab)" -> "كتاب") for the TTS engine
  const textToSpeak = arabicText.replace(/\s*\(.*?\)/g, '').trim();

  const speakArabic = (voices: SpeechSynthesisVoice[]) => {
    if (isCancelled) return;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.9;

    let selectedVoice = null;

    // 1. Try preferred voice from settings
    if (preferredVoiceURI) {
      selectedVoice = voices.find(v => v.voiceURI === preferredVoiceURI);
    }

    // 2. Fallback to best Arabic match
    if (!selectedVoice) {
      // Try to find any Arabic voice using the robust getter logic locally applied
      // Priorities: ar-SA -> any 'ar' starting lang -> name containing Arabic
      selectedVoice = voices.find(v => (v.lang || '').replace('_', '-').toLowerCase() === 'ar-sa');

      if (!selectedVoice) {
        selectedVoice = voices.find(v => (v.lang || '').toLowerCase().startsWith('ar'));
      }

      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.name.toLowerCase().includes('arabic'));
      }
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      // Absolute fallback
      utterance.lang = 'ar-SA';
    }

    // Only hook onStart here if we didn't play Turkish first.
    // If we played Turkish, onStart was already called.
    if (!turkishText && onStart) {
      utterance.onstart = () => {
        if (!isCancelled) onStart();
      };
    }

    utterance.onend = () => {
      if (!isCancelled && onEnd) onEnd();
    };

    utterance.onerror = () => {
      if (!isCancelled && onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  };

  const startSequence = (voices: SpeechSynthesisVoice[]) => {
    if (isCancelled) return;

    if (turkishText) {
      // Speak Turkish First
      const trUtterance = new SpeechSynthesisUtterance(turkishText);
      trUtterance.lang = 'tr-TR';

      // Find Turkish voice
      const trVoice = voices.find(v => v.lang.toLowerCase().startsWith('tr'));
      if (trVoice) trUtterance.voice = trVoice;

      trUtterance.onstart = () => {
        if (!isCancelled && onStart) onStart();
      };

      trUtterance.onend = () => {
        if (isCancelled) return;
        // 2.5s Delay
        timeoutId = setTimeout(() => {
          speakArabic(voices);
        }, 2500);
      };

      trUtterance.onerror = (e) => {
        console.warn("Turkish TTS error", e);
        if (!isCancelled) {
          // Try to proceed to Arabic despite error, after short delay
          timeoutId = setTimeout(() => {
            speakArabic(voices);
          }, 500);
        }
      };

      window.speechSynthesis.speak(trUtterance);
    } else {
      // Only Arabic
      speakArabic(voices);
    }
  };

  // Ensure voices are loaded before speaking
  const currentVoices = window.speechSynthesis.getVoices();
  if (currentVoices.length > 0) {
    startSequence(currentVoices);
  } else {
    // Retry mechanism for Android/Chrome where voices might be lazy-loaded
    let retryCount = 0;
    const maxRetries = 10; // 500ms * 10 = 5 seconds

    const checkVoices = () => {
      if (isCancelled) return;
      const updatedVoices = window.speechSynthesis.getVoices();
      if (updatedVoices.length > 0 || retryCount >= maxRetries) {
        startSequence(updatedVoices);
      } else {
        retryCount++;
        timeoutId = setTimeout(checkVoices, 500);
      }
    };
    checkVoices();
  }

  return cancel;
};

// --- ROBUST BACKGROUND ALARM SYSTEM ---
let audioCtx: AudioContext | null = null;
let isPlaying = false;
let nextNoteTime = 0.0;
let timerID: any = null;
const BEEP_INTERVAL = 2.5;

const getAudioContext = () => {
  if (!audioCtx) {
    const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (CtxClass) audioCtx = new CtxClass();
  }
  return audioCtx;
};

const scheduleNote = (time: number) => {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.3, time + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  osc.start(time);
  osc.stop(time + 0.2);

  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.connect(gain2);
  gain2.connect(audioCtx.destination);
  osc2.type = 'sine';
  osc2.frequency.value = 880;
  const time2 = time + 0.25;
  gain2.gain.setValueAtTime(0, time2);
  gain2.gain.linearRampToValueAtTime(0.3, time2 + 0.02);
  gain2.gain.exponentialRampToValueAtTime(0.001, time2 + 0.15);
  osc2.start(time2);
  osc2.stop(time2 + 0.2);
};

const scheduler = () => {
  if (!isPlaying || !audioCtx) return;
  while (nextNoteTime < audioCtx.currentTime + 1.5) {
    scheduleNote(nextNoteTime);
    nextNoteTime += BEEP_INTERVAL;
  }
  timerID = setTimeout(scheduler, 500);
};

export const startAlarm = () => {
  if (isPlaying) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  isPlaying = true;
  nextNoteTime = ctx.currentTime + 0.1;
  scheduler();
};

export const stopAlarm = () => {
  isPlaying = false;
  if (timerID) {
    clearTimeout(timerID);
    timerID = null;
  }
};
