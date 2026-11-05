export interface Profile {
  userId: number;
  bio?: string;
  career: string;
  semester: number;
  university: string;
  avatarUrl?: string;
  interests: string[];
}