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
