# Demo dei nuovi progetti — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dare una scheda **Prova** interattiva ai quattro progetti aggiunti il 15/10: Il banco delle scelte (MTDI), Client Email, Centrale nucleare, Compilatore LFT.

**Architecture:** Ogni demo è un componente React `lazy` in `src/labs/<tipo>/`, registrato in `DEMOS` di `LabsPage.tsx` come le demo esistenti (ASD, SQL, Film). MTDI, Email e Centrale sono riscritture TypeScript con un modulo puro (testato in Node via `vite.ssrLoadModule` in `scripts/check-labs.mjs`) e un componente UI sottile. LFT esegue il codice Java originale nel browser con CheerpJ, attraverso una classe driver `LabMain` aggiunta dalla build.

**Tech Stack:** React 18 + TypeScript + Vite (esistenti), Canvas 2D, CheerpJ 4.x (CDN, caricato a richiesta), JDK 17 per la build di LFT.

**Spec:** `docs/superpowers/specs/2026-10-15-demo-nuovi-progetti-design.md`

## Global Constraints

- Sito statico su GitHub Pages, base `/bomboniera/`: nessun backend; gli URL degli artefatti passano da `labsUrl(id, ...parts)` (`src/labs/paths.ts`).
- I sorgenti originali in `C:\Users\salva\ProgettiUni-dal-laptop` non si modificano mai.
- Indirizzi email della demo: solo `simone@example.com`, `laura@example.com`, `giacomo@example.com`, `admin@example.com`.
- Testi dell'interfaccia in italiano; commenti nel codice in inglese, densità come nel codice esistente.
- CheerpJ si carica solo al primo clic su **Compila ed esegui**, mai all'apertura della pagina; versione del loader fissata (niente `latest`).
- Animazioni spente con `prefers-reduced-motion: reduce`.
- Layout usabile a 360 px di larghezza, senza scroll orizzontale della pagina.
- `npm test` deve passare alla fine di ogni task. `scripts/check-labs.mjs` e diversi file in `src/` usano CRLF: modificarli con l'Edit tool, non con `sed`.
- Ogni commit termina con la riga `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Email: destinatario sconosciuto o vuoto** — l'originale ignora i destinatari che non sono tra gli utenti e mostra "Email non valida"; la demo deve fare lo stesso e non mandare nulla al server. Test in Task 3.
2. **Email: logout e nuovo login** — l'originale cancella il file dei consegnati alla disconnessione, quindi al nuovo login la casella si ripopola; chi esce e rientra non perde la posta. Test in Task 3.
3. **Centrale: parametri estremi dai cursori** (`NATOM 0`, `N_NUOVI_ATOMI 0`, `MAX_PROCESSI` minimo) — la simulazione termina con un esito, non si blocca né lancia. Test in Task 4.
4. **Centrale: atomo con `temp = 0`** (Alimentazione estrae `rand() % (N_MAX_ATOM + 1)`, quindi 0 è possibile) — in C `rand() % 0` uccide il processo; il motore scarta l'atomo senza `NaN`. Test in Task 4.
5. **LFT: programma che legge più interi** — `Output.read()` crea un nuovo `Scanner` a ogni chiamata; con lo stdin bufferizzato il secondo `read()` fallirebbe. Il driver fornisce una riga per lettura. Test in Task 6.

---

### Task 1: Spike CheerpJ (throwaway)

Verifica le incognite di LFT prima di scrivere codice da tenere: (a) dove finisce un file scritto con percorso relativo (`new FileWriter("Output.j")`) dentro CheerpJ; (b) che `cheerpOSAddStringFile` e `cjFileBlob` funzionino come previsto; (c) che `jasmin.Main` accetti `-d <dir>`. Niente di questo task resta nel repo, tranne l'annotazione nel piano.

**Files:**
- Create (temporanei, da cancellare a fine task): `public/labs/lft-spike/spike.html`, `public/labs/lft-spike/Probe.java`, `public/labs/lft-spike/probe.jar`

- [ ] **Step 1: Trova l'URL del loader CheerpJ da fissare**

Apri la pagina "Getting started" della documentazione di CheerpJ (https://cheerpj.com/docs/getting-started) e annota l'URL del loader della versione 4.x più recente indicata, nella forma `https://cjrtnc.leaningtech.com/4.X/loader.js`. Diventa la costante `LOADER` del Task 7.

- [ ] **Step 2: Scrivi la sonda Java**

`public/labs/lft-spike/Probe.java`:

```java
import java.io.*;

public class Probe {
  public static void main(String[] a) throws Exception {
    System.setProperty("user.dir", "/files/lab/");
    new File("/files/lab/").mkdirs();
    PrintStream out = new PrintStream(new FileOutputStream("/files/lab/out.txt"), true);
    out.println("user.dir=" + System.getProperty("user.dir"));
    try (FileWriter w = new FileWriter("Rel.txt")) { w.write("ciao"); }
    out.println("Rel.txt absolute=" + new File("Rel.txt").getAbsolutePath());
    out.println("in /files/lab: " + new File("/files/lab/Rel.txt").exists());
    out.println("in /files: " + new File("/files/Rel.txt").exists());
    out.println("str: " + new BufferedReader(new FileReader("/str/spike-in.txt")).readLine());
  }
}
```

- [ ] **Step 3: Compila la sonda**

Run:
```bash
cd public/labs/lft-spike && "C:/Program Files/Java/jdk-17/bin/javac" --release 8 Probe.java && "C:/Program Files/Java/jdk-17/bin/jar" cf probe.jar Probe.class && cd -
```
Expected: `probe.jar` creato, nessun errore.

- [ ] **Step 4: Scrivi la pagina della sonda**

