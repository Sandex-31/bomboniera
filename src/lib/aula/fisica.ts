import { ANALISI_ANSWER } from "./analisi";

/*
 * Fisica: a battery at Analisi's area in volts, three slots for resistors
 * and an electromagnet over an iron weight. The first slot is in series
 * with everything; after it the current splits between the coil, in series
 * with the second slot, and the third slot alone. The resistors carry no
 * value, only their colour bands, and only one way of filling the slots
 * sends through the coil the current that lifts the weight: found with Ohm
 * and Kirchhoff, since the needle of the ammeter trembles too much to tell.
 */

export type Colour = "black" | "brown" | "red" | "orange" | "yellow" | "green" | "blue" | "violet" | "grey" | "white" | "gold";

/** In the box, in the order they lie there. Bands: two digits, the multiplier, gold for 5%. */
export const RESISTORS: { id: string; ohms: number; bands: Colour[] }[] = [
  { id: "a", ohms: 220, bands: ["red", "red", "brown", "gold"] },
  { id: "b", ohms: 47, bands: ["yellow", "violet", "black", "gold"] },
  { id: "c", ohms: 560, bands: ["green", "blue", "brown", "gold"] },
  { id: "d", ohms: 120, bands: ["brown", "red", "brown", "gold"] },
  { id: "e", ohms: 150, bands: ["brown", "green", "brown", "gold"] },
  { id: "f", ohms: 100, bands: ["brown", "black", "brown", "gold"] },
];

/** The coil's own resistance, written on the electromagnet. */
export const COIL_OHMS = 100;

/** `slots[0]` in series, `slots[1]` in the coil's branch, `slots[2]` the branch beside it; null is an empty slot. */
export type Circuit = { slots: (string | null)[] };

export const EMPTY: Circuit = { slots: [null, null, null] };

const ohms = (id: string | null) => RESISTORS.find((r) => r.id === id)?.ohms;

/** The current through the coil, in mA. An empty slot is an open circuit, so an empty third slot leaves the coil's branch alone. */
export function current(c: Circuit, volts: number): number {
  const [s, b, p] = c.slots.map(ohms);
  if (s === undefined || b === undefined) return 0;
  const coil = b + COIL_OHMS;
  if (p === undefined) return (1000 * volts) / (s + coil);
  // total V / (s + coil∥p), of which p / (coil + p) goes through the coil
  return (1000 * volts * p) / (s * coil + s * p + coil * p);
}

/** The weight comes off the bench between these, in mA. */
export const LIFT: [min: number, max: number] = [29.5, 30.5];
/** Over this the wire smokes, in mA. */
export const SMOKE = 60;

export function judgeFisica(c: Circuit, volts: number): "lift" | "weak" | "smoke" {
  const i = current(c, volts);
  return i > SMOKE ? "smoke" : i >= LIFT[0] && i <= LIFT[1] ? "lift" : "weak";
}

/** The one filling that lifts: 100 Ω in series, 560 Ω with the coil, 150 Ω beside it. */
export const FISICA_FILLING: Circuit = { slots: ["f", "c", "e"] };

/** 30. */
export const FISICA_ANSWER = Math.round(current(FISICA_FILLING, ANALISI_ANSWER));

/** What the needle reads at `t` seconds: within 15% either way, so one look cannot tell the lift from its neighbours. Display only. */
export function jitter(mA: number, t: number): number {
  return mA * (1 + 0.15 * Math.sin(t * 7.3) * Math.cos(t * 2.9 + 1));
}
