import { Expo, ExpoPushMessage } from "expo-server-sdk";
import { config } from "../../config/env";
import { deviceService } from "../device.service";

const expo = new Expo(config.expo.accessToken ? { accessToken: config.expo.accessToken } : {});

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export const pushService = {
  // Envía la notificación a todos los dispositivos del usuario. Devuelve cuántos la aceptaron.
  async sendToUser(userId: string, payload: PushPayload): Promise<number> {
    const tokens = await deviceService.listTokens(userId);
    if (tokens.length === 0) return 0;

    const messages: ExpoPushMessage[] = tokens.map((to) => ({
      to,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: "default",
      priority: "high",
      channelId: "default", // la app debe crear este canal en Android
    }));

    let accepted = 0;
    for (const batch of expo.chunkPushNotifications(messages)) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(batch);
        // Los tickets vienen en el mismo orden que los mensajes
        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          if (ticket.status === "ok") {
            accepted++;
          } else if (ticket.details?.error === "DeviceNotRegistered") {
            await deviceService.removeToken(String(batch[i].to));
          } else {
            console.warn("[push] Ticket con error:", ticket.message, ticket.details?.error);
          }
        }
      } catch (err) {
        console.error("[push] No se pudo enviar el lote a Expo", err);
      }
    }
    return accepted;
  },
};
