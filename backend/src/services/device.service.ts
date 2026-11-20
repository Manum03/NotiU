import { Expo } from "expo-server-sdk";
import { db } from "../config/firebase";
import { HttpError } from "../utils/http-error";
import { shortHash } from "../utils/crypto";

// Dispositivos que reciben push: colección `devices/{hash(token)}`.
// Un token pertenece al último usuario que lo registró (si alguien cambia de cuenta
// en el mismo celular, deja de recibir las notificaciones de la cuenta anterior).
export type DevicePlatform = "android" | "ios" | "web";

const devicesCol = db.collection("devices");

export const deviceService = {
  async register(userId: string, token: string, platform: DevicePlatform): Promise<void> {
    if (!Expo.isExpoPushToken(token)) {
      throw new HttpError(400, "Datos inválidos", ["token debe ser un Expo push token (ExponentPushToken[...])"]);
    }
    await devicesCol.doc(shortHash(token)).set({
      userId,
      token,
      platform,
      updatedAt: new Date(),
    });
  },

  async unregister(userId: string, token: string): Promise<void> {
    const ref = devicesCol.doc(shortHash(token));
    const snap = await ref.get();
    if (snap.exists && snap.get("userId") === userId) await ref.delete();
  },

  async listTokens(userId: string): Promise<string[]> {
    const snap = await devicesCol.where("userId", "==", userId).get();
    return snap.docs.map((d) => String(d.get("token")));
  },

  // Se usa cuando Expo responde DeviceNotRegistered (app desinstalada, token vencido)
  async removeToken(token: string): Promise<void> {
    await devicesCol.doc(shortHash(token)).delete();
  },
};
