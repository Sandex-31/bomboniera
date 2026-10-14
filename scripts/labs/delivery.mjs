import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import initSqlJs from "sql.js";
import { rng } from "./seed.mjs";
import { ensureDir, outDir, ROOT, writeJson } from "./util.mjs";

const NOMI = ["Giulia", "Marco", "Sara", "Luca", "Chiara", "Matteo", "Elena", "Davide", "Francesca", "Andrea", "Martina", "Simone", "Alessia", "Federico", "Valentina", "Lorenzo"];
const COGNOMI = ["Rossi", "Bianchi", "Ferrero", "Gallo", "Colombo", "Ricci", "Marino", "Greco", "Bruno", "Conti", "Fontana", "Moretti"];
const VIE = ["via Po", "corso Vittorio Emanuele II", "via Garibaldi", "corso Francia", "via Nizza", "corso Regina Margherita", "via Roma", "corso Giulio Cesare"];
const CUCINE = {
  pizzeria: ["Margherita", "Diavola", "Capricciosa", "Quattro formaggi", "Marinara"],
  sushi: ["Uramaki salmone", "Nigiri tonno", "Gyoza", "Temaki", "Edamame"],
  piemontese: ["Agnolotti del plin", "Vitello tonnato", "Tajarin al burro", "Bonet", "Bagna cauda"],
  burger: ["Cheeseburger", "Bacon burger", "Veggie burger", "Patatine", "Onion rings"],
  poke: ["Poke salmone", "Poke tofu", "Poke tonno", "Edamame", "Mochi"],
  kebab: ["Kebab piadina", "Falafel", "Hummus", "Patatine", "Baklava"],
};
const ALLERGENI = ["glutine", "lattosio", "uova", "pesce", "soia", "frutta a guscio", ""];
const COMMENTI = ["Arrivato caldo e in orario.", "Porzioni generose.", "Il rider è stato gentilissimo.", "Un po' in ritardo ma buono.", "Freddo all'arrivo.", "Tornerò a ordinare.", "Mancava una bibita."];

export const QUERIES = [
  { title: "Chi merita il Top Partner (≥ 20 consegne, ≥ 4.5 stelle, ≤ 1,5% annullati, ≤ 2,5% reclami)", sql:
`SELECT r.nome, COUNT(*) AS consegnati, r.stelle
FROM ristorante r JOIN ordine o ON o.ristorante = r.codice AND o.stato = 'consegnato'
GROUP BY r.codice
HAVING consegnati >= 20 AND r.stelle >= 4.5
   AND (SELECT AVG(stato = 'annullato_ristorante') FROM ordine WHERE ristorante = r.codice) <= 0.015
   AND (SELECT AVG(reclamo) FROM ordine WHERE ristorante = r.codice) <= 0.025
ORDER BY r.stelle DESC, consegnati DESC;` },
  { title: "Rider disponibili con almeno 10 km di autonomia", sql:
`SELECT codice, mezzo, batteria_km, consegne FROM rider
WHERE stato = 'Disponibile' AND (mezzo = 'bicicletta' OR batteria_km >= 10)
ORDER BY consegne DESC;` },
  { title: "Clienti più fedeli e se sono Premium", sql:
`SELECT u.nome, u.premium, COUNT(o.id) AS ordini, ROUND(SUM(o.totale), 2) AS speso
FROM utente u JOIN ordine o ON o.utente = u.email
GROUP BY u.email ORDER BY ordini DESC LIMIT 10;` },
  { title: "Le portate più ordinate", sql:
`SELECT p.titolo, r.nome AS ristorante, SUM(op.quantita) AS pezzi
FROM ordine_portata op JOIN portata p ON p.id = op.portata JOIN ristorante r ON r.codice = p.ristorante
GROUP BY p.id ORDER BY pezzi DESC LIMIT 10;` },
];

