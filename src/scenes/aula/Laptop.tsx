import { useMemo, useRef, useState, type SyntheticEvent } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import { Color, Vector3, type Mesh, type MeshStandardMaterial, type Object3D } from "three";
import { useTap } from "../Hotspot";
import type { View } from "../focus";
import { canOpen, partBox, typed } from "../../lib/aula/laptop";
import type { AulaState } from "../../lib/aula/chain";
import { SPOTS, SPOT_MARK, TAP_W } from "./spots";

/*
 * The steampunk laptop on the desk, the end of the hall: a copper case on a
 * round wooden stand, a porthole for a screen, brass gears and a heart. Shut
 * until the libretto is full; then its lid lifts and its keyboard takes Sistemi
 * Intelligenti's code. A wrong code jams the gears with a clank; the right one
 * sets them turning and lights the heart. Once Rotom has gone into it, its
 * screen holds Salvo's video.
 *
 * The model is public/models/portatile.glb, one copy of the print, made in
 * Blender (see the README): its parts `base`, `lid` turning on its hinge,
 * `gear*` each turning about its own up, `keys`, `heart`, and `screen` on the lid.
 */

const MODEL = "models/portatile.glb";
useGLTF.preload(MODEL);

/** Where the laptop stands: the desk's spot, its stand on the desk. */
const AT = SPOTS.desk.position;
/** The lid shut, turned forward about its hinge onto the case. */
const SHUT = 1.52;

/** The middle of the screen, the lid up, where Rotom goes in and the video plays. */
export const SCREEN_AT: [number, number, number] = [AT[0] - 0.0144, AT[1] + 0.231, AT[2] - 0.1];
/** Up close on the keyboard: every key of the grid a finger wide on a phone. */
export const KEYS_VIEW: View = {
  target: [AT[0], AT[1] + 0.12, AT[2] + 0.03],
  azimuth: 0,
  polar: 0.7,
  zoom: 40,
  spread: { azimuth: 0.1, polar: 0.05 },
};
/** Square onto the screen, for the video. */
export const SCREEN_VIEW: View = {
  target: SCREEN_AT,
  azimuth: 0,
  polar: Math.PI / 2 - 0.08,
  zoom: 44,
  spread: { azimuth: 0.1, polar: 0.05 },
};

/** The keys of the grid, back row then front, as on a typewriter's top row. */
const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
/** How wide the video is drawn, in CSS px, and how wide in the hall. */
const VIDEO_PX = 320;
const VIDEO_W = 0.2;
/** drei draws a transformed `<Html>` at 40 px a world unit. */
const PX_PER_UNIT = 40;
/** How long the gears strain after a wrong code. */
const JAM_MS = 600;

const stop = (e: SyntheticEvent) => e.stopPropagation();

let audio: AudioContext | null = null;
/** A jammed gear: a dull knock and a grinding rasp, made with Web Audio. Silent without it. */
function clank() {
  const Context =
    typeof window === "undefined"
      ? undefined
      : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!Context) return;
  const ctx = (audio ??= new Context());
  if (ctx.state === "suspended") void ctx.resume();
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.4, t);
  out.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  out.connect(ctx.destination);
  const knock = ctx.createOscillator();
  knock.type = "square";
  knock.frequency.setValueAtTime(140, t);
  knock.frequency.exponentialRampToValueAtTime(45, t + 0.25);
  knock.connect(out);
  knock.start(t);
  knock.stop(t + 0.3);
  const noise = ctx.createBuffer(1, ctx.sampleRate * 0.45, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (i % 600 < 200 ? 1 : 0.3);
  const rasp = ctx.createBufferSource();
  rasp.buffer = noise;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 900;
  rasp.connect(band).connect(out);
  rasp.start(t + 0.05);
}

