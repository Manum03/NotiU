import { ListNotificationsQueryDto } from "../models/notification.dto";
import { NOTIFICATION_CATEGORIES, NotificationCategory } from "../models/notification.model";
import { HttpError } from "./http-error";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const asSingleString = (v: unknown): string | undefined | null => {
  if (v === undefined) return undefined;
  return typeof v === "string" ? v : null;
};

const parsePositiveInt = (raw: string): number | null =>
  /^\d+$/.test(raw) ? Number(raw) : null;

export const validateListNotificationsQuery = (query: unknown): ListNotificationsQueryDto => {
  const q = (query ?? {}) as Record<string, unknown>;
  const errors: string[] = [];

  let category: NotificationCategory | undefined;
  const rawCategory = asSingleString(q.category);
  if (rawCategory === null) {
    errors.push("category debe ser un único valor");
  } else if (rawCategory !== undefined) {
    const upper = rawCategory.toUpperCase() as NotificationCategory;
    if (NOTIFICATION_CATEGORIES.includes(upper)) category = upper;
    else errors.push(`category debe ser uno de: ${NOTIFICATION_CATEGORIES.join(", ")}`);
  }

  let read: boolean | undefined;
  const rawRead = asSingleString(q.read);
  if (rawRead === null) {
    errors.push("read debe ser un único valor");
  } else if (rawRead !== undefined) {
    if (rawRead === "true") read = true;
    else if (rawRead === "false") read = false;
    else errors.push("read debe ser true o false");
  }

  let page = DEFAULT_PAGE;
  const rawPage = asSingleString(q.page);
  if (rawPage === null) {
    errors.push("page debe ser un único valor");
  } else if (rawPage !== undefined) {
    const n = parsePositiveInt(rawPage);
    if (n === null || n < 1) errors.push("page debe ser un entero mayor o igual a 1");
    else page = n;
  }

  let limit = DEFAULT_LIMIT;
  const rawLimit = asSingleString(q.limit);
  if (rawLimit === null) {
    errors.push("limit debe ser un único valor");
  } else if (rawLimit !== undefined) {
    const n = parsePositiveInt(rawLimit);
    if (n === null || n < 1 || n > MAX_LIMIT) {
      errors.push(`limit debe ser un entero entre 1 y ${MAX_LIMIT}`);
    } else {
      limit = n;
    }
  }

  if (errors.length > 0) throw new HttpError(400, "Datos inválidos", errors);
  return { category, read, page, limit };
};