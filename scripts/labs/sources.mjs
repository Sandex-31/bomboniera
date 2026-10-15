import { homedir } from "node:os";
import { join } from "node:path";

const HOME = homedir();
const TG = join(HOME, "Downloads/Telegram Desktop");
const UNI = join(HOME, "ProgettiUni-dal-laptop/ProgettiUni");

/** Where each project lives on this machine. Adding a project = one entry here + one in src/data/projects.ts. */
export const SOURCES = {
  "lab-asd": {
    repo: join(HOME, "Workspace/laboratorio-algoritmi-2024-2025-main"),
    dictionary: join(TG, "dictionary.txt"),
    correctme: join(TG, "correctme.txt"),
    graph: join(TG, "italian_dist_graph.csv"),
  },
  catering: { zip: join(TG, "progetto - Pierri Salvatore.zip"), pdf: join(UNI, "Relazioni-PDF/Gestire il Personale - Pierri Salvatore.pdf") },
  "film-data": { repo: join(HOME, "Workspace/Project_IUM_TWEB") },
  "food-delivery-db": { pdf: "D:/Backup/PROGETTO BD SALVATORE PIERRI.pdf" },
  mtdi: { pdf: join(UNI, "Relazioni-PDF/MTDI24_Pierri.pdf"), consegne: join(UNI, "Relazioni-PDF/Pierri Consegne.pdf") },
  "so-centrale": { dir: join(UNI, "da-VM-VirtualBox-Ubuntu22.04/Progetto-SO-centrale-nucleare") },
  lft: { dir: join(UNI, "LFT-consegne-SalvatorePierri") },
  "client-email": { dir: join(UNI, "Prog-III-ClientEmail") },
};
