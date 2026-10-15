import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import RewriteNote from "../RewriteNote";
import { ADMIN, createMailServer, parse, send, USERS, type MailServer } from "./server";
import { connect } from "./socket";

function ClientWindow({ server, email }: { server: MailServer; email: string }) {
  // each message keeps its id: new mail is prepended, and the open one must stay the open one
  const [inbox, setInbox] = useState<{ id: number; text: string }[]>([]);
  const [online, setOnline] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const nextId = useRef(0);
  const sock = useMemo(() => connect(server, (t) => setInbox((b) => [{ id: nextId.current++, text: t }, ...b])), [server]);

  const login = () => { setInbox([]); sock.send(`CLIENT:${email}\n`); setOnline(true); };
  const logout = () => { sock.close(email); setOnline(false); setInbox([]); setOpen(null); };
  const submit = () => {
    const r = send(email, to, text, sock.send);
    setError(r.invalid.length ? `Email non valida: ${r.invalid.join(", ")}` : "");
    if (r.sent.length) { setTo(""); setText(""); }
  };
  const reply = (m: string) => { setTo(parse(m).from); setText("---- Reply ----\n"); };
  const forward = (m: string) => { setTo(""); setText(parse(m).body); };
  const remove = (m: { id: number; text: string }) => { sock.send(`DELETE_MESSAGE\n${m.text}`); setInbox((b) => b.filter((x) => x.id !== m.id)); setOpen(null); };

  return (
    <section className="mail-win" aria-label={`Client di ${email}`}>
      <header className="mail-head"><b>{email}</b>
        <button className="chip" onClick={online ? logout : login}>{online ? "Esci" : "Entra"}</button>
      </header>
      {online ? (
        <>
          <ul className="mail-list">
            {inbox.length === 0 && <li className="empty">Nessun messaggio.</li>}
            {inbox.map((m) => (
              <li key={m.id}>
                <button className="mail-item" onClick={() => setOpen(open === m.id ? null : m.id)}>
                  <span>Da {parse(m.text).from}</span><span className="mail-preview">{parse(m.text).body.split("\n")[0]}</span>
                </button>
                {open === m.id && (
                  <div className="mail-open">
                    <pre>{parse(m.text).body}</pre>
                    <button className="chip" onClick={() => reply(m.text)}>Rispondi</button>
                    <button className="chip" onClick={() => forward(m.text)}>Inoltra</button>
                    <button className="chip" onClick={() => remove(m)}>Elimina</button>
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
  const ref = useRef<MailServer | null>(null);
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
