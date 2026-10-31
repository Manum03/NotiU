export interface Session {
  token: string;
  userId: number;
  createdAt: Date;
  expiresAt: Date;
}
