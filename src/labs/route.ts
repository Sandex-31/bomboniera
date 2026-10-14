export type LabsTab = "prova" | "codice" | "documenti";
export type LabsRoute = { page: "labs"; id?: string; tab: LabsTab; file?: string };

const TABS: LabsTab[] = ["prova", "codice", "documenti"];

/** "#/progetti[/<id>[/<tab>[/<file>]]]" → route; anything else → null. */
export function parseLabsHash(hash: string): LabsRoute | null {
  const parts = hash.replace(/^#\/?/, "").split("/");
  if (parts[0] !== "progetti") return null;
  const [, id, tab, file] = parts;
  const known = TABS.includes(tab as LabsTab);
  const route: LabsRoute = { page: "labs", tab: known ? (tab as LabsTab) : "prova" };
  if (id) route.id = id;
  if (id && known && file) route.file = decodeURIComponent(file);
  return route;
}

export const labsHash = (id?: string, tab: LabsTab = "prova", file?: string) =>
  "#/progetti" + (id ? `/${id}/${tab}` + (file ? `/${encodeURIComponent(file)}` : "") : "");
