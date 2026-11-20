export interface Profile {
  userId: string;
  bio?: string;
  career: string;
  semester: number;
  university: string;
  avatarUrl?: string;
  interests: string[];
}