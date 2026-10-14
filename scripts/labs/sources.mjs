import { homedir } from "node:os";
import { join } from "node:path";

const HOME = homedir();
const TG = join(HOME, "Downloads/Telegram Desktop");

/** Where each project lives on this machine. Adding a project = one entry here + one in src/data/projects.ts. */
export const SOURCES = {
  "lab-asd": {
    repo: join(HOME, "Workspace/laboratorio-algoritmi-2024-2025-main"),
    dictionary: join(TG, "dictionary.txt"),
    correctme: join(TG, "correctme.txt"),
    graph: join(TG, "italian_dist_graph.csv"),
  },
  catering: { zip: join(TG, "progetto - Pierri Salvatore.zip") },
  "film-data": { repo: join(HOME, "Workspace/Project_IUM_TWEB") },
  "food-delivery-db": { pdf: "D:/Backup/PROGETTO BD SALVATORE PIERRI.pdf" },
};
