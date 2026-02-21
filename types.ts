
export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export interface Card {
  id: string;
  folderId?: string;
  turkishMeaning: string;
  arabicWord: string;
  keyword: string; // The sound-alike
  story: string;   // The full sentence
  imagePrompt: string;
  imageUrl?: string;
  status: 'library' | 'active';
  
  // SRS related
  intervalIndex: number; // 0 to 6
  nextReviewTime: number; // timestamp
}

export const SRS_INTERVALS = [
  5 * 1000,           // 5 seconds
  25 * 1000,          // 25 seconds
  2 * 60 * 1000,      // 2 minutes
  10 * 60 * 1000,     // 10 minutes
  60 * 60 * 1000,     // 1 hour
  5 * 60 * 60 * 1000, // 5 hours
  24 * 60 * 60 * 1000 // 1 day
];

export const SRS_LABELS = [
  "5s", "25s", "2m", "10m", "1h", "5h", "1d"
];
