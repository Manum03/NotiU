import { db } from "../config/firebase";
import {
  ConnectResponseDto,
  IntegrationDto,
  ListIntegrationsResponseDto,
  SyncResultDto,
} from "../models/integration.dto";
import {
  INTEGRATION_PROVIDERS,
  Integration,
  IntegrationProvider,
  PROVIDER_LABEL,
  PROVIDER_SOURCE,
} from "../models/integration.model";
import { decrypt, encrypt } from "../utils/crypto";
import { iso, toDate, toDateOrNow } from "../utils/firestore";
import { HttpError } from "../utils/http-error";
import { classroomConnector } from "./integrations/classroom.connector";
import { moodleIcalConnector, normalizeIcalUrl } from "./integrations/moodle-ical.connector";
import { ConnectorError, ReauthRequiredError } from "./integrations/types";
import { syncService } from "./sync.service";
import { taskService } from "./task.service";

// Integraciones en Firestore: `integrations/{userId}_{provider}` (colección global para
// que el job pueda recorrer todas sin índices especiales).
const integrationsCol = db.collection("integrations");
const MANUAL_SYNC_COOLDOWN_MS = 60_000;

const integrationId = (userId: string, provider: IntegrationProvider): string => `${userId}_${provider}`;

const fromDoc = (id: string, d: FirebaseFirestore.DocumentData): Integration => ({
  id,
  userId: String(d.userId),
  provider: d.provider,
  status: d.status ?? "active",
  secret: String(d.secret ?? ""),
  displayName: String(d.displayName ?? ""),
  lastSyncAt: toDate(d.lastSyncAt),
  lastSuccessAt: toDate(d.lastSuccessAt),
  lastError: d.lastError ?? null,
  lastStats: d.lastStats ?? null,
  createdAt: toDateOrNow(d.createdAt),
  updatedAt: toDateOrNow(d.updatedAt),
});

// Nunca se devuelve el secreto al cliente
const toDto = (provider: IntegrationProvider, i: Integration | null): IntegrationDto => ({
  provider,
  label: PROVIDER_LABEL[provider],
  connected: i !== null,
  status: i?.status ?? null,
  displayName: i?.displayName ?? null,
  lastSyncAt: iso(i?.lastSyncAt ?? null),
  lastSuccessAt: iso(i?.lastSuccessAt ?? null),
  lastError: i?.lastError ?? null,
  lastStats: i?.lastStats ?? null,
});

// Los errores de los conectores se traducen a HttpError (mismo formato que el resto de la API)
const toHttpError = (err: unknown): unknown => {
  if (err instanceof ConnectorError || err instanceof ReauthRequiredError) return new HttpError(400, err.message);
  return err;
};

const get = async (userId: string, provider: IntegrationProvider): Promise<Integration | null> => {
  const snap = await integrationsCol.doc(integrationId(userId, provider)).get();
  return snap.exists ? fromDoc(snap.id, snap.data() ?? {}) : null;
};

const save = async (
  userId: string,
  provider: IntegrationProvider,
  secretPlain: string,
  displayName: string,
): Promise<Integration> => {
  const now = new Date();
  const previous = await get(userId, provider);
  const integration: Integration = {
    id: integrationId(userId, provider),
    userId,
    provider,
    status: "active",
    secret: encrypt(secretPlain),
    displayName,
    lastSyncAt: previous?.lastSyncAt ?? null,
    lastSuccessAt: previous?.lastSuccessAt ?? null,
    lastError: null,
    lastStats: previous?.lastStats ?? null,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
  const { id: _id, ...stored } = integration;
  await integrationsCol.doc(integration.id).set(stored);
  return integration;
};

export const integrationService = {
  async list(userId: string): Promise<ListIntegrationsResponseDto> {
    const items = await Promise.all(INTEGRATION_PROVIDERS.map((p) => get(userId, p)));
    return { data: INTEGRATION_PROVIDERS.map((p, i) => toDto(p, items[i])) };
  },

  async connectMoodle(userId: string, icalUrl: string): Promise<ConnectResponseDto> {
    try {
      const url = normalizeIcalUrl(icalUrl);
      // Se descarga una vez para validar el enlace antes de guardarlo
      const tasks = await moodleIcalConnector.fetchTasks({ userId, secret: url.toString() });
      const integration = await save(userId, "moodle", url.toString(), url.hostname);
      const sync = await syncService.syncIntegration(integration, tasks);
      return { message: "Moodle conectado", integration: toDto("moodle", await get(userId, "moodle")), sync };
    } catch (err) {
      throw toHttpError(err);
    }
  },

  async connectClassroom(userId: string, serverAuthCode: string): Promise<ConnectResponseDto> {
    try {
      const { refreshToken, email } = await classroomConnector.exchangeCode(serverAuthCode);
      const integration = await save(userId, "classroom", refreshToken, email ?? "Cuenta de Google");
      const sync = await syncService.syncIntegration(integration);
      return {
        message: "Google Classroom conectado",
        integration: toDto("classroom", await get(userId, "classroom")),
        sync,
      };
    } catch (err) {
      throw toHttpError(err);
    }
  },

  // Borra la integración y las tareas importadas de esa plataforma
  async disconnect(userId: string, provider: IntegrationProvider): Promise<{ message: string; deletedTasks: number }> {
    const integration = await get(userId, provider);
    if (!integration) throw new HttpError(404, `${PROVIDER_LABEL[provider]} no está conectado`);

    if (provider === "classroom") await classroomConnector.revoke(decrypt(integration.secret));
    await integrationsCol.doc(integration.id).delete();
    const deletedTasks = await taskService.removeBySource(userId, PROVIDER_SOURCE[provider]);
    return { message: `${PROVIDER_LABEL[provider]} desconectado`, deletedTasks };
  },

  async syncNow(userId: string, provider: IntegrationProvider): Promise<SyncResultDto> {
    const integration = await get(userId, provider);
    if (!integration) throw new HttpError(404, `${PROVIDER_LABEL[provider]} no está conectado`);
    if (integration.status === "needs_reauth") {
      throw new HttpError(409, `Debes volver a conectar ${PROVIDER_LABEL[provider]}`);
    }
    if (integration.lastSyncAt && Date.now() - integration.lastSyncAt.getTime() < MANUAL_SYNC_COOLDOWN_MS) {
      throw new HttpError(429, "Espera un minuto antes de sincronizar de nuevo");
    }
    try {
      return await syncService.syncIntegration(integration);
    } catch (err) {
      throw toHttpError(err);
    }
  },

  // Lo usa el job: sincroniza todas las integraciones que no requieren reconexión
  async syncAllActive(): Promise<{ ok: number; failed: number }> {
    const snap = await integrationsCol.where("status", "in", ["active", "error"]).get();
    let ok = 0;
    let failed = 0;
    for (const doc of snap.docs) {
      try {
        await syncService.syncIntegration(fromDoc(doc.id, doc.data()));
        ok++;
      } catch (err) {
        failed++;
        console.warn(`[sync] ${doc.id}: ${err instanceof Error ? err.message : err}`);
      }
    }
    return { ok, failed };
  },
};
