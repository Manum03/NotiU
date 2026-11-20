import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { config, isProduction } from "../config/env";

// Cifrado simétrico AES-256-GCM para secretos guardados en Firestore
// (URL privada del calendario de Moodle, refresh token de Google).
// Formato guardado: v1:<iv base64>:<authTag base64>:<datos base64>

const loadKey = (): Buffer => {
  if (config.encryptionKey) {
    const key = Buffer.from(config.encryptionKey, "base64");
    if (key.length !== 32) throw new Error("ENCRYPTION_KEY debe ser de 32 bytes codificados en base64");
    return key;
  }
  if (isProduction) throw new Error("ENCRYPTION_KEY es obligatoria en producción");
  console.warn("[crypto] ENCRYPTION_KEY no definida: usando una llave de desarrollo. NO usar en producción.");
  return createHash("sha256").update("notiu-dev-key").digest();
};

const key = loadKey();

export const encrypt = (plain: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), data.toString("base64")].join(":");
};

export const decrypt = (payload: string): string => {
  const [version, iv, tag, data] = payload.split(":");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Formato de secreto cifrado inválido");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
};

// Hash corto y estable para construir IDs de documentos a partir de valores externos
export const shortHash = (value: string, length = 24): string =>
  createHash("sha256").update(value).digest("hex").slice(0, length);
