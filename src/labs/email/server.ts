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
