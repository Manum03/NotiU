// Los tips son un catálogo compartido (no pertenecen a un usuario)
export interface Tip {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  author: string;
  tags: string[];
  readingTimeMin: number;
  resources: string[];
  createdAt: Date;
}

// Relación usuario <-> tip guardado en favoritos
export interface SavedTip {
  userId: number;
  tipId: string;
  savedAt: Date;
}
