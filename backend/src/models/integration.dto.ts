import { IntegrationProvider, IntegrationStatus, SyncStats } from "./integration.model";

export interface IntegrationDto {
  provider: IntegrationProvider;
  label: string;
  connected: boolean;
  status: IntegrationStatus | null;
  displayName: string | null;
  lastSyncAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastStats: SyncStats | null;
}

export interface ListIntegrationsResponseDto {
  data: IntegrationDto[];
}

export interface ConnectMoodleDto {
  icalUrl: string;
}

export interface ConnectClassroomDto {
  serverAuthCode: string;
}

export interface SyncResultDto extends SyncStats {
  provider: IntegrationProvider;
  durationMs: number;
}

export interface ConnectResponseDto {
  message: string;
  integration: IntegrationDto;
  sync: SyncResultDto;
}
