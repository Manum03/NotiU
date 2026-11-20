import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isProduction } from "../config/env";

// Protección básica contra SSRF: el backend descarga URLs que escribe el usuario,
// así que no debe permitir que apunten a la red interna del servidor.

const isPrivateIPv4 = (ip: string): boolean => {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
};

const isPrivateIPv6 = (ip: string): boolean => {
  const v = ip.toLowerCase();
  if (v === "::1" || v === "::") return true;
  if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
  return mapped ? isPrivateIPv4(mapped[1]) : false;
};

const isPrivateAddress = (ip: string): boolean =>
  isIP(ip) === 4 ? isPrivateIPv4(ip) : isPrivateIPv6(ip);

// Lanza Error con mensaje para el usuario si la URL no es segura de descargar
export const assertPublicUrl = async (url: URL): Promise<void> => {
  const allowedProtocols = isProduction ? ["https:"] : ["https:", "http:"];
  if (!allowedProtocols.includes(url.protocol)) {
    throw new Error("La URL debe empezar por https://");
  }
  if (url.username || url.password) throw new Error("La URL no debe incluir usuario ni contraseña");

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("La URL debe ser de un servidor público");
  }

  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new Error(`No se encontró el servidor ${host}`);
  if (addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error("La URL debe ser de un servidor público");
  }
};
