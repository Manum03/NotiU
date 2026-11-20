// Plataformas conectadas (GET /integrations)
export type IntegrationProvider = 'moodle' | 'classroom';

export type IntegrationDto = {
  provider: IntegrationProvider;
  label: string;
  connected: boolean;
  status: 'active' | 'error' | 'needs_reauth' | null;
  displayName: string | null;
  lastSyncAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastStats: { total: number; created: number; updated: number; notified: number } | null;
};

export type IntegrationsResponse = { data: IntegrationDto[] };

export type SyncResult = {
  provider: IntegrationProvider;
  total: number;
  created: number;
  updated: number;
  notified: number;
  durationMs: number;
};

// PUT /integrations/moodle y POST /integrations/classroom
export type ConnectResponse = { message: string; integration: IntegrationDto; sync: SyncResult };