`public/labs/lft-spike/spike.html` (sostituisci `LOADER_URL` con l'URL dello Step 1):

```html
<!doctype html>
<meta charset="utf-8">
<script src="LOADER_URL"></script>
<pre id="log"></pre>
<script type="module">
  const log = (s) => (document.getElementById("log").textContent += s + "\n");
  await cheerpjInit();
  cheerpOSAddStringFile("/str/spike-in.txt", "dal-browser\n");
  const base = new URL("./", location.href).pathname;
  const code = await cheerpjRunMain("Probe", "/app" + base + "probe.jar");
  log("exit " + code);
  log(await (await cjFileBlob("/files/lab/out.txt")).text());
</script>
```

- [ ] **Step 5: Esegui la sonda nel browser**

Run: `npx vite --port 5199` (in background), poi apri con Chrome `http://localhost:5199/labs/lft-spike/spike.html` (se Vite serve sotto `/bomboniera/`, `http://localhost:5199/bomboniera/labs/lft-spike/spike.html`) e leggi il testo di `#log`.
Expected: `exit 0` e le righe di `out.txt`. Annota:
- **A** = dove compare `Rel.txt` (`/files/lab/`, `/files/` o da nessuna parte);
- **B** = `str: dal-browser` presente sì/no.

- [ ] **Step 6: Verifica `jasmin -d` in locale**

Run:
```bash
mkdir -p "$TMP/jas" && cp "/c/Users/salva/ProgettiUni-dal-laptop/ProgettiUni/LFT-consegne-SalvatorePierri/LFT-5.2/src/Output.j" "$TMP/jas/" && java -cp "/c/Users/salva/ProgettiUni-dal-laptop/ProgettiUni/LFT-consegne-SalvatorePierri/LFT-5.2/src/jasmin.jar" jasmin.Main -d "$TMP/jas/out" "$TMP/jas/Output.j" && ls "$TMP/jas/out"
```
Expected: `Output.class` in `$TMP/jas/out`. Annota **C** = `-d` funziona sì/no.

- [ ] **Step 7: Registra l'esito e pulisci**

Sostituisci il commento `<!-- spike: … -->` in testa al Task 6 con:
`<!-- spike 2026-10-15: LOADER=<url>, relativo→<A>, /str→<B>, jasmin -d→<C> -->`.
Poi: `rm -r public/labs/lft-spike` e ferma Vite.

Decisioni che seguono dallo spike (i Task 6–7 sono scritti per il caso atteso, A = `/files/lab/`, B = sì, C = sì):
- **A** = `/files/` → in `LabMain` la copia di ripiego legge `/files/Output.j` invece di `new File("Output.j").getAbsoluteFile()`;
- **A** = nessuna parte → CheerpJ non consente scritture relative: fermati e chiedi a Salvatore (servirebbe toccare `CodeGenerator`, che il vincolo vieta);
- **B** = no → fermati e chiedi: senza `/str/` serve un altro modo di passare il programma;
- **C** = no → in `LabMain` togli `"-d", work,` e cerca `Output.class` nella cartella corrente di Jasmin.

- [ ] **Step 8: Commit dell'annotazione**

```bash
git add docs/superpowers/plans/2026-10-15-demo-nuovi-progetti.md
git commit -m "Piano demo: esito dello spike CheerpJ

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: MTDI — Il banco delle scelte

**Files:**
- Create: `src/labs/mtdi/switch.ts`, `src/labs/mtdi/MtdiLab.tsx`
- Modify: `src/types.ts` (unione `lab`), `src/labs/LabsPage.tsx:10-15` (`DEMOS`, `TRY`), `src/data/projects.ts` (progetto `mtdi`), `src/labs/labs.css` (in fondo), `scripts/check-labs.mjs`

**Interfaces:**
- Produces: `ANIMALI: { n: number; verso: string }[]`, `DEFAULT_VERSO: string`, `IF_ELSE: string`, `run(value: number, breaks: boolean[]): string[]` (chiavi eseguite in ordine: `"1"`…`"10"` o `"default"`), `javaLines(breaks: boolean[]): { text: string; key: string | null }[]`.

- [ ] **Step 1: Scrivi il test che fallisce**

In `scripts/check-labs.mjs`, subito prima della riga `const { renderToString } = await import("react-dom/server");`:

```js
  /* MTDI: the switch of the exotic animals, break by break */
  const { run, ANIMALI, javaLines } = await vite.ssrLoadModule("/src/labs/mtdi/switch.ts");
  const all = ANIMALI.map(() => true);
  for (let v = 1; v <= 10; v++) assert.deepEqual(run(v, all), [String(v)], `case ${v} alone`);
  assert.deepEqual(run(11, all), ["default"]);
  assert.deepEqual(run(12, all), ["default"]);
  const no3 = all.map((b, i) => i !== 2);
  assert.deepEqual(run(3, no3), ["3", "4"], "fall-through from 3 stops at 4's break");
  assert.deepEqual(run(10, all.map((b, i) => i !== 9)), ["10", "default"], "no break on the last case falls into default");
  assert.deepEqual(run(1, all.map(() => false)), [...ANIMALI.map((a) => String(a.n)), "default"]);
  assert.ok(!javaLines(no3).some((l) => l.key === "3" && l.text.includes("break")), "case 3 lost its break");
  assert.equal(ANIMALI[8].verso, "Fenicottero: Kraaaah", "verses come from the report");
  console.log("ok — mtdi: switch, break and fall-through");
```

- [ ] **Step 2: Esegui e verifica che fallisca**

Run: `npm test`
Expected: FAIL con un errore di import di `/src/labs/mtdi/switch.ts`.

- [ ] **Step 3: Implementa `switch.ts`**

```ts
/** The switch of the "Il banco delle scelte" activity (MTDI report, §6.1): the
 *  exotic animals the class first solves with if/else if, numbered 1–10. */
export const ANIMALI = [
  { n: 1, verso: "Leone: Roar!" },
  { n: 2, verso: "Scimmia: Uuh Uuh Aah Aah!" },
  { n: 3, verso: "Serpente: Ssssss" },
  { n: 4, verso: "Pappagallo: Craa! Craa!" },
  { n: 5, verso: "Delfino: Click Click" },
  { n: 6, verso: "Elefante: Pawoo!" },
  { n: 7, verso: "Tigre: Grrraaaawr!" },
  { n: 8, verso: "Panda: Munch munch" },
  { n: 9, verso: "Fenicottero: Kraaaah" },
  { n: 10, verso: "Coccodrillo: Snap Snap" },
];
export const DEFAULT_VERSO = "Nessun animale con questo numero";

/** Java semantics: jump to the matching case (or default), then run down until a break. Default is last. */
export function run(value: number, breaks: boolean[]): string[] {
  const start = ANIMALI.findIndex((a) => a.n === value);
  if (start < 0) return ["default"];
  const done: string[] = [];
  for (let i = start; i < ANIMALI.length; i++) {
    done.push(String(ANIMALI[i].n));
    if (breaks[i]) return done;
  }
  return [...done, "default"];
}

/** The switch as Java source; `key` tells which case a line belongs to, for highlighting. */
export function javaLines(breaks: boolean[]): { text: string; key: string | null }[] {
  const lines: { text: string; key: string | null }[] = [{ text: "switch (animale) {", key: null }];
  ANIMALI.forEach((a, i) => {
    const k = String(a.n);
    lines.push({ text: `    case ${a.n}:`, key: k });
    lines.push({ text: `        System.out.println("${a.verso}");`, key: k });
    if (breaks[i]) lines.push({ text: "        break;", key: k });
  });
  lines.push({ text: "    default:", key: "default" });
  lines.push({ text: `        System.out.println("${DEFAULT_VERSO}");`, key: "default" });
  lines.push({ text: "}", key: null });
  return lines;
}

/** The report's starting point, before the switch is introduced. */
export const IF_ELSE = [
  "if (animale == 1) {",
  '    System.out.println("Leone: Roar!");',
  "} else if (animale == 2) {",
  '    System.out.println("Scimmia: Uuh Uuh Aah Aah!");',
  "} else if (animale == 3) {",
  "    // … e così via fino a 10: dieci confronti scritti a mano",
  "}",
].join("\n");
```

- [ ] **Step 4: Esegui e verifica che passi**

Run: `npm test`
Expected: la riga `ok — mtdi: switch, break and fall-through`; il resto invariato.

- [ ] **Step 5: Registra il tipo `mtdi` e scrivi il test di pagina che fallisce**

In `src/types.ts` cambia `lab?: "asd" | "sql" | "site";` in `lab?: "asd" | "sql" | "site" | "mtdi";`.

In `scripts/check-labs.mjs` sostituisci:

```js
  const docsOnly = renderToString(h(LabsPage, { route: { page: "labs", id: "mtdi", tab: "prova" } }));
  assert.ok(docsOnly.includes("Documenti") && !docsOnly.includes(">Codice<") && !docsOnly.includes(">Prova<"), "mtdi shows documents only");
```

con:

```js
  const mtdi = renderToString(h(LabsPage, { route: { page: "labs", id: "mtdi", tab: "prova" } }));
  assert.ok(mtdi.includes(">Prova<") && mtdi.includes(">Documenti<") && !mtdi.includes(">Codice<"), "mtdi: Prova and Documenti, no Codice");
```

e nel `deepEqual` della lista dei lab aggiungi `["mtdi", "mtdi"]` dopo `["lab-asd", "asd"]` (l'array è ordinato).

Run: `npm test`
Expected: FAIL su `mtdi: Prova and Documenti` o sul `deepEqual`.

- [ ] **Step 6: Implementa `MtdiLab.tsx`**

```tsx
import { useEffect, useState } from "react";
import { ANIMALI, DEFAULT_VERSO, IF_ELSE, javaLines, run } from "./switch";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function MtdiLab() {
  const [breaks, setBreaks] = useState(() => ANIMALI.map(() => true));
  const [value, setValue] = useState<number | null>(null);
  const [shown, setShown] = useState(0);
  const path = value === null ? [] : run(value, breaks);

  // the fall-through walks down one desk at a time
  useEffect(() => {
    if (reduced()) return setShown(path.length);
    setShown(0);
    const t = setInterval(() => setShown((s) => (s >= path.length ? s : s + 1)), 350);
    return () => clearInterval(t);
  }, [value, breaks]); // eslint-disable-line react-hooks/exhaustive-deps

  const lit = new Set(path.slice(0, shown));
  const flip = (i: number) => setBreaks((b) => b.map((x, j) => (j === i ? !x : x)));

  return (
    <div className="mtdi">
      <p>Scegli un numero: lo switch salta al <code>case</code> giusto. Togli un <code>break</code> e guarda l'esecuzione «cadere» nei banchi successivi.</p>
      <div className="mtdi-pick" role="group" aria-label="Valore di animale">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
          <button key={n} className={`chip${value === n ? " chip--on" : ""}`} onClick={() => setValue(n)}>{n}</button>
        ))}
      </div>
      <div className="mtdi-grid">
        <pre className="mtdi-code" aria-label="Codice Java">
          {javaLines(breaks).map((l, i) => (
            <span key={i} className={l.key && lit.has(l.key) ? "mtdi-on" : undefined}>{l.text + "\n"}</span>
          ))}
        </pre>
        <ol className="mtdi-desks">
          {ANIMALI.map((a, i) => (
            <li key={a.n} className={`mtdi-desk${lit.has(String(a.n)) ? " mtdi-on" : ""}`}>
              <span className="mtdi-case">case {a.n}</span>
              <span>{a.verso}</span>
              <label className="mtdi-break"><input type="checkbox" checked={breaks[i]} onChange={() => flip(i)} /> break</label>
            </li>
          ))}
          <li className={`mtdi-desk${lit.has("default") ? " mtdi-on" : ""}`}>
            <span className="mtdi-case">default</span>
            <span>{DEFAULT_VERSO}</span>
          </li>
        </ol>
      </div>
      <h4>Output</h4>
      <pre className="asd-term" aria-live="polite">
        {value === null ? "…" : path.slice(0, shown).map((k) => (k === "default" ? DEFAULT_VERSO : ANIMALI[Number(k) - 1].verso)).join("\n")}
      </pre>
      <details className="mtdi-before">
        <summary>Prima dello switch: la versione con if/else if</summary>
        <pre className="mtdi-code">{IF_ELSE}</pre>
      </details>
      <p className="rewrite-note">Dall'attività «Il banco delle scelte» della relazione (scheda Documenti).</p>
    </div>
  );
}
```

- [ ] **Step 7: Registra la demo e aggiungi gli stili**

`src/labs/LabsPage.tsx`: in `DEMOS` aggiungi `mtdi: lazy(() => import("./mtdi/MtdiLab")),`; in `TRY` aggiungi `mtdi: "gioca al banco delle scelte"`.

`src/data/projects.ts`: nel progetto `id: 'mtdi'` aggiungi `lab: 'mtdi',` sotto `noCode: true,`.

In fondo a `src/labs/labs.css`:

```css
.rewrite-note { font-size: 13px; color: var(--muted); margin-top: 16px; }
.mtdi-pick { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; }
.mtdi-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; }
@media (max-width: 720px) { .mtdi-grid { grid-template-columns: minmax(0, 1fr); } }
.mtdi-code { margin: 0; padding: 12px; background: var(--glass); border: 1px solid var(--line-soft); border-radius: 6px; font: 12px/1.5 var(--font-mono); overflow-x: auto; }
.mtdi-code .mtdi-on { background: var(--gold-dim); color: var(--gold-soft); }
.mtdi-desks { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.mtdi-desk { display: grid; grid-template-columns: 70px minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 6px 10px; border: 1px solid var(--line-soft); border-radius: 6px; transition: background .2s; }
.mtdi-desk.mtdi-on { background: var(--gold-dim); border-color: rgba(227, 176, 75, 0.55); }
.mtdi-case, .mtdi-break { font: 12px var(--font-mono); color: var(--muted); white-space: nowrap; }
.mtdi-before { margin-top: 16px; }
@media (prefers-reduced-motion: reduce) { .mtdi-desk { transition: none; } }
```

- [ ] **Step 8: Verifica**

Run: `npm test && npx tsc --noEmit -p .`
Expected: tutte le righe `ok`, nessun errore di tipo.

- [ ] **Step 9: Commit**

```bash
git add src/labs/mtdi src/types.ts src/labs/LabsPage.tsx src/data/projects.ts src/labs/labs.css scripts/check-labs.mjs
git commit -m "Laboratori: MTDI, il banco delle scelte

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Client Email — server, socket e tre finestre

**Files:**
- Create: `src/labs/email/server.ts`, `src/labs/email/socket.ts`, `src/labs/email/EmailLab.tsx`, `src/labs/RewriteNote.tsx`
- Modify: `src/types.ts`, `src/labs/LabsPage.tsx`, `src/data/projects.ts` (progetto `client-email`), `src/labs/labs.css`, `scripts/check-labs.mjs`

**Interfaces:**
- Produces (`server.ts`): `type Conn = { deliver: (text: string) => void }`; `type MailServer = { request(input: string, conn: Conn): void; disconnect(email: string): void; console: string[]; messages: string[] }`; `USERS: string[]`; `ADMIN: string`; `javaHash(s: string): number`; `parse(msg: string): { from: string; to: string; body: string }`; `createMailServer(onChange?: () => void): MailServer`; `send(from: string, recipients: string, text: string, request: (input: string) => void): { sent: string[]; invalid: string[] }`.
- Produces (`socket.ts`): `connect(server: MailServer, onText: (text: string) => void): { send(input: string): void; close(email: string): void }`.
- Produces (`RewriteNote.tsx`): default export `RewriteNote({ id, files }: { id: string; files: string[] })` — usato anche dal Task 5.

Protocollo originale (da `ServerMain.java` e `ClientController.java`, già letti): ogni richiesta è il testo prima di `---END---`, con un `\n` dopo ogni riga. `CLIENT:<email>` registra un client (in minuscolo) e gli consegna i messaggi a lui destinati non ancora consegnati; `CLIENT:<email> role: admin` registra l'admin. `DELETE_MESSAGE\n<messaggio>` rimuove i messaggi uguali dopo `trim()`. Ogni altro testo è un messaggio `DA: <mittente>\nA: <destinatario>\n<testo>\n`: viene salvato, consegnato se il destinatario è collegato (una volta sola per id), e loggato all'admin come `Log: <mittente> ha mandato una mail a <destinatario>`. Alla disconnessione il server dimentica cosa ha già consegnato a quel client. Il client manda un messaggio per destinatario (separatori `[,;\s]+`) e solo ai destinatari tra gli utenti noti.

- [ ] **Step 1: Scrivi il test che fallisce**

In `scripts/check-labs.mjs`, subito dopo `console.log("ok — mtdi: switch, break and fall-through");`:

```js
  /* Client Email: the server protocol of ServerMain.java, without sockets */
  const mail = await vite.ssrLoadModule("/src/labs/email/server.ts");
  assert.equal(mail.javaHash("ciao"), 3053332, "javaHash matches String.hashCode");
  const srv = mail.createMailServer();
  const box = { simone: [], laura: [], giacomo: [], admin: [] };
  const conn = (k) => ({ deliver: (t) => box[k].push(t) });
  srv.request("CLIENT:admin@example.com role: admin\n", conn("admin"));
  srv.request("CLIENT:Simone@Example.com\n", conn("simone"));
  srv.request("CLIENT:laura@example.com\n", conn("laura"));
  assert.ok(srv.console.includes("Client registrato: simone@example.com"), "login lowercases the address");
  const sent = mail.send("simone@example.com", "laura@example.com, giacomo@example.com; nessuno@example.com", "Ciao!", (i) => srv.request(i, conn("simone")));
  assert.deepEqual(sent.invalid, ["nessuno@example.com"], "unknown recipients are refused before the server");
  assert.equal(sent.sent.length, 2);
  assert.equal(box.laura.length, 1, "online recipient gets it at once");
  assert.deepEqual(mail.parse(box.laura[0]), { from: "simone@example.com", to: "laura@example.com", body: "Ciao!" });
  assert.equal(box.giacomo.length, 0, "offline recipient waits");
  assert.ok(box.admin.includes("Log: simone@example.com ha mandato una mail a laura@example.com"));
  srv.request("CLIENT:giacomo@example.com\n", conn("giacomo"));
  assert.equal(box.giacomo.length, 1, "queued mail is delivered at login");
  srv.disconnect("laura@example.com");
  srv.request("CLIENT:laura@example.com\n", conn("laura"));
  assert.equal(box.laura.length, 2, "logging in again refills the inbox, as the deleted delivered file did");
  srv.request("DELETE_MESSAGE\n" + box.laura[0], conn("laura"));
  assert.equal(srv.messages.filter((m) => mail.parse(m).to === "laura@example.com").length, 0, "DELETE_MESSAGE removes it");
  assert.deepEqual(mail.send("simone@example.com", "  ", "x", () => assert.fail("nothing to send")), { sent: [], invalid: [] });
  console.log("ok — email: delivery, queue, admin log, delete");
```

- [ ] **Step 2: Esegui e verifica che fallisca**

Run: `npm test`
Expected: FAIL con errore di import di `/src/labs/email/server.ts`.

- [ ] **Step 3: Implementa `server.ts`**

```ts
/** Rewrite of Prog-III-ClientEmail/Server/src/ServerMain.java: same protocol and log lines,
 *  state in memory instead of messages.txt and the delivered/ files. */
export type Conn = { deliver: (text: string) => void };
export type MailServer = {
  request(input: string, conn: Conn): void;
  disconnect(email: string): void;
  console: string[];
  messages: string[];
};

/** The demo accounts (SceneController's list, with the published placeholder addresses). */
export const USERS = ["simone@example.com", "laura@example.com", "giacomo@example.com"];
export const ADMIN = "admin@example.com";

/** java.lang.String#hashCode, which the server uses for message ids. */
export const javaHash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
};

const field = (msg: string, tag: string) => msg.split("\n").find((l) => l.startsWith(tag))?.slice(tag.length).trim() ?? null;
const afterHeader = (msg: string) => {
  const a = msg.indexOf("\n");
  return a < 0 ? -1 : msg.indexOf("\n", a + 1);
};

export function parse(msg: string) {
  const b = afterHeader(msg);
  return { from: field(msg, "DA:") ?? "Sconosciuto", to: field(msg, "A:") ?? "", body: b < 0 ? "" : msg.slice(b + 1).trim() };
}

function messageId(msg: string) {
  const b = afterHeader(msg);
  if (b < 0) return String(javaHash(msg));
  return `${field(msg, "DA:") ?? "unknown"}_${field(msg, "A:") ?? "unknown"}_${javaHash(msg.slice(b + 1).trim())}`;
}

export function createMailServer(onChange: () => void = () => {}): MailServer {
  const messages: string[] = [];
  const delivered = new Map<string, Set<string>>();
  const active = new Map<string, Conn>();
  const out: string[] = [];
  let admin: string | null = null;
  const log = (s: string) => out.push(s);
  const seen = (who: string) => delivered.get(who) ?? delivered.set(who, new Set()).get(who)!;

  function request(input: string, conn: Conn) {
    if (!input) return;
    if (input.startsWith("CLIENT:")) {
      const who = input.slice("CLIENT:".length).trim().toLowerCase();
      if (who.includes(" role: admin")) {
        admin = who.replace(" role: admin", "").trim();
        active.set(admin, conn);
        log(`Andmin registrato: ${admin}`); // sic, as in ServerMain
      } else {
        if (active.has(who)) {
          active.delete(who);
          log(`Vecchia connessione chiusa per: ${who}`);
        }
        active.set(who, conn);
        log(`Client registrato: ${who}`);
        for (const msg of messages) {
          if (field(msg, "A:")?.toLowerCase() !== who || seen(who).has(messageId(msg))) continue;
          log(`Messaggio mandato: \n${msg}`);
          conn.deliver(msg);
          seen(who).add(messageId(msg));
        }
      }
    } else if (input.startsWith("DELETE_MESSAGE")) {
      const target = input.slice("DELETE_MESSAGE\n".length).trim();
      log(`Ricevuta richiesta di cancellazione per il messaggio:\n${target}`);
      for (let i = messages.length - 1; i >= 0; i--) if (messages[i].trim() === target) messages.splice(i, 1);
      log("Messaggio cancellato");
    } else {
      messages.push(input);
      log(`Messaggio ricevuto e salvato: \n${input}`);
      const to = field(input, "A:")?.toLowerCase() ?? null;
      const target = to ? active.get(to) : undefined;
      if (to && target) {
        const id = messageId(input);
        if (!seen(to).has(id)) {
          target.deliver(input);
          log(`Messaggio mandato a: ${to}`);
          seen(to).add(id);
        } else log(`Messaggio già consegnato a: ${to}`);
      }
      const adminConn = admin ? active.get(admin) : undefined;
      if (to && adminConn) {
        const line = `Log: ${field(input, "DA:") ?? "Sconosciuto"} ha mandato una mail a ${to}`;
        adminConn.deliver(line);
        log(`Log inviato all'admin: ${line}`);
      } else log(admin === null ? "Nessun admin connesso" : `Admin non raggiungibile: ${admin}`);
    }
    onChange();
  }

  function disconnect(email: string) {
    const who = email.toLowerCase();
    active.delete(who);
    log(`elimino in: ${who}`);
    if (delivered.delete(who)) log(`File del client eliminato: ${who}.txt`);
    onChange();
  }

  return { request, disconnect, console: out, messages };
}

