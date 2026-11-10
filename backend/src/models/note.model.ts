export interface Note {
  id: string;
  userId: number; // autor del apunte: solo él puede editarlo o eliminarlo
  title: string;
  content: string;
  subjectId: string | null; // materia opcional; queda en null si la materia se elimina
  tags: string[];
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}
