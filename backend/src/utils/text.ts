// Para comparar sin importar mayúsculas ni espacios en los bordes
export const normalize = (text: string): string => text.trim().toLowerCase();

// Para buscar: además quita los acentos ("Cálculo" -> "calculo")
export const fold = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