/** ClientController.sendMail: one message per known recipient; unknown ones never reach the server. */
export function send(from: string, recipients: string, text: string, request: (input: string) => void) {
  const sent: string[] = [];
  const invalid: string[] = [];
  for (const r of recipients.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean)) {
    const user = USERS.find((u) => u.toLowerCase() === r.toLowerCase());
    if (!user) { invalid.push(r); continue; }
    if (!text) continue;
    request(`DA: ${from}\nA: ${user}\n${text}\n`);
    sent.push(user);
  }
  return { sent, invalid };
}
```

- [ ] **Step 4: Esegui e verifica che passi**

Run: `npm test`
Expected: `ok — email: delivery, queue, admin log, delete`.

- [ ] **Step 5: Implementa `socket.ts`**

```ts
import type { MailServer } from "./server";

const delay = () => 50 + Math.random() * 100;

/** A pretend TCP socket: every line travels with a little latency, so the round trip is visible. */
export function connect(server: MailServer, onText: (text: string) => void) {
  const conn = { deliver: (text: string) => void setTimeout(() => onText(text), delay()) };
  return {
    send: (input: string) => void setTimeout(() => server.request(input, conn), delay()),
    close: (email: string) => server.disconnect(email),
  };
}
```

- [ ] **Step 6: Implementa `RewriteNote.tsx`**

```tsx
import { labsHash } from "./route";

/** Says plainly that a demo is a rewrite, and where the original code is. */
export default function RewriteNote({ id, files }: { id: string; files: string[] }) {
  return (
    <p className="rewrite-note">
      Riscrittura in TypeScript di {files.map((f, i) => <span key={f}>{i ? ", " : ""}<code>{f}</code></span>)}: stessa logica, nel browser.{" "}
      <a href={labsHash(id, "codice")}>Il codice originale →</a>
    </p>
  );
}
```

- [ ] **Step 7: Implementa `EmailLab.tsx`**

```tsx
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import RewriteNote from "../RewriteNote";
import { ADMIN, createMailServer, parse, send, USERS, type MailServer } from "./server";
import { connect } from "./socket";

