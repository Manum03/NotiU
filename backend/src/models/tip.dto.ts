// ---- Listado (GET /api/tips) ----
export interface ListTipsFilters {
  tag?: string;
  savedOnly?: boolean;
  search?: string;
  page: number;
  limit: number;
}

export interface TipListItemDto {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  readingTimeMin: number;
  isSaved: boolean;
}

export interface ListTipsResponseDto {
  data: TipListItemDto[];
  total: number;
}
// ---- Detalle (GET /api/tips/:tipId) ----
export interface TipDetailDto {
  id: string;
  title: string;
  content: string;
  author: string;
  tags: string[];
  resources: string[];
  isSaved: boolean;
  createdAt: string;
}
// ---- Etiquetas (GET /api/tips/tags) ----
export interface TipTagDto {
  name: string;
  count: number;
}

export interface ListTipTagsResponseDto {
  tags: TipTagDto[];
}
// ---- Favoritos (POST / DELETE /api/tips/:tipId/save) ----
export interface SaveTipResponseDto {
  message: string;
  tipId: string;
  isSaved: boolean;
}