export default async function delivery() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.exec(readFileSync(join(ROOT, "scripts/labs/delivery/schema.sql"), "utf8"));
  const r = rng();
  const ins = (t, row) => db.run(`INSERT INTO ${t} (${Object.keys(row)}) VALUES (${Object.keys(row).map(() => "?")})`, Object.values(row));
  const lastId = () => db.exec("SELECT last_insert_rowid()")[0].values[0][0];

  db.exec("BEGIN");
  const utenti = [];
  for (let i = 0; i < 300; i++) {
    const nome = `${r.pick(NOMI)} ${r.pick(COGNOMI)}`;
    const email = `${nome.toLowerCase().replace(/\s+/g, ".")}${i}@esempio.it`;
    utenti.push(email);
    ins("utente", { email, nome, password_hash: `$2b$10$demo${i}`, telefono: `3${r.int(10, 99)}${r.int(1000000, 9999999)}`, indirizzo: `${r.pick(VIE)} ${r.int(1, 180)}, Torino`, premium: r.next() < 0.2 ? 1 : 0 });
    ins("conto", { utente: email, saldo: Math.round(r.next() * 8000) / 100 });
    ins("metodo_pagamento", { utente: email, tipo: r.pick(["carta", "paypal", "satispay"]), ultime4: String(r.int(1000, 9999)) });
  }

  const menu = {}; // codice ristorante → id delle portate
  const bravi = new Set();
  for (let c = 1; c <= 40; c++) {
    const cucina = r.pick(Object.keys(CUCINE));
    // a handful of kitchens are excellent on purpose, so the Top Partner query has an answer
    if (c % 7 === 0) bravi.add(c);
    ins("ristorante", { codice: c, nome: `${r.pick(["Da", "Il", "La", "Officina", "Bottega"])} ${r.pick(COGNOMI)}`, descrizione: `Cucina ${cucina} a domicilio`, tipo_cibo: cucina, costo_spedizione: r.pick([0, 1.49, 1.99, 2.49, 2.99]) });
    menu[c] = CUCINE[cucina].map((titolo) => {
      ins("portata", { ristorante: c, titolo, ingredienti: `ingredienti della ricetta ${titolo.toLowerCase()}`, allergeni: r.pick(ALLERGENI), prezzo: Math.round((4 + r.next() * 14) * 100) / 100, sconto: r.next() < 0.15 ? 0.1 : 0 });
      return lastId();
    });
  }

  for (let k = 1; k <= 60; k++) {
    const mezzo = r.pick(["bicicletta", "bicicletta elettrica", "monopattino"]);
    ins("rider", { codice: k, stato: r.pick(["Disponibile", "Disponibile", "Occupato", "Assente"]), mezzo, batteria_km: mezzo === "bicicletta" ? null : Math.round(r.next() * 400) / 10, lat: 45.07 + r.next() * 0.04, lon: 7.65 + r.next() * 0.05 });
  }

  for (let o = 1; o <= 3000; o++) {
    const c = r.int(1, 40);
    const bravo = bravi.has(c);
    const roll = r.next();
    const stato = bravo ? "consegnato" : roll < 0.04 ? "annullato_ristorante" : roll < 0.08 ? "annullato_utente" : roll < 0.1 ? "in_consegna" : "consegnato";
    const giorno = new Date(Date.UTC(2025, 0, 1) + r.int(0, 600) * 86400000);
    const righe = Array.from({ length: r.int(1, 3) }, () => r.pick(menu[c]));
    ins("ordine", { id: o, utente: r.pick(utenti), ristorante: c, rider: stato === "annullato_ristorante" ? null : r.int(1, 60), creato_il: giorno.toISOString(), orario_recapito: `${r.int(12, 22)}:${r.pick(["00", "15", "30", "45"])}`, stato, reclamo: !bravo && r.next() < 0.05 ? 1 : 0, totale: 0 });
    for (const p of new Set(righe)) ins("ordine_portata", { ordine: o, portata: p, quantita: righe.filter((x) => x === p).length });
    if (stato === "consegnato" && r.next() < 0.35) {
      ins("recensione", { utente: r.pick(utenti), ristorante: c, valutazione: bravo ? (r.next() < 0.8 ? 5 : 4) : r.int(2, 5), commento: r.pick(COMMENTI), mancia: r.pick([0, 0, 0.5, 1, 2]) });
    }
  }

  db.exec(`
    UPDATE ordine SET totale = (SELECT ROUND(SUM(op.quantita * p.prezzo * (1 - p.sconto)), 2) FROM ordine_portata op JOIN portata p ON p.id = op.portata WHERE op.ordine = ordine.id);
    UPDATE utente SET numero_ordini = (SELECT COUNT(*) FROM ordine WHERE ordine.utente = utente.email);
    UPDATE rider SET consegne = (SELECT COUNT(*) FROM ordine WHERE ordine.rider = rider.codice AND stato = 'consegnato');
    UPDATE ristorante SET stelle = COALESCE((SELECT ROUND(AVG(valutazione), 1) FROM recensione WHERE recensione.ristorante = ristorante.codice), 0);
    UPDATE ristorante SET top_partner = 1, ingresso_top_partner = '2026-01-01' WHERE stelle >= 4.5;
    COMMIT;
  `);

  const out = ensureDir(outDir("food-delivery-db"));
  writeFileSync(join(out, "delivery.db"), db.export());
  copyFileSync(join(ROOT, "scripts/labs/delivery/schema.sql"), join(out, "schema.sql"));
  writeJson(join(out, "queries.json"), QUERIES);
  console.log("  delivery.db: 300 utenti, 40 ristoranti, 60 rider, 3000 ordini");
}