function ClientWindow({ server, email }: { server: MailServer; email: string }) {
  const [inbox, setInbox] = useState<string[]>([]);
  const [online, setOnline] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const sock = useMemo(() => connect(server, (t) => setInbox((b) => [t, ...b])), [server]);

  const login = () => { setInbox([]); sock.send(`CLIENT:${email}\n`); setOnline(true); };
  const logout = () => { sock.close(email); setOnline(false); setInbox([]); setOpen(null); };
  const submit = () => {
    const r = send(email, to, text, sock.send);
    setError(r.invalid.length ? `Email non valida: ${r.invalid.join(", ")}` : "");
    if (r.sent.length) { setTo(""); setText(""); }
  };
  const reply = (m: string) => { setTo(parse(m).from); setText("---- Reply ----\n"); };
  const forward = (m: string) => { setTo(""); setText(parse(m).body); };
  const remove = (i: number) => { sock.send(`DELETE_MESSAGE\n${inbox[i]}`); setInbox((b) => b.filter((_, j) => j !== i)); setOpen(null); };

  return (
    <section className="mail-win" aria-label={`Client di ${email}`}>
      <header className="mail-head"><b>{email}</b>
        <button className="chip" onClick={online ? logout : login}>{online ? "Esci" : "Entra"}</button>
      </header>
      {online ? (
        <>
          <ul className="mail-list">
            {inbox.length === 0 && <li className="empty">Nessun messaggio.</li>}
            {inbox.map((m, i) => (
              <li key={i}>
                <button className="mail-item" onClick={() => setOpen(open === i ? null : i)}>
                  <span>Da {parse(m).from}</span><span className="mail-preview">{parse(m).body.split("\n")[0]}</span>
                </button>
                {open === i && (
                  <div className="mail-open">
                    <pre>{parse(m).body}</pre>
                    <button className="chip" onClick={() => reply(m)}>Rispondi</button>
                    <button className="chip" onClick={() => forward(m)}>Inoltra</button>
                    <button className="chip" onClick={() => remove(i)}>Elimina</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="asd-form">
            <label className="asd-wide">A (separa con virgola)<input value={to} onChange={(e) => setTo(e.target.value)} placeholder={USERS.filter((u) => u !== email).join(", ")} /></label>
            <label className="asd-wide">Testo<textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} /></label>
            <button className="chip chip--on" onClick={submit}>Invia</button>
            {error && <span className="mail-error" role="alert">{error}</span>}
          </div>
        </>
      ) : (
        <p className="empty">Disconnesso. Premi «Entra» per collegarti al server.</p>
      )}
    </section>
  );
}

function AdminWindow({ server }: { server: MailServer }) {
  const [logs, setLogs] = useState<string[]>([]);
  useEffect(() => {
    connect(server, (t) => setLogs((l) => [...l, t])).send(`CLIENT:${ADMIN} role: admin\n`);
  }, [server]);
  return (
    <section className="mail-win" aria-label="Pannello admin">
      <header className="mail-head"><b>{ADMIN}</b><span className="demo-badge">admin</span></header>
      <ul className="mail-list">{logs.length ? logs.map((l, i) => <li key={i}>{l}</li>) : <li className="empty">Nessun log.</li>}</ul>
      <h4>Console del server</h4>
      <pre className="asd-term mail-console">{server.console.join("\n")}</pre>
    </section>
  );
}

export default function EmailLab({ id }: { id: string }) {
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const ref = useRef<MailServer>();
  const server = (ref.current ??= createMailServer(redraw));
  const [giacomo, setGiacomo] = useState(false);
  return (
    <div className="mail">
      <p>Due client e l'admin, collegati allo stesso server. Entra con entrambi, scrivi a <code>laura@example.com</code> o a <code>giacomo@example.com</code>, che non è collegato: la sua posta resta in coda finché non entra.</p>
      <div className="mail-grid">
        <ClientWindow server={server} email={USERS[0]} />
        <ClientWindow server={server} email={USERS[1]} />
        <AdminWindow server={server} />
        {giacomo ? <ClientWindow server={server} email={USERS[2]} /> : <button className="chip" onClick={() => setGiacomo(true)}>Apri Giacomo</button>}
      </div>
      <RewriteNote id={id} files={["ServerMain.java", "ClientController.java", "AdminController.java"]} />
    </div>
  );
}
```

- [ ] **Step 8: Registra la demo, gli stili e il test di pagina**

`src/types.ts`: aggiungi `| "email"` all'unione `lab`.
`src/labs/LabsPage.tsx`: `DEMOS` → `email: lazy(() => import("./email/EmailLab")),`; `TRY` → `email: "manda una mail"`.
`src/data/projects.ts`: nel progetto `client-email` aggiungi `lab: 'email',`.
`scripts/check-labs.mjs`: nel `deepEqual` dei lab aggiungi `["client-email", "email"]` subito dopo `["catering", "sql"]` (l'array è ordinato alfabeticamente).
In fondo a `src/labs/labs.css`:

```css
.mail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr)); gap: 16px; align-items: start; }
.mail-win { border: 1px solid var(--line); border-radius: var(--r-sm); padding: 12px; background: var(--glass); min-width: 0; }
.mail-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; word-break: break-all; }
.mail-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; max-height: 240px; overflow: auto; font-size: 13px; }
.mail-item { display: grid; width: 100%; text-align: left; font: inherit; color: inherit; background: none; border: 1px solid var(--line-soft); border-radius: 6px; padding: 6px 8px; cursor: pointer; }
.mail-preview { color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mail-open pre { white-space: pre-wrap; margin: 8px 0; }
.mail-open .chip { margin-right: 6px; }
.mail-error { color: #ff8a80; font-size: 13px; }
.mail-console { max-height: 200px; font-size: 11px; }
```

- [ ] **Step 9: Verifica**

Run: `npm test && npx tsc --noEmit -p .`
Expected: tutte le righe `ok`, nessun errore di tipo.

- [ ] **Step 10: Commit**

```bash
git add src/labs/email src/labs/RewriteNote.tsx src/types.ts src/labs/LabsPage.tsx src/data/projects.ts src/labs/labs.css scripts/check-labs.mjs
git commit -m "Laboratori: Client Email, due client e l'admin sullo stesso server

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Centrale nucleare — motore

**Files:**
- Create: `src/labs/so/engine.ts`
- Modify: `scripts/check-labs.mjs`

**Interfaces:**
- Produces: `TICKS = 10` (tick per secondo simulato); `type Params = { NATOM; N_MAX_ATOM; N_MIN_ATOM; ENERGY_DEMAND; ENERGY_EXPLODE_THRESHOLD; SIM_DURATION; N_NUOVI_ATOMI; STEP_MS; MAX_PROCESSI; seed }` (tutti `number`); `ORIGINALI: Params` (i `#define`, `STEP_MS: 0.5`); `RALLENTATA: Params` (default della pagina, `STEP_MS: 500`); `type Outcome = "EXPLODE" | "BLACKOUT" | "MELTDOWN" | "Tempo scaduto"`; `type Shared`; `type Sim` (campi pubblici usati dalla UI: `p`, `d`, `tick`, `waiting: number[]`, `out: string[]`, `outcome: Outcome | null`, `inhibitor: boolean`, `fissions: number`); `PID_INIBITORE = 4242`; `energy(d: Shared, n1: number, n2: number): void`; `cRand(seed: number, second: number, k?: number): number`; `createSim(p: Params): Sim`; `step(s: Sim): void`; `usr2(s: Sim): void`; `procs(s: Sim): number`.

Comportamento originale (dai sorgenti C, già letti):
- `Atomo.c`: `srand(time(NULL))`, `n = rand() % temp + 1`, `Energy(temp, temp-n)`; scoria se `n <= N_MIN_ATOM`, altrimenti aspetta `data->attivatore == 0` e forka un figlio `Atomo(temp-n)` (`scissioni++`, `index++`), poi termina.
- `srand(time(NULL))` in ogni processo: i processi nati nello stesso secondo estraggono gli stessi numeri. `cRand(seed, second, k)` è il k-esimo `rand()` del secondo `second`.
- `Attivatore.c`: il ciclo mette `attivatore = 0`, dorme 2 s, rimette 1 e ricomincia: la finestra è aperta quasi sempre. Solo dopo un SIGUSR1 (`attiva`) resta chiusa, con `logInibitore++` per ogni secondo d'attesa e il 5 % al secondo di sbloccarsi.
- `Inibitore.c`: `SIGUSR2` alterna attivo/disattivo; attivo → `data->Inibitore = 1` e SIGUSR1 all'attivatore ogni secondo. `data->Inibitore` non torna mai a 0: si replica.
- `Alimentazione.c`: ogni `STEP` (500000 ns = 0,5 ms) forka `N_NUOVI_ATOMI` atomi con `temp = rand() % (N_MAX_ATOM + 1)`: 200 000 atomi al secondo, il fork fallisce e scatta MELTDOWN.

- [ ] **Step 1: Scrivi il test che fallisce**

In `scripts/check-labs.mjs`, subito dopo `console.log("ok — email: delivery, queue, admin log, delete");`:

```js
  /* Centrale nucleare: the engine against Atomo.c and Master.c */
  const so = await vite.ssrLoadModule("/src/labs/so/engine.ts");
  const d0 = () => ({ energy: 0, index: 0, Scorie: 0, attivatore: 1, scissioni: 0, energyRubata: 0, logInibitore: 0, Inibitore: 0 });
  let d = d0(); so.energy(d, 10, 7); assert.equal(d.energy, 60, "Energy(10,7) = 70-10");
  d = d0(); so.energy(d, 5, 5); assert.equal(d.energy, 20, "Energy(5,5) = 25-5");
  d = { ...d0(), energy: 100, Inibitore: 1 }; so.energy(d, 10, 7);
  assert.deepEqual([d.energy, d.energyRubata], [65, 94], "inhibitor: (100+60)/1.7 stolen, int truncation");
  assert.equal(so.cRand(1, 3), so.cRand(1, 3), "same second, same rand()");
  const runTo = (over, secs = 200) => {
    const s = so.createSim({ ...so.RALLENTATA, ...over });
    for (let i = 0; i < secs * so.TICKS && !s.outcome; i++) so.step(s);
    return s;
  };
  assert.equal(runTo({ ENERGY_EXPLODE_THRESHOLD: -1e12, ENERGY_DEMAND: 0 }).outcome, "EXPLODE");
  assert.equal(runTo({ ENERGY_DEMAND: 1e12, ENERGY_EXPLODE_THRESHOLD: 1e15, N_NUOVI_ATOMI: 0 }).outcome, "BLACKOUT");
  assert.equal(runTo({ MAX_PROCESSI: 10 }).outcome, "MELTDOWN", "500 initial atoms cannot fork under ulimit 10");
  assert.equal(runTo({ NATOM: 0, N_NUOVI_ATOMI: 0, ENERGY_DEMAND: 0, SIM_DURATION: 2 }).outcome, "Tempo scaduto");
  assert.equal(runTo(so.ORIGINALI, 5).outcome, "MELTDOWN", "the original STEP of 0.5 ms forks past any ulimit");
  // extreme sliders still end, never NaN (N_MAX_ATOM 0: every atom has temp 0)
  for (const over of [{ NATOM: 0 }, { N_NUOVI_ATOMI: 0, NATOM: 0, SIM_DURATION: 3 }, { MAX_PROCESSI: 5 }, { N_MAX_ATOM: 0 }]) {
    const s = runTo(over);
    assert.ok(s.outcome, `no outcome for ${JSON.stringify(over)}`);
    assert.ok(Number.isFinite(s.d.energy), `energy is ${s.d.energy} for ${JSON.stringify(over)}`);
  }
  // the report is Master.c's printf block, line by line
  const masterC = readFileSync(labs("so-centrale/code/Master.c"), "utf8");
  const loop = masterC.slice(masterC.indexOf("while(1){"));
  const fmts = [...loop.matchAll(/printf\("((?:[^"\\]|\\.)*)"/g)].map((m) => m[1].replace(/\\n$/, "")).slice(0, 13);
  const rep = runTo({ SIM_DURATION: 2, ENERGY_DEMAND: 0, ENERGY_EXPLODE_THRESHOLD: 1e15, N_NUOVI_ATOMI: 0, NATOM: 0 });
  const at = rep.out.indexOf(fmts[0]);
  assert.ok(at >= 0, "no report in the output");
  fmts.forEach((f, i) => {
    const re = new RegExp("^" + f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%d/g, "-?\\d+") + "$");
    assert.ok(re.test(rep.out[at + i]), `report line ${i}: "${rep.out[at + i]}" vs printf("${f}")`);
  });
  console.log("ok — centrale: Atomo.c energy, the four outcomes, Master.c report");
```

- [ ] **Step 2: Esegui e verifica che fallisca**

Run: `npm test`
Expected: FAIL con errore di import di `/src/labs/so/engine.ts`.

- [ ] **Step 3: Implementa `engine.ts`**

```ts
/** Rewrite of Progetto-SO-centrale-nucleare (Master.c, Atomo.c, Attivatore.c, Alimentazione.c,
 *  Inibitore.c): the shared memory is `d`, each process is a rule applied once per tick. */
export const TICKS = 10; // ticks per simulated second

export type Params = {
  NATOM: number; N_MAX_ATOM: number; N_MIN_ATOM: number; ENERGY_DEMAND: number;
  ENERGY_EXPLODE_THRESHOLD: number; SIM_DURATION: number; N_NUOVI_ATOMI: number;
  /** Alimentazione's nanosleep, in ms (STEP 500000 ns = 0.5 ms). */
  STEP_MS: number;
  /** The VM's process limit (ulimit -u): fork fails past it, and that is MELTDOWN. */
  MAX_PROCESSI: number;
  seed: number;
};
/** The #define values. With STEP 0.5 ms Alimentazione forks 200 000 atoms a second: MELTDOWN at once. */
export const ORIGINALI: Params = {
  NATOM: 500, N_MAX_ATOM: 80, N_MIN_ATOM: 2, ENERGY_DEMAND: 200000, ENERGY_EXPLODE_THRESHOLD: 3000000,
  SIM_DURATION: 60, N_NUOVI_ATOMI: 100, STEP_MS: 0.5, MAX_PROCESSI: 4000, seed: 20261015,
};
/** Same program, Alimentazione slowed down so the reaction can be watched. */
export const RALLENTATA: Params = { ...ORIGINALI, STEP_MS: 500 };

export type Outcome = "EXPLODE" | "BLACKOUT" | "MELTDOWN" | "Tempo scaduto";
/** struct shared_data, minus the fields no process reads. */
export type Shared = { energy: number; index: number; Scorie: number; attivatore: number; scissioni: number; energyRubata: number; logInibitore: number; Inibitore: number };
export type Sim = {
  p: Params; d: Shared; tick: number;
  /** temp of each atom that drew its n and waits for the activator before splitting */
  waiting: number[];
  out: string[]; outcome: Outcome | null;
  inhibitor: boolean;
  /** fissions in the last tick, for the flash on the canvas */
  fissions: number;
  // Master's locals, Attivatore's flags, Alimentazione's fractional batches
  energyTemp: number; scissioniTemp: number; scorieTemp: number; usoTot: number;
  attiva: boolean; blocked: boolean; feedCarry: number;
};
export const PID_INIBITORE = 4242;
const SEP = "____________________________________________";

/** srand(time(NULL)) in every process: the k-th rand() of a given second is the same for all of them. */
export function cRand(seed: number, second: number, k = 0): number {
  let a = (Math.imul(seed, 31) + second) >>> 0;
  let v = 0;
  for (let i = 0; i <= k; i++) {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    v = ((t ^ (t >>> 14)) >>> 0) >>> 1; // 0..RAND_MAX (2^31-1)
  }
  return v;
}

/** Atomo.c Energy(n1, n2), int arithmetic included. */
export function energy(d: Shared, n1: number, n2: number): void {
  const freed = n1 * n2 - Math.max(n1, n2);
  if (d.Inibitore) {
    const x = d.energy + freed;
    d.energyRubata = Math.trunc(d.energyRubata + x / 1.7);
    d.energy = Math.trunc(x - x / 1.7);
  } else d.energy += freed;
}

const second = (s: Sim) => Math.floor(s.tick / TICKS);
/** Master, Attivatore, Alimentazione, Inibitore, plus every atom alive. */
export const procs = (s: Sim) => 4 + s.waiting.length;

function end(s: Sim, o: Outcome) {
  if (s.outcome) return;
  s.outcome = o;
  s.out.push(o);
}

/** fork(): fails past the process limit. */
function canFork(s: Sim, n: number): boolean {
  if (procs(s) + n >= s.p.MAX_PROCESSI) {
    end(s, "MELTDOWN");
    return false;
  }
  return true;
}

/** Atomo.c main(): draw n, release energy, become waste or wait for the activator. */
function atom(s: Sim, temp: number) {
  if (temp <= 0) return; // rand() % 0: SIGFPE, the process dies before doing anything
  const n = (cRand(s.p.seed, second(s)) % temp) + 1;
  energy(s.d, temp, temp - n);
  if (n <= s.p.N_MIN_ATOM) s.d.Scorie++;
  else s.waiting.push(temp - n);
}

/** fork() + execve("Atomo") for each temp; the child does index++ before execve. */
function spawn(s: Sim, temps: number[]) {
  if (!canFork(s, temps.length)) return;
  s.d.index += temps.length;
  for (const t of temps) atom(s, t);
}

export function createSim(p: Params): Sim {
  const s: Sim = {
    p, d: { energy: 0, index: 0, Scorie: 0, attivatore: 1, scissioni: 0, energyRubata: 0, logInibitore: 0, Inibitore: 0 },
    tick: 0, waiting: [], out: ["LOADING PROCESSES"], outcome: null, inhibitor: false, fissions: 0,
    energyTemp: 0, scissioniTemp: 0, scorieTemp: 0, usoTot: p.ENERGY_DEMAND, attiva: false, blocked: false, feedCarry: 0,
  };
  // Master: NATOM atoms, temp = rand() % (N_MAX_ATOM - 20 + 1) + 20 (all in second 0: the same temp)
  const temp = p.N_MAX_ATOM >= 20 ? (cRand(p.seed, 0) % (p.N_MAX_ATOM - 20 + 1)) + 20 : 0;
  if (p.NATOM > 0) spawn(s, Array.from({ length: p.NATOM }, () => temp));
  if (s.outcome) return s;
  s.d.index += 3; // Attivatore, Alimentazione and Inibitore each do index++
  s.out.push("LOADING PROCESSES", `Pid Inibitore->${PID_INIBITORE}`);
  return s;
}

/** kill -USR2 <pid inibitore>, as typed in a second terminal. */
export function usr2(s: Sim) {
  s.inhibitor = !s.inhibitor;
  s.out.push(`_${SEP}Inibitore ${s.inhibitor ? "Attivato" : "Disattivato"}`);
}

function report(s: Sim) {
  const { d, p } = s;
  s.out.push(
    SEP,
    `Energia tot-> ${s.energyTemp}`,
    `Energia ultimo secondo-> ${d.energy}`,
    `Energia richiesta tot->${s.usoTot}`,
    `Energia richiesta ultimo secondo->${p.ENERGY_DEMAND}`,
    `Numero di Atomi->${d.index} `,
    `Numero di Scissioni tot->${d.scissioni} `,
    `Numero di Scissioni ultimo secondo->${d.scissioni - s.scissioniTemp} `,
    `Numero di Atomi scorie totali->${d.Scorie}`,
    `Numero di Atomi scorie ultimo secondo->${d.Scorie - s.scorieTemp}`,
    `Attivazioni interrotte da Inibitore->${d.logInibitore}`,
    `Energia presa da Inibitore->${d.energyRubata}`,
    SEP,
  );
  s.energyTemp = d.energy + s.energyTemp;
  s.scissioniTemp = d.scissioni;
  s.scorieTemp = d.Scorie;
  s.usoTot += p.ENERGY_DEMAND;
  if (d.energy > p.ENERGY_EXPLODE_THRESHOLD) return end(s, "EXPLODE");
  d.energy -= p.ENERGY_DEMAND;
  if (d.energy < 0) return end(s, "BLACKOUT");
  s.out.push("");
}

/** One tick: Inibitore, Attivatore, Alimentazione, the fissions, then Master on the second. */
export function step(s: Sim): void {
  if (s.outcome) return;
  s.tick++;
  s.fissions = 0;
  const sec = second(s);
  const onSecond = s.tick % TICKS === 0;

  // Inibitore: while active, Inibitore = 1 (never reset, as in the original) and SIGUSR1 every second
  if (s.inhibitor && onSecond) { s.d.Inibitore = 1; s.attiva = true; }

  // Attivatore: the window is open unless SIGUSR1 caught it at the top of its 2-second loop
  const loopTop = s.tick % (2 * TICKS) === 0;
  if (loopTop && s.attiva) s.blocked = true;
  if (s.blocked && onSecond) {
    s.d.logInibitore++;
    if ((cRand(s.p.seed, sec, 1) % 1000) + 1 <= 50) { s.blocked = false; s.attiva = false; }
  }
  s.d.attivatore = s.blocked ? 1 : 0;
  if (!s.blocked && loopTop) s.out.push(`${SEP}Attivatore ha attivato la scissione`);

  // Alimentazione: N_NUOVI_ATOMI every STEP_MS, fractions carried between ticks
  s.feedCarry += 1000 / TICKS / s.p.STEP_MS;
  const batches = Math.floor(s.feedCarry);
  s.feedCarry -= batches;
  const fresh = batches * s.p.N_NUOVI_ATOMI;
  if (fresh > 0) {
    if (!canFork(s, fresh)) return; // checked before building the array: 20 000 atoms a tick with the original STEP
    const temp = cRand(s.p.seed, sec) % (s.p.N_MAX_ATOM + 1);
    spawn(s, Array.from({ length: fresh }, () => temp));
  }

  // fissions: every waiting atom forks one child Atomo(temp - n) and exits; chains end within the tick
  while (s.d.attivatore === 0 && s.waiting.length && !s.outcome) {
    const parents = s.waiting;
    s.waiting = [];
    s.d.scissioni += parents.length;
    s.fissions += parents.length;
    spawn(s, parents);
  }
  if (s.outcome) return;

  if (onSecond) {
    if (sec >= s.p.SIM_DURATION) return end(s, "Tempo scaduto");
    report(s);
  }
}
```

Nota: `temp - n` è sempre minore di `temp` (perché `n ≥ 1`), quindi il ciclo delle scissioni termina.

- [ ] **Step 4: Esegui e verifica che passi**

Run: `npm test`
Expected: `ok — centrale: Atomo.c energy, the four outcomes, Master.c report`.
Se fallisce una riga del report, correggi il testo in `report()` copiando il `printf` di `Master.c`, non il regex del test. Se fallisce `inhibitor: … [65, 94]`, ricontrolla `energy()` rispetto ad `Atomo.c`: `energyRubata` ed `energy` sono calcolati entrambi da `x = data->energy + freed`.

- [ ] **Step 5: Commit**

```bash
git add src/labs/so/engine.ts scripts/check-labs.mjs
git commit -m "Laboratori: motore della centrale nucleare, fedele ai sorgenti C

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Centrale nucleare — pagina (terminale + vista animata)

**Files:**
- Create: `src/labs/so/SoLab.tsx`, `src/labs/so/canvas.ts`
- Modify: `src/types.ts`, `src/labs/LabsPage.tsx`, `src/data/projects.ts` (progetto `so-centrale`), `src/labs/labs.css`, `scripts/check-labs.mjs` (lista dei lab)

**Interfaces:**
- Consumes: da `engine.ts` `TICKS`, `Params`, `ORIGINALI`, `RALLENTATA`, `Sim`, `createSim`, `step`, `usr2`, `procs`, `PID_INIBITORE`; `RewriteNote` dal Task 3.
- Produces: `draw(ctx: CanvasRenderingContext2D, s: Sim, w: number, h: number): void` in `canvas.ts`.

- [ ] **Step 1: Aggiorna il test (fallisce)**

`src/types.ts`: aggiungi `| "so"` all'unione `lab`. In `scripts/check-labs.mjs`, nel `deepEqual` dei lab, aggiungi `["so-centrale", "so"]` dopo `["mtdi", "mtdi"]`.

Run: `npm test`
Expected: FAIL sul `deepEqual`.

- [ ] **Step 2: Implementa `canvas.ts`**

```ts
import type { Sim } from "./engine";

const MAX_DOTS = 2000;

/** Waiting atoms as dots (hue by temp), a flash on fission, and the energy bar with demand and threshold. */
export function draw(ctx: CanvasRenderingContext2D, s: Sim, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const barH = 28;
  const area = h - barH - 12;
  const every = Math.ceil(s.waiting.length / MAX_DOTS) || 1;
  for (let i = 0; i < s.waiting.length; i += every) {
    // stable position from the index, so dots do not jump between frames
    const x = (((i * 2654435761) >>> 0) % 1000) / 1000 * (w - 8) + 4;
    const y = ((i * 40503) % 997) / 997 * (area - 8) + 4;
    ctx.fillStyle = `hsl(${200 - Math.min(s.waiting[i], 80) * 2.5}, 80%, 60%)`;
    ctx.fillRect(x, y, 3, 3);
  }
  if (s.fissions) {
    ctx.fillStyle = `rgba(255, 210, 120, ${Math.min(0.35, s.fissions / 2000)})`;
    ctx.fillRect(0, 0, w, area);
  }
  const { energy } = s.d;
  const { ENERGY_DEMAND: demand, ENERGY_EXPLODE_THRESHOLD: limit } = s.p;
  const scale = Math.max(limit, demand, energy, 1);
  const y0 = h - barH;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(0, y0, w, barH);
  ctx.fillStyle = energy > limit ? "#ff6b5b" : energy < demand ? "#7aa7ff" : "#e3b04b";
  ctx.fillRect(0, y0, (Math.max(energy, 0) / scale) * w, barH);
  for (const [v, c] of [[demand, "#7aa7ff"], [limit, "#ff6b5b"]] as const) {
    ctx.fillStyle = c;
    ctx.fillRect((Math.max(v, 0) / scale) * w - 1, y0 - 4, 2, barH + 4);
  }
}
```

- [ ] **Step 3: Implementa `SoLab.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";
import RewriteNote from "../RewriteNote";
import { draw } from "./canvas";
import { createSim, ORIGINALI, PID_INIBITORE, procs, RALLENTATA, step, TICKS, usr2, type Params, type Sim } from "./engine";

const SLIDERS: [keyof Params, string, number, number, number][] = [
  ["NATOM", "NATOM", 0, 2000, 10],
  ["N_NUOVI_ATOMI", "N_NUOVI_ATOMI", 0, 500, 10],
  ["STEP_MS", "STEP di Alimentazione (ms)", 0.5, 2000, 0.5],
  ["ENERGY_DEMAND", "ENERGY_DEMAND", 0, 1000000, 10000],
  ["ENERGY_EXPLODE_THRESHOLD", "ENERGY_EXPLODE_THRESHOLD", 100000, 20000000, 100000],
  ["SIM_DURATION", "SIM_DURATION (s)", 5, 120, 5],
  ["MAX_PROCESSI", "limite processi (ulimit -u)", 100, 20000, 100],
];
const MAX_LINES = 3000;

export default function SoLab({ id }: { id: string }) {
  const [params, setParams] = useState<Params>(RALLENTATA);
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(false);
  const [, setFrame] = useState(0);
  const sim = useRef<Sim>(createSim(RALLENTATA));
  const canvas = useRef<HTMLCanvasElement>(null);
  const term = useRef<HTMLPreElement>(null);

  const reset = (p: Params) => { setParams(p); sim.current = createSim(p); setRunning(false); setFrame((f) => f + 1); };

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    let carry = 0;
    const loop = (now: number) => {
      carry += ((now - last) / 1000) * TICKS * speed;
      last = now;
      for (; carry >= 1 && !sim.current.outcome; carry--) step(sim.current);
      const out = sim.current.out;
      if (out.length > MAX_LINES) out.splice(0, out.length - MAX_LINES);
      setFrame((f) => f + 1);
      if (sim.current.outcome) setRunning(false);
      else raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, speed]);

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) draw(ctx, sim.current, c.width, c.height);
    if (term.current) term.current.scrollTop = term.current.scrollHeight;
  });

  const s = sim.current;
  const set = (k: keyof Params, v: number) => reset({ ...params, [k]: v });

  return (
    <div className="so">
      <div className="asd-form">
        {SLIDERS.map(([k, label, min, max, by]) => (
          <label key={k}>{label}: <b>{params[k]}</b>
            <input type="range" min={min} max={max} step={by} value={params[k]} onChange={(e) => set(k, Number(e.target.value))} />
          </label>
        ))}
        <label>seme<input type="number" value={params.seed} onChange={(e) => set("seed", Number(e.target.value) || 1)} /></label>
      </div>
      <div className="so-actions">
        <button className="chip chip--on" onClick={() => setRunning((r) => !r)} disabled={!!s.outcome}>{running ? "Stop" : "Avvia"}</button>
        <button className="chip" onClick={() => reset(params)}>Ricomincia</button>
        <button className="chip" onClick={() => { usr2(s); setFrame((f) => f + 1); }} disabled={!!s.outcome}>kill -USR2 {PID_INIBITORE}</button>
        {[1, 4, 16].map((x) => <button key={x} className={`chip${speed === x ? " chip--on" : ""}`} onClick={() => setSpeed(x)}>{x}×</button>)}
        <button className="chip" onClick={() => reset(ORIGINALI)}>Valori originali</button>
        <button className="chip" onClick={() => reset(RALLENTATA)}>Rallentata</button>
      </div>
      <p className="rewrite-note">Con i valori originali Alimentazione crea 100 atomi ogni 0,5 ms: il limite dei processi si esaurisce subito ed è MELTDOWN, come nella VM. «Rallentata» allunga solo quella pausa.</p>
      <div className="so-grid">
        <pre ref={term} className="asd-term so-term">{s.out.join("\n")}</pre>
        <div>
          <canvas ref={canvas} className="so-canvas" width={480} height={320} aria-label="Atomi in attesa di scissione ed energia" />
          <dl className="so-stats">
            <dt>secondo</dt><dd>{Math.floor(s.tick / TICKS)}</dd>
            <dt>processi</dt><dd>{procs(s)}</dd>
            <dt>energia</dt><dd>{s.d.energy}</dd>
            <dt>inibitore</dt><dd>{s.inhibitor ? "attivo" : "spento"}</dd>
            <dt>esito</dt><dd>{s.outcome ?? "—"}</dd>
          </dl>
        </div>
      </div>
      <RewriteNote id={id} files={["Master.c", "Atomo.c", "Attivatore.c", "Alimentazione.c", "Inibitore.c"]} />
    </div>
  );
}
```

- [ ] **Step 4: Registra la demo e gli stili**

`src/labs/LabsPage.tsx`: `DEMOS` → `so: lazy(() => import("./so/SoLab")),`; `TRY` → `so: "avvia la simulazione"`.
`src/data/projects.ts`: nel progetto `so-centrale` aggiungi `lab: 'so',`.
In fondo a `src/labs/labs.css`:

```css
.so-actions { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.so-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; }
@media (max-width: 720px) { .so-grid { grid-template-columns: minmax(0, 1fr); } }
.so-term { height: 360px; max-height: none; font-size: 12px; }
.so-canvas { width: 100%; height: auto; background: #0b0b0b; border: 1px solid var(--line-soft); border-radius: var(--r-sm); }
.so-stats { display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; font: 12px var(--font-mono); margin: 8px 0 0; }
.so-stats dd { margin: 0; }
```

- [ ] **Step 5: Verifica**

Run: `npm test && npx tsc --noEmit -p .`
Expected: tutte le righe `ok`, nessun errore di tipo.

- [ ] **Step 6: Verifica a mano nel browser**

Run: `npm run dev` (in background), apri `/#/progetti/so-centrale/prova`.
Expected:
- **Avvia** con «Rallentata» → un blocco del Master al secondo nel terminale, il canvas si muove;
- `kill -USR2 4242` → riga "Inibitore Attivato", poi crescono "Attivazioni interrotte da Inibitore" ed "Energia presa da Inibitore";
- **Valori originali** + **Avvia** → MELTDOWN entro il primo secondo;
- a 360 px le colonne si impilano, nessuno scroll orizzontale.

- [ ] **Step 7: Commit**

```bash
git add src/labs/so src/types.ts src/labs/LabsPage.tsx src/data/projects.ts src/labs/labs.css scripts/check-labs.mjs
git commit -m "Laboratori: centrale nucleare, terminale e vista animata

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: LFT — build del jar con il driver `LabMain`

<!-- spike 2026-10-15: LOADER=https://cjrtnc.leaningtech.com/4.3/loader.js, relativo→/files/ (user.dir ignorato), /str→sì, jasmin -d→sì (stampa "Generated: …" su stdout) -->
Esito dello spike: caso **A = `/files/`**. In `LabMain`, `rel` è `new File("/files/Output.j")`; in Node (dove `/files/` non esiste) resta valida la copia da `new File("Output.j").getAbsoluteFile()`, quindi `LabMain` prova entrambe.

**Files:**
- Create: `scripts/labs/lft/LabMain.java`, `scripts/labs/lft.mjs`
- Modify: `scripts/labs/sources.mjs` (voce `lft`), `scripts/labs/index.mjs` (passo `lft`), `scripts/check-labs.mjs`
- Output (committato): `public/labs/lft/lft.jar`, `public/labs/lft/jasmin.jar`

**Interfaces:**
- Produces: `public/labs/lft/lft.jar` con le classi di LFT-5.2 e `LabMain`. `LabMain.main(new String[] { in, work })`: `in` è un **prefisso** di percorso (`in + "text.txt"`, `in + "input.txt"`; in CheerpJ sarà `/str/lftN-`, in Node una cartella con `/` finale); `work` è una cartella scrivibile con `/` finale, dove finiscono `out.txt`, `Output.j`, `Output.class`. `out.txt` contiene `Input OK` seguito dall'output del programma, oppure una riga `ERRORE <messaggio>`.

- [ ] **Step 1: Scrivi il test che fallisce**

In cima a `scripts/check-labs.mjs` estendi gli import: `node:fs` aggiunge `mkdirSync, mkdtempSync, writeFileSync`; aggiungi
`import { execFileSync } from "node:child_process";`, `import { tmpdir } from "node:os";`, `import { delimiter, join as pjoin } from "node:path";`, `import { fileURLToPath } from "node:url";`.

Poi, subito dopo `console.log("ok — centrale: Atomo.c energy, the four outcomes, Master.c report");`:

```js
  /* LFT: the original Translator + Jasmin, driven by LabMain, on a real JVM when there is one */
  assert.ok(existsSync(labs("lft/lft.jar")) && existsSync(labs("lft/jasmin.jar")), "run npm run labs -- lft");
  let java = true;
  try { execFileSync("java", ["-version"], { stdio: "ignore" }); } catch { java = false; }
  if (java) {
    const runLft = (program, input) => {
      const dir = mkdtempSync(pjoin(tmpdir(), "lft-"));
      const inDir = pjoin(dir, "in") + "/";
      const work = pjoin(dir, "work") + "/";
      mkdirSync(inDir);
      mkdirSync(work);
      writeFileSync(inDir + "text.txt", program);
      writeFileSync(inDir + "input.txt", input);
      const cp = ["lft/lft.jar", "lft/jasmin.jar"].map((p) => fileURLToPath(labs(p))).join(delimiter);
      execFileSync("java", ["-cp", cp, "LabMain", inDir, work], { cwd: work, timeout: 30000 });
      return { out: readFileSync(work + "out.txt", "utf8"), j: existsSync(work + "Output.j") ? readFileSync(work + "Output.j", "utf8") : "" };
    };
    const sample = readFileSync(labs("lft/code/LFT-5.2/src/text.txt"), "utf8");
    const a = runLft(sample, "25\n");
    assert.match(a.out, /Input OK/);
    assert.match(a.out, /^125\r?$/m, "25 is > 20 and not > 30: prints 25+100");
    assert.equal(a.j.replace(/\r/g, ""), readFileSync(labs("lft/code/LFT-5.2/src/Output.j"), "utf8").replace(/\r/g, ""), "same Jasmin as the handed-in Output.j");
    assert.match(runLft(sample, "15\n").out, /^15\r?$/m);
    assert.match(runLft("read(x; print(x) end", "").out, /^ERRORE /m, "syntax errors surface");
    assert.match(runLft("read(x);\nread(y);\nprint(+(x,y))", "2\n3\n").out, /^5\r?$/m, "two read() in a row, one Scanner each");
    console.log("ok — lft: Translator → Jasmin → Output on a real JVM");
  } else console.log("skip — lft: no java on PATH, only the jars were checked");
```

Se il `Translator` rifiuta la sintassi del terzo programma (`read(x);` seguito da `read(y);`, vedi `stat()` in `Translator.java`), riscrivilo nella sintassi accettata mantenendo due `read()` consecutive.

- [ ] **Step 2: Esegui e verifica che fallisca**

Run: `npm test`
Expected: FAIL con `run npm run labs -- lft`.

- [ ] **Step 3: Scrivi `LabMain.java`**

`scripts/labs/lft/LabMain.java`:

```java
import java.io.*;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.URL;
import java.net.URLClassLoader;

/** Demo driver, not part of the course project: runs the handed-in Translator, then Jasmin,
 *  then the generated Output, with absolute paths so it works inside CheerpJ's file system. */
public class LabMain {
    /** One line per read and nothing "available": Output.read() makes a new Scanner each time,
     *  and a Scanner that buffered the whole input would leave nothing for the next one. */
    static class LineAtATime extends InputStream {
        private final InputStream in;
        LineAtATime(InputStream in) { this.in = in; }
        @Override public int read() throws IOException { return in.read(); }
        @Override public int available() { return 0; }
        @Override public int read(byte[] b, int off, int len) throws IOException {
            int n = 0;
            while (n < len) {
                int c = in.read();
                if (c < 0) return n == 0 ? -1 : n;
                b[off + n++] = (byte) c;
                if (c == '\n') break;
            }
            return n;
        }
    }

    public static void main(String[] args) throws Exception {
        String in = args[0], work = args[1];
        new File(work).mkdirs();
        PrintStream out = new PrintStream(new FileOutputStream(work + "out.txt"), true);
        System.setOut(out);
        System.setErr(out);
        System.setProperty("user.dir", work);
        try {
            new Translator(new Lexer(), new BufferedReader(new FileReader(in + "text.txt"))).prog();
            out.println("Input OK");
        } catch (Error e) {
            out.println("ERRORE " + e.getMessage());
            return;
        }
        // CodeGenerator writes "Output.j" relative to the working directory
        File j = new File(work + "Output.j");
        File rel = new File("Output.j").getAbsoluteFile();
        if (!j.exists() && rel.exists()) copy(rel, j);
        jasmin.Main.main(new String[] { "-d", work, j.getPath() });
        System.setIn(new LineAtATime(new FileInputStream(in + "input.txt")));
        try (URLClassLoader cl = new URLClassLoader(new URL[] { new File(work).toURI().toURL() })) {
            Method m = cl.loadClass("Output").getMethod("main", String[].class);
            m.invoke(null, (Object) new String[0]);
        } catch (InvocationTargetException e) {
            out.println("ERRORE " + e.getCause());
        }
    }

    static void copy(File from, File to) throws IOException {
        try (InputStream i = new FileInputStream(from); OutputStream o = new FileOutputStream(to)) {
            byte[] buf = new byte[8192];
            for (int n; (n = i.read(buf)) > 0; ) o.write(buf, 0, n);
        }
    }
}
```

Adattamenti dallo spike: con **A** = `/files/`, `rel` diventa `new File("/files/Output.j")`; con **C** = no, togli `"-d", work,`.

- [ ] **Step 4: Scrivi la build `lft.mjs` e registrala**

`scripts/labs/sources.mjs`, sostituisci la voce `lft`:

```js
  lft: { dir: join(UNI, "LFT-consegne-SalvatorePierri"), jdk: "C:/Program Files/Java/jdk-17/bin" },
```

`scripts/labs/lft.mjs`:

```js
import { execFileSync } from "node:child_process";
import { copyFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { ensureDir, outDir, ROOT, TMP } from "./util.mjs";
import { SOURCES } from "./sources.mjs";

/** The handed-in LFT-5.2 sources, untouched, plus LabMain, compiled for Java 8 (CheerpJ's JVM). */
export default async function lft() {
  const src = join(SOURCES.lft.dir, "LFT-5.2/src");
  const { jdk } = SOURCES.lft;
  const classes = join(TMP, "lft-classes");
  rmSync(classes, { recursive: true, force: true });
  ensureDir(classes);
  const java = readdirSync(src).filter((f) => f.endsWith(".java")).map((f) => join(src, f));
  execFileSync(join(jdk, "javac"), ["--release", "8", "-nowarn", "-d", classes, "-cp", join(src, "jasmin.jar"), ...java, join(ROOT, "scripts/labs/lft/LabMain.java")], { stdio: "inherit" });
  const out = ensureDir(outDir("lft"));
  execFileSync(join(jdk, "jar"), ["cf", join(out, "lft.jar"), "-C", classes, "."], { stdio: "inherit" });
  copyFileSync(join(src, "jasmin.jar"), join(out, "jasmin.jar"));
  console.log(`  lft.jar: ${java.length} sorgenti + LabMain`);
}
```

`scripts/labs/index.mjs`, nella mappa `STEPS`, dopo `delivery`: `lft: () => import("./lft.mjs"),`.

- [ ] **Step 5: Costruisci ed esegui i test**

Run: `npm run labs -- lft && npm test`
Expected: `lft.jar: 11 sorgenti + LabMain` e `ok — lft: Translator → Jasmin → Output on a real JVM`.
Se `Output.j` differisce da quello consegnato, la consegna è stata generata da un `text.txt` diverso: confronta a mano, e se la differenza è solo nel programma sostituisci quell'asserzione con un confronto con l'`Output.j` prodotto ora, spiegandolo nel messaggio di commit.

- [ ] **Step 6: Commit**

```bash
git add scripts/labs/lft scripts/labs/lft.mjs scripts/labs/sources.mjs scripts/labs/index.mjs scripts/check-labs.mjs public/labs/lft/lft.jar public/labs/lft/jasmin.jar
git commit -m "Laboratori: LFT compilato per la JVM di CheerpJ, con il driver LabMain

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: LFT — pagina con CheerpJ

**Files:**
- Create: `src/labs/lft/examples.ts`, `src/labs/lft/cheerpj.ts`, `src/labs/lft/LftLab.tsx`
- Modify: `src/types.ts`, `src/labs/LabsPage.tsx`, `src/data/projects.ts` (progetto `lft`), `src/labs/labs.css`, `scripts/check-labs.mjs`

**Interfaces:**
- Consumes: `public/labs/lft/lft.jar`, `public/labs/lft/jasmin.jar`, il contratto di `LabMain` (Task 6), `runLft` del test in `check-labs.mjs` (Task 6), `labsUrl` (`src/labs/paths.ts`).
- Produces: `EXAMPLES: { name: string; program: string; input: string }[]`; `runLft(program: string, input: string): Promise<{ out: string; jasmin: string }>` in `cheerpj.ts`.

- [ ] **Step 1: Test che fallisce (lista dei lab ed esempi)**

`src/types.ts`: aggiungi `| "lft"` all'unione `lab`. In `scripts/check-labs.mjs`, nel `deepEqual` dei lab aggiungi `["lft", "lft"]` dopo `["lab-asd", "asd"]`. Nel blocco LFT con `java` disponibile, prima del suo `console.log`:

```js
    const { EXAMPLES } = await vite.ssrLoadModule("/src/labs/lft/examples.ts");
    for (const ex of EXAMPLES) {
      const r = runLft(ex.program, ex.input + "\n");
      assert.ok(ex.name.includes("errore") ? /^ERRORE /m.test(r.out) : /Input OK/.test(r.out), `example "${ex.name}": ${r.out}`);
    }
```

Run: `npm test`
Expected: FAIL (import di `examples.ts`, `deepEqual`).

- [ ] **Step 2: Scrivi `examples.ts`**

```ts
/** Programs in the course language of LFT-5.2, the handed-in text.txt first. */
export const EXAMPLES = [
  { name: "La consegna (text.txt)", program: "read(x);\nif(|| < x 10 && > x 20 ! > x 30) print(+(x,100))\nelse print(x) end", input: "25" },
  { name: "Somma di due letture", program: "read(x);\nread(y);\nprint(+(x,y))", input: "2\n3" },
  { name: "Assegnamento e prodotto", program: "assign 6 to a;\nprint(*(a,7))", input: "" },
  { name: "Con un errore di sintassi", program: "read(x;\nprint(x)", input: "" },
];
```

Run: `npm test`. Se "Assegnamento e prodotto" o "Somma di due letture" non passano dalla grammatica di LFT-5.2 (`stat()`, `expr()` in `Translator.java`), riscrivili nella sintassi accettata: devono restare un assegnamento con un'operazione e due `read()` consecutive. Expected alla fine: `ok — lft: …`.

- [ ] **Step 3: Scrivi `cheerpj.ts`**

Sostituisci l'URL di `LOADER` con quello annotato nello spike.

```ts
import { labsUrl } from "../paths";

const LOADER = "https://cjrtnc.leaningtech.com/4.2/loader.js"; // pinned: see the spike note in the plan

declare global {
  function cheerpjInit(o?: object): Promise<void>;
  function cheerpjRunMain(cls: string, cp: string, ...args: string[]): Promise<number>;
  function cheerpOSAddStringFile(path: string, data: string): void;
  function cjFileBlob(path: string): Promise<Blob>;
}

let ready: Promise<void> | null = null;
/** CheerpJ is ~20 MB: fetched on the first run only, never when the page opens. */
function load() {
  ready ??= new Promise<void>((ok, ko) => {
    const s = document.createElement("script");
    s.src = LOADER;
    s.onload = () => cheerpjInit({ status: "none" }).then(ok, ko);
    s.onerror = () => { ready = null; ko(new Error("Il runtime Java non si è caricato")); };
    document.head.append(s);
  });
  return ready;
}

/** CheerpJ mounts this origin under /app. */
const appPath = (file: string) => "/app" + new URL(labsUrl("lft", file)).pathname;

let runs = 0;
export async function runLft(program: string, input: string) {
  await load();
  const n = ++runs; // /str files cannot be replaced: fresh names every run
  const prefix = `/str/lft${n}-`;
  cheerpOSAddStringFile(`${prefix}text.txt`, program);
  cheerpOSAddStringFile(`${prefix}input.txt`, input.trim() + "\n");
  const work = `/files/lft${n}/`;
  await cheerpjRunMain("LabMain", `${appPath("lft.jar")}:${appPath("jasmin.jar")}`, prefix, work);
  const read = (f: string) => cjFileBlob(work + f).then((b) => b.text(), () => "");
  return { out: await read("out.txt"), jasmin: await read("Output.j") };
}
```

- [ ] **Step 4: Scrivi `LftLab.tsx`**

```tsx
import { useState } from "react";
import { runLft } from "./cheerpj";
import { EXAMPLES } from "./examples";

export default function LftLab() {
  const [program, setProgram] = useState(EXAMPLES[0].program);
  const [input, setInput] = useState(EXAMPLES[0].input);
  const [res, setRes] = useState<{ out: string; jasmin: string } | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const go = async () => {
    setBusy(true);
    setStatus(loaded ? "compilo…" : "carico la JVM nel browser (la prima volta ~20 MB)…");
    try {
      setRes(await runLft(program, input));
      setLoaded(true);
      setStatus("");
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const error = res?.out.split("\n").some((l) => l.startsWith("ERRORE "));

  return (
    <div className="lft">
      <p>Il programma passa dal <code>Translator</code> consegnato, poi da Jasmin, poi gira sulla JVM: tutto nel browser, con CheerpJ.</p>
      <div className="mtdi-pick">
        {EXAMPLES.map((ex) => (
          <button key={ex.name} className="chip" onClick={() => { setProgram(ex.program); setInput(ex.input); setRes(null); }}>{ex.name}</button>
        ))}
      </div>
      <div className="asd-form">
        <label className="asd-wide">Programma<textarea rows={6} spellCheck={false} className="lft-src" value={program} onChange={(e) => setProgram(e.target.value)} /></label>
        <label>Input per read() (uno per riga)<textarea rows={2} value={input} onChange={(e) => setInput(e.target.value)} /></label>
        <button className="chip chip--on" onClick={go} disabled={busy}>Compila ed esegui</button>
        {status && <span className="labs-loading" role="status">{status}</span>}
      </div>
      {res && (
        <div className="lft-grid">
          <section><h4>Jasmin generato (Output.j)</h4><pre className="mtdi-code lft-j">{error ? "—" : res.jasmin}</pre></section>
          <section><h4>Output</h4><pre className={`asd-term${error ? " lft-err" : ""}`}>{res.out.trim()}</pre></section>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Registra la demo e gli stili**

`src/labs/LabsPage.tsx`: `DEMOS` → `lft: lazy(() => import("./lft/LftLab")),`; `TRY` → `lft: "compila ed esegui il codice Java originale"`.
`src/data/projects.ts`: nel progetto `lft` aggiungi `lab: 'lft',`.
In fondo a `src/labs/labs.css`:

```css
.lft-src { font-family: var(--font-mono); width: 100%; }
.lft-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; }
@media (max-width: 720px) { .lft-grid { grid-template-columns: minmax(0, 1fr); } }
.lft-j { max-height: 360px; overflow: auto; }
.lft-err { color: #ff8a80; }
```

- [ ] **Step 6: Verifica automatica**

Run: `npm test && npx tsc --noEmit -p .`
Expected: tutte le righe `ok`, nessun errore di tipo.

- [ ] **Step 7: Verifica a mano nel browser (CheerpJ non gira in Node)**

Run: `npm run dev` (in background), apri `/#/progetti/lft/prova`.
Expected:
- all'apertura nessuna richiesta a `cjrtnc.leaningtech.com` (scheda Network);
- **Compila ed esegui** su "La consegna" con input 25 → Jasmin che comincia con `.class public Output`, output `125`;
- "Somma di due letture" con `2` e `3` → `5`;
- "Con un errore di sintassi" → riga rossa `ERRORE near line …` e Jasmin `—`;
- una seconda esecuzione non riscarica CheerpJ (scheda Network).

- [ ] **Step 8: Commit**

```bash
git add src/labs/lft src/types.ts src/labs/LabsPage.tsx src/data/projects.ts src/labs/labs.css scripts/check-labs.mjs
git commit -m "Laboratori: LFT si compila ed esegue nel browser con CheerpJ

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Rifinitura, README e verifica finale

**Files:**
- Modify: `scripts/check-labs.mjs`, `README.md`, `src/labs/labs.css` (solo se la verifica visiva lo richiede)

- [ ] **Step 1: Test SSR della scheda Prova per ogni demo**

In `scripts/check-labs.mjs`, subito dopo il `deepEqual` della lista dei lab:

```js
  for (const p of projects.filter((x) => x.lab)) {
    const html = renderToString(h(LabsPage, { route: { page: "labs", id: p.id, tab: "prova" } }));
    assert.ok(html.includes('aria-selected="true"') && html.includes(">Prova<"), `${p.id}: Prova is not the open tab`);
  }
```

Run: `npm test`
Expected: PASS (le demo esistono già; il test fissa il comportamento).

- [ ] **Step 2: Aggiorna il README**

Nella sezione che descrive `public/labs/` (cerca `public/labs/` in `README.md`), aggiungi:

```markdown
- **Compilatore LFT**: il `Translator` consegnato, Jasmin e il programma generato girano nel browser con CheerpJ, caricato dalla sua CDN al primo clic. `npm run labs -- lft` ricompila `lft.jar` dai sorgenti di LFT-5.2 più `scripts/labs/lft/LabMain.java`; serve un JDK (percorso in `scripts/labs/sources.mjs`).
- **Centrale nucleare, Client Email, MTDI**: riscritture in TypeScript (`src/labs/so`, `src/labs/email`, `src/labs/mtdi`) che seguono i sorgenti originali; la logica è testata in `scripts/check-labs.mjs`.
```

- [ ] **Step 3: Verifica completa**

Run: `npm test && npx tsc --noEmit -p . && npm run build`
Expected: tutte le righe `ok`, nessun errore di tipo, build Vite riuscita.

- [ ] **Step 4: Giro nel browser su tutte e quattro le demo**

Con `npm run dev`, per `/#/progetti/mtdi`, `/#/progetti/client-email`, `/#/progetti/so-centrale`, `/#/progetti/lft`:
- la scheda **Prova** è la prima e si apre;
- a 360 px di larghezza non c'è scroll orizzontale;
- la console del browser non mostra errori.
Inoltre `/#/progetti` mostra sulle card "gioca al banco delle scelte", "manda una mail", "avvia la simulazione", "compila ed esegui il codice Java originale".

- [ ] **Step 5: Commit**

```bash
git add scripts/check-labs.mjs README.md src/labs/labs.css
git commit -m "Laboratori: la scheda Prova si apre per ogni demo; README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
