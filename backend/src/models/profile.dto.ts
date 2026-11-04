export interface ProfileResponseDto {
  id: string;
  name: string;
  bio?: string;
  career: string;
  semester: number;
  university: string;
  interests: string[];
  stats: {
    subjects: number;
    connections: number;
  };
}