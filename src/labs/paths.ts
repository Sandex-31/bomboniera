/** Artifact URL, correct under any VITE_BASE (the site lives in /bomboniera/). */
export const labsUrl = (id: string, ...parts: string[]) =>
  new URL(`${import.meta.env.BASE_URL}labs/${[id, ...parts].join("/")}`, window.location.href).href;