/** Salvo's video on the screen, behind a play button; until the file is there, a line saying it will be. */
function Video() {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [missing, setMissing] = useState(false);
  const play = () => {
    setPlaying(true);
    video.current?.play().catch(() => setMissing(true));
  };
  return (
    <div className="aula-video" style={{ width: VIDEO_PX }} onPointerDown={stop} onPointerUp={stop} onClick={stop}>
      {missing ? (
        <p className="aula-video__missing">il video di Salvo arriverà qui</p>
      ) : (
        <>
          <video ref={video} src="media/finale.mp4" playsInline controls preload="none" onError={() => setMissing(true)} />
          {!playing && (
            <button className="aula-video__play" onClick={play} aria-label="Guarda il video">
              ▶
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function Laptop({
  state,
  focused,
  lit,
  reduced,
  onOpen,
  onOn,
}: {
  state: AulaState;
  /** The camera stands at the desk. */
  focused: boolean;
  /** Rotom is in: the screen is lit and holds the video. */
  lit: boolean;
  reduced: boolean;
  /** The laptop was tapped: the hall walks up to it, or says it is still shut. */
  onOpen: () => void;
  /** The right code is in. */
  onOn: () => void;
}) {
  const { scene } = useGLTF(MODEL);
  const on = state.laptop === "on";
  const open = canOpen(state) && (focused || on);
  const [buffer, setBuffer] = useState("");
  const jamAt = useRef(-Infinity);

  const parts = useMemo(() => {
    const get = (name: string) => scene.getObjectByName(name) as Mesh;
    const gears: Object3D[] = [];
    scene.traverse((o) => o.name.startsWith("gear") && gears.push(o));
    // each glowing part gets its own material, so lighting one lights nothing else; once only,
    // or a second run of this (Strict Mode, a remount on the cached model) would light a material no longer drawn
    const glow = (m: Mesh) => {
      if (!m.userData.own) {
        m.material = (m.material as MeshStandardMaterial).clone();
        m.userData.own = true;
      }
      return m.material as MeshStandardMaterial;
    };
    const heart = glow(get("heart"));
    heart.emissive = new Color("#FF2A3A");
    const screen = glow(get("screen"));
    screen.emissive = new Color("#BFE6FF");
    // matte, so off it stays dark glass and does not shine back the lamp over the desk
    screen.roughness = 0.6;
    // the ten keys over the keyboard, in the model's own frame, which is the laptop's
    const box = partBox(scene, get("keys"));
    const size = box.getSize(new Vector3());
    const cell = new Vector3(size.x / 5, size.y, size.z / 2);
    const keys = DIGITS.map((d, i) => ({
      d,
      at: [box.min.x + cell.x * ((i % 5) + 0.5), box.min.y + size.y / 2, box.min.z + cell.z * (Math.floor(i / 5) + 0.5)] as [number, number, number],
    }));
    const lid = get("lid");
    lid.rotation.x = open ? 0 : SHUT;
    return { lid, gears, heart, screen, keys, cell, top: box.max.y };
  }, [scene]);

  useFrame((frame, dt) => {
    const k = reduced ? 1 : Math.min(1, dt * 2.5);
    const lid = parts.lid;
    lid.rotation.x += ((open ? 0 : SHUT) - lid.rotation.x) * k;
    const jam = performance.now() - jamAt.current < JAM_MS;
    if (!reduced) {
      parts.gears.forEach((g, i) => {
        const dir = i % 2 ? -1 : 1;
        if (on) g.rotateY(dir * 1.2 * dt);
        else if (jam) g.rotateY(Math.sin(frame.clock.elapsedTime * 50) * 0.03);
      });
    }
    const beat = on ? 1.2 + (reduced ? 0 : 0.5 * Math.sin(frame.clock.elapsedTime * 4)) : 0;
    parts.heart.emissiveIntensity += (beat - parts.heart.emissiveIntensity) * k;
    parts.screen.emissiveIntensity += ((lit ? 0.9 : 0) - parts.screen.emissiveIntensity) * k;
  });

  const press = (d: string) => {
    const r = typed(buffer, d);
    setBuffer(r.buffer);
    if (r.result === "jam") {
      jamAt.current = performance.now();
      clank();
    } else if (r.result === "ok") onOn();
  };

  const tap = useTap(onOpen);
  const typing = focused && open && !on;

  return (
    <group position={AT} {...SPOT_MARK}>
      {!focused && (
        <mesh position={[0, 0.15, 0]} {...tap}>
          <boxGeometry args={[TAP_W, TAP_W, TAP_W]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      {/* at the desk the case answers a tap itself: still shut it says so, open it walks back to the hall */}
      <primitive object={scene} {...(focused ? tap : {})} />
      {typing &&
        parts.keys.map(({ d, at }) => (
          <Key key={d} d={d} at={at} size={parts.cell} onPress={() => press(d)} />
        ))}
      {typing && (
        <Html position={[0, parts.top + 0.02, parts.keys[0].at[2] - parts.cell.z]} center zIndexRange={[6, 0]} style={{ pointerEvents: "none" }}>
          <span className="aula-laptop__tape" aria-live="polite">
            {buffer.padEnd(9, "·")}
          </span>
        </Html>
      )}
      {lit && (
        <group position={[SCREEN_AT[0] - AT[0], SCREEN_AT[1] - AT[1], SCREEN_AT[2] - AT[2] + 0.004]}>
          <Html transform scale={(VIDEO_W * PX_PER_UNIT) / VIDEO_PX} zIndexRange={[20, 10]}>
            <Video />
          </Html>
        </group>
      )}
    </group>
  );
}

/** One key of the grid: unseen, a finger wide, its digit printed over it. */
function Key({ d, at, size, onPress }: { d: string; at: [number, number, number]; size: Vector3; onPress: () => void }) {
  const tap = useTap(onPress);
  return (
    <group position={at}>
      <mesh {...tap}>
        <boxGeometry args={[size.x * 0.96, size.y, size.z * 0.96]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Html position={[0, size.y / 2 + 0.004, 0]} center zIndexRange={[6, 0]} style={{ pointerEvents: "none" }}>
        <span className="aula-laptop__key">{d}</span>
      </Html>
    </group>
  );
}
